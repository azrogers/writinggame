use std::any::Any;

use serde::{Deserialize, Serialize};
use writers::{WriteGameImpl, WriteGameImplState, WriteUserImplState};

use crate::{
  error::SocketError,
  models::{
    game::{Game, GameType},
    user::User,
    ImplState,
  },
  ws::{MessageResponse, SocketManager},
};

pub mod writers;

pub struct GameManager;

impl GameManager {
  pub fn init_game_state(game: &Game) -> Box<dyn ImplState> {
    match game.game_type {
      GameType::WriteGame => WriteGameImpl::init_game_state(game),
    }
  }

  pub fn init_user_state(game: &Game, user: &User) -> Box<dyn ImplState> {
    match game.game_type {
      GameType::WriteGame => WriteGameImpl::init_user_state(game, user),
    }
  }

  pub fn on_action(
    socket_manager: &SocketManager,
    game: &mut Game,
    user: &mut User,
    action: &str,
    payload: serde_json::Value,
  ) -> Result<MessageResponse, SocketError> {
    match game.game_type {
      GameType::WriteGame => WriteGameImpl::on_action(socket_manager, game, user, action, payload),
    }
  }
}
