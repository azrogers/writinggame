use itertools::Itertools;
use log::error;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
  error::SocketError,
  games::GameManager,
  models::{
    game::{GameMode, GameState, GameType},
    user::User,
  },
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
pub struct UserJoinAction {
  join_code: String,
}

#[derive(Serialize)]
struct UserJoinResponse {
  pub game_type: GameType,
  pub game_mode: GameMode,
  pub game_state: GameState,
  pub impl_state: serde_json::Value,
}

#[derive(Serialize)]
struct UserJoinStateUpdateSingle {
  pub name: Option<String>,
  pub id: Uuid,
  pub impl_state: serde_json::Value,
}

#[derive(Serialize)]
struct UserJoinStateUpdate {
  pub users: Vec<UserJoinStateUpdateSingle>,
}

impl UserJoinAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    user: &User,
  ) -> Result<MessageResponse, SocketError> {
    let mut users = socket_manager.database.users.write().await;
    let mut games = socket_manager.database.games.write().await;

    // look up the user again so we can modify it
    // we don't want to get the user as mut in the socket manager because we don't want to write lock it, but we do here
    let user = users.get_mut(&user.id).ok_or_else(|| {
      error!("UserJoinAction but no user found for ID?");
      SocketError::ServerError
    })?;

    let game_id = *socket_manager
      .database
      .code_to_game
      .read()
      .await
      .get(&self.join_code)
      .ok_or(SocketError::GameNotFound)?;

    let game = games.get_mut(&game_id).ok_or_else(|| {
      error!("Found game ID {game_id} from join code but couldn't find game?");
      SocketError::ServerError
    })?;

    game.users.push(user.id);
    user.impl_state = GameManager::init_user_state(game, user);

    let state_update = UserJoinStateUpdate {
      users: game
        .users
        .iter()
        .filter_map(|user_id| users.get(user_id))
        .map(|u| UserJoinStateUpdateSingle {
          name: u.name.clone(),
          id: u.id,
          impl_state: u.impl_state.to_public_state(),
        })
        .collect_vec(),
    };

    socket_manager
      .broadcast_to_game(
        game,
        "game/users".to_string(),
        serde_json::to_value(state_update).unwrap(),
      )
      .await;

    Ok(Some((
      "user/join".to_string(),
      Box::new(UserJoinResponse {
        game_mode: game.game_mode.clone(),
        game_state: game.game_state.clone(),
        game_type: game.game_type.clone(),
        impl_state: game.impl_state.to_public_state(),
      }),
    )))
  }
}
