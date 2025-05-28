use log::{error, info, warn};

use futures_util::{SinkExt, StreamExt, TryFutureExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use uuid::Uuid;
use warp::filters::ws::{Message, WebSocket};

use crate::{
    app_config::AppConfig,
    database::Database,
    error::SocketError,
    models::user::User,
    systems::{game::GameHostAction, user::UserInitializeAction},
};

pub type MessageResponse = Option<(String, Box<dyn erased_serde::Serialize>)>;

#[derive(Deserialize)]
struct SocketMessage {
    action: String,
    token: Option<String>,
    payload: serde_json::Value,
}

#[derive(Serialize)]
struct SocketErrorResponse {
    status: String,
    error: SocketError,
}

impl SocketErrorResponse {
    pub fn message(error: SocketError) -> Message {
        let response = Self {
            status: "error".to_string(),
            error,
        };
        Message::text(serde_json::to_string(&response).unwrap())
    }
}

#[derive(Serialize)]
struct SocketSuccessResponse {
    action: String,
    status: String,
    payload: serde_json::Value,
}

impl SocketSuccessResponse {
    pub fn message(action: String, payload: Box<dyn erased_serde::Serialize>) -> Message {
        let response = Self {
            action,
            status: "success".to_string(),
            payload: serde_json::to_value(payload).unwrap(),
        };

        Message::text(serde_json::to_string(&response).unwrap())
    }
}

#[derive(Clone)]
pub struct SocketManager {
    pub database: Database,
    pub config: AppConfig,
}

impl SocketManager {
    pub fn new(config: AppConfig) -> Self {
        SocketManager {
            database: Database::default(),
            config,
        }
    }

    pub async fn user_connected(self, ws: WebSocket) {
        let (mut user_ws_tx, mut user_ws_rx) = ws.split();

        let (tx, rx) = mpsc::unbounded_channel();
        let mut rx = UnboundedReceiverStream::new(rx);

        tokio::task::spawn(async move {
            while let Some(message) = rx.next().await {
                user_ws_tx
                    .send(message)
                    .unwrap_or_else(|e| {
                        error!("websocket send error: {e}");
                    })
                    .await;
            }
        });

        let session_id = Uuid::default();
        info!("user connected: {session_id}");

        self.database.session_add(session_id, tx.clone()).await;

        while let Some(result) = user_ws_rx.next().await {
            let msg = match result {
                Ok(msg) => msg,
                Err(e) => {
                    error!("websocket error(uid={session_id}): {e}");
                    break;
                }
            };
            match self.user_message(session_id, msg).await {
                Ok(response) => {
                    if let Some((action, res)) = response {
                        tx.send(SocketSuccessResponse::message(action, res))
                            .unwrap_or_else(|e| {
                                error!("websocket send error: {e}");
                            });
                    }
                }
                Err(err) => {
                    tx.send(SocketErrorResponse::message(err))
                        .unwrap_or_else(|e| {
                            error!("websocket send error: {e}");
                        });
                }
            }
        }

        info!("user disconnected: {session_id}");
        self.database.session_remove(session_id).await;
    }

    async fn user_message(
        &self,
        session_id: Uuid,
        msg: Message,
    ) -> Result<MessageResponse, SocketError> {
        let msg = if let Ok(str) = msg.to_str() {
            str
        } else {
            return Err(SocketError::Parse(
                "message contents could not be obtained".to_string(),
            ));
        };

        let msg = serde_json::from_str::<SocketMessage>(msg)
            .map_err(|err| SocketError::Parse(err.to_string()))?;

        // user/initialize - creates a new user and token
        if msg.action == "user/initialize" {
            return UserInitializeAction::on_receive(
                serde_json::from_value(msg.payload)
                    .map_err(|err| SocketError::Parse(err.to_string()))?,
                self,
                session_id,
            )
            .await;
        }
        // game/host - creates a new game and host user
        else if msg.action == "game/host" {
            return GameHostAction::on_receive(
                serde_json::from_value(msg.payload)
                    .map_err(|err| SocketError::Parse(err.to_string()))?,
                self,
                session_id,
            )
            .await;
        }

        // all the actions after this require a token
        if msg.token.is_none() {
            return Err(SocketError::AuthError);
        }

        let token_contents = User::verify_token(&self.config, &msg.token.unwrap())?;
        let user = self
            .database
            .users
            .read()
            .await
            .get(&token_contents.user_id)
            .ok_or_else(|| {
                warn!("token with no user: {token_contents:?}");
                SocketError::AuthError
            })?;

        if msg.action == "user/join" {}

        Err(SocketError::InvalidAction)
    }
}
