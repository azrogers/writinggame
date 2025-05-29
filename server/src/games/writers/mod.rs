use std::any::Any;

use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{
  models::{
    game::{Game, GameState},
    user::User,
    ImplState,
  },
  ws::{MessageResponse, SocketManager},
};

const MAX_PLAYERS: usize = 12;

pub struct WriteGameImplState {}

impl ImplState for WriteGameImplState {
  fn to_public_state(&self) -> serde_json::Value {
    serde_json::Value::Null
  }
}

#[derive(Serialize)]
enum WriteGameUserType {
  Leader,
  Player,
  Audience,
}

pub struct WriteUserImplState {
  user_type: WriteGameUserType,
}

impl ImplState for WriteUserImplState {
  fn to_public_state(&self) -> serde_json::Value {
    json!({ "user_type": self.user_type })
  }
}

pub struct WriteGameImpl;

impl WriteGameImpl {
  pub fn init_game_state(game: &Game) -> Box<dyn ImplState> {
    Box::new(WriteGameImplState {})
  }

  pub fn init_user_state(game: &Game, user: &User) -> Box<dyn ImplState> {
    Box::new(WriteUserImplState {
      user_type: if game.game_state == GameState::Lobby && game.users.is_empty() {
        WriteGameUserType::Leader
      } else if game.game_state == GameState::Lobby && game.users.len() < MAX_PLAYERS {
        WriteGameUserType::Player
      } else {
        WriteGameUserType::Audience
      },
    })
  }

  pub fn on_action(
    socket_manager: &SocketManager,
    game: &mut Game,
    user: &mut User,
    action: &str,
    payload: serde_json::Value,
  ) -> Result<MessageResponse, crate::error::SocketError> {
    todo!()
  }
}
