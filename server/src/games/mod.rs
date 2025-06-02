use std::{any::Any, sync::Arc};

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use writers::{WriteGameImpl, WriteGameImplState, WriteUserImplState};

use crate::{
  error::SocketError,
  models::{
    game::{Game, GameType},
    user::User,
    ImplState, ImplStateContainer,
  },
  ws::{MessageResponse, SocketManager},
};

pub mod writers;

pub struct GameManager;

impl GameManager {
  pub fn init_game_state(game: &Game) -> ImplStateContainer {
    match game.game_type {
      GameType::WriteGame => WriteGameImpl::init_game_state(game),
    }
  }

  pub fn init_user_state(game: &Game, user: &User) -> ImplStateContainer {
    match game.game_type {
      GameType::WriteGame => WriteGameImpl::init_user_state(game, user),
    }
  }

  pub async fn on_action(
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
    action: &str,
    payload: serde_json::Value,
  ) -> Result<MessageResponse, SocketError> {
    let game_type = game.read().await.game_type.clone();
    match game_type {
      GameType::WriteGame => {
        WriteGameImpl::on_action(socket_manager, game, user, action, payload).await
      }
    }
  }
}
