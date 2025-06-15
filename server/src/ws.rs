use log::{debug, error, info, warn};

use futures_util::{SinkExt, StreamExt, TryFutureExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use uuid::Uuid;
use warp::filters::ws::{Message, WebSocket};

use crate::{
  app_config::AppConfig,
  database::Database,
  error::{SocketError, ToDisplayText},
  games::GameManager,
  models::{game::Game, user::User},
  systems::{
    game::{GameEndAction, GameHostAction, GameStartAction},
    prompt::{PromptEndAction, PromptStartAction, PromptSubmitAction},
    user::{UserCheckGameAction, UserInitializeAction, UserJoinAction, UserRejoinAction},
    vote::{VoteCastAction, VoteEndAction, VoteStartAction},
  },
};

pub type MessageResponse = Option<(String, Box<dyn erased_serde::Serialize>)>;

#[derive(Deserialize)]
struct SocketMessage {
  action: String,
  token: Option<String>,
  payload: serde_json::Value,
}

#[derive(Serialize, Debug)]
struct SocketErrorResponse {
  status: String,
  error: SocketError,
  display_text: String,
}

impl SocketErrorResponse {
  pub fn message(error: SocketError) -> Message {
    let response = Self {
      status: "error".to_string(),
      display_text: error.to_display_text(),
      error,
    };

    Message::text(serde_json::to_string(&response).unwrap())
  }
}

#[derive(Serialize, Debug)]
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

#[derive(Serialize)]
struct SocketStateMessage {
  action: String,
  payload: serde_json::Value,
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
        debug!("sending message {message:?}");
        user_ws_tx
          .send(message)
          .unwrap_or_else(|e| {
            error!("websocket send error: {e}");
          })
          .await;
      }
    });

    let session_id = Uuid::new_v4();
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
        "message contents could not be obtained".to_string().into(),
      ));
    };

    debug!("message received: {msg}");

    let msg = serde_json::from_str::<SocketMessage>(msg)
      .map_err(|err| SocketError::Parse(err.to_string().into()))?;

    // game/host - creates a new game and host user
    if msg.action == "game/host" {
      return GameHostAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        session_id,
      )
      .await;
    }
    // user/check_game - tries to find a game from a join code
    else if msg.action == "user/check_game" {
      return UserCheckGameAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
      )
      .await;
    }
    // user/join - join a game using a join code
    else if msg.action == "user/join" {
      return UserJoinAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
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
      .get(&token_contents.user_id)
      .ok_or_else(|| {
        warn!("token with no user: {token_contents:?}");
        SocketError::AuthError
      })?
      .clone();

    let user_session_id = user.read().await.session_id;
    // handle swapping to a new session
    if user_session_id != session_id {
      let user_id = user.read().await.id;
      if let Some(mut sessions) = self
        .database
        .game_to_sessions
        .get_mut(&token_contents.game_id)
      {
        sessions.remove(&user_session_id);
      }
      if let Some(mut session) = self.database.sessions.get_mut(&session_id) {
        session.game_id = Some(token_contents.game_id);
        session.user_id = Some(user_id);
      }

      self.database.user_to_session.insert(user_id, session_id);
      let mut user_mut = user.write().await;
      user_mut.session_id = session_id;
    }

    let game_id = self
      .database
      .sessions
      .get(&session_id)
      .and_then(|s| s.game_id)
      .ok_or_else(|| {
        warn!(
          "session {session_id} tried to use action {} but no game_id found",
          msg.action
        );
        SocketError::GameNotFound
      })?;

    let game = self
      .database
      .games
      .get(&game_id)
      .ok_or_else(|| {
        warn!("user has game_id in session listed as {game_id} but no game found");
        SocketError::ServerError
      })?
      .clone();

    if msg.action == "game/start" {
      return GameStartAction::on_receive(GameStartAction {}, self, game, user).await;
    } else if msg.action == "game/end" {
      return GameEndAction::on_receive(GameEndAction {}, self, game, user).await;
    } else if msg.action == "vote/start" {
      return VoteStartAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "vote/cast" {
      return VoteCastAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "vote/end" {
      return VoteEndAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "prompt/start" {
      return PromptStartAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "prompt/submit" {
      return PromptSubmitAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "prompt/end" {
      return PromptEndAction::on_receive(
        serde_json::from_value(msg.payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        self,
        game,
        user,
      )
      .await;
    } else if msg.action == "user/rejoin" {
      return UserRejoinAction::on_receive(UserRejoinAction {}, self, game, user).await;
    }

    return GameManager::on_action(self, game, user, &msg.action, msg.payload).await;
  }

  pub async fn broadcast_to_game(&self, game: &Game, action: String, msg: serde_json::Value) {
    let message = SocketStateMessage {
      action,
      payload: msg,
    };
    let response = Message::text(serde_json::to_string(&message).unwrap());
    if let Some(session_ids) = self.database.game_to_sessions.get(&game.id) {
      for session_id in session_ids.iter() {
        if let Some(session) = self.database.sessions.get(session_id) {
          session.tx.send(response.clone()).unwrap_or_else(|e| {
            error!("websocket send error: {e}");
          });
        } else {
          warn!("Found session_id {session_id} but no session found?");
        }
      }
    }
  }

  pub async fn send_to_user(&self, user_id: Uuid, action: String, msg: serde_json::Value) {
    let message = SocketStateMessage {
      action,
      payload: msg,
    };
    let response = Message::text(serde_json::to_string(&message).unwrap());
    if let Some(session_id) = self.database.user_to_session.get(&user_id) {
      if let Some(session) = self.database.sessions.get(&session_id) {
        session.tx.send(response.clone()).unwrap_or_else(|e| {
          error!("websocket send error: {e}");
        });
      } else {
        warn!("Found session_id {} but no session found?", *session_id);
      }
    } else {
      warn!("Tried to send message to user {user_id} but no session found");
    }
  }
}
