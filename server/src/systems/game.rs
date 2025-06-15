use std::{collections::HashSet, sync::Arc};

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
  error::SocketError,
  games::GameManager,
  models::{
    game::{Game, GameMode, GameState, GameType},
    user::{User, UserType},
  },
  ws::{MessageResponse, SocketManager},
};

#[derive(Deserialize)]
pub struct GameHostAction {
  game_type: GameType,
  game_mode: GameMode,
}

#[derive(Serialize)]
pub struct GameHostResponse {
  game_id: Uuid,
  user_id: Uuid,
  join_code: String,
  impl_state: serde_json::Value,
  token: String,
  game_type: GameType,
  game_mode: GameMode,
}

impl GameHostAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    session_id: Uuid,
  ) -> Result<MessageResponse, SocketError> {
    let user = User::new(session_id, None, UserType::Host);
    let mut game = Game::new(
      &socket_manager.database,
      self.game_type,
      self.game_mode,
      user.id,
    )
    .await?;

    let token = user.create_token(game.id, &socket_manager.config)?;

    game.impl_state = GameManager::init_game_state(&game);

    let public_state = game.impl_state.to_public_state();
    let join_code = game.join_code.clone();
    let game_type = game.game_type.clone();
    let game_mode = game.game_mode.clone();
    let id = game.id;

    socket_manager.database.game_add(game).await;

    if let Some(mut session) = socket_manager.database.sessions.get_mut(&session_id) {
      session.game_id = Some(id);
    }

    // we add session to game_to_sessions but NOT the host user to game.users
    let mut sessions = HashSet::new();
    sessions.insert(session_id);
    let user_id = user.id;
    socket_manager.database.user_add(session_id, user).await;
    socket_manager
      .database
      .game_to_sessions
      .insert(id, sessions);

    Ok(Some((
      "game/host".to_string(),
      Box::new(GameHostResponse {
        game_id: id,
        user_id,
        token,
        join_code,
        impl_state: public_state,
        game_type,
        game_mode,
      }),
    )))
  }
}

#[derive(Deserialize)]
pub struct GameStartAction;

impl GameStartAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let user = user.read().await;
    if user.user_type != UserType::Host {
      return Err(SocketError::HostOnlyAction);
    }

    drop(user);

    let mut game = game.write().await;
    game.game_state = GameState::Playing;

    socket_manager
      .broadcast_to_game(
        &game,
        "game/state".to_owned(),
        serde_json::to_value(game.to_state_update()).unwrap(),
      )
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct GameEndAction;

impl GameEndAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let user = user.read().await;
    if user.user_type != UserType::Host {
      return Err(SocketError::HostOnlyAction);
    }

    let id = game.read().await.id;
    socket_manager.database.game_remove(id).await;

    Ok(None)
  }
}
