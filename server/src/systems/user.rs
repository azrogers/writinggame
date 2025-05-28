use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::SocketError,
    models::user::User,
    ws::{MessageResponse, SocketManager},
};

#[derive(Deserialize)]
pub struct UserInitializeAction {
    name: String,
}

#[derive(Serialize)]
struct UserInitializeResponse {
    user_id: Uuid,
    token: String,
}

impl UserInitializeAction {
    pub async fn on_receive(
        self,
        socket_manager: &SocketManager,
        session_id: Uuid,
    ) -> Result<MessageResponse, SocketError> {
        let user = User::new(
            session_id,
            Some(self.name),
            crate::models::user::UserType::Client,
        );
        let token = User::create_token(&user, &socket_manager.config)?;

        let id = user.id;
        socket_manager.database.user_add(session_id, user).await;

        Ok(Some((
            "user/initialize".to_string(),
            Box::new(UserInitializeResponse { user_id: id, token }),
        )))
    }
}

#[derive(Deserialize)]
struct UserJoinAction {
    game_id: Uuid,
}
