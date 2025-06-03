use std::{any::Any, sync::Arc};

use actions::{InitialSentenceAction, LeaderStartGameAction};
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
  error::SocketError,
  models::{
    game::{Game, GameState},
    user::{User, UserType},
    ImplState, ImplStateContainer,
  },
  ws::{MessageResponse, SocketManager},
};

mod actions;

const MAX_PLAYERS: usize = 12;

#[derive(Serialize, PartialEq, Debug)]
pub enum RoundState {
  Intro,
  Writing,
  Voting,
  Intermission,
  Reading,
  Outro,
}

#[derive(Serialize)]
pub struct Sentence {
  author: Option<Uuid>,
  text: String,
}

pub struct WriteGameImplState {
  topic: String,
  sentences: Vec<Sentence>,
  round_state: RoundState,
}

impl ImplState for WriteGameImplState {
  fn to_public_state(&self) -> serde_json::Value {
    json!({
      "sentences": self.sentences,
      "topic": self.topic,
      "round_state": self.round_state
    })
  }
}

#[derive(Serialize, Clone, PartialEq)]
pub enum WriteGameUserType {
  Leader,
  Player,
  Audience,
}

#[derive(Clone)]
pub struct WriteUserImplState {
  user_type: WriteGameUserType,
  score: u32,
}

impl ImplState for WriteUserImplState {
  fn to_public_state(&self) -> serde_json::Value {
    json!({ "user_type": self.user_type })
  }
}

pub struct WriteGameImpl;

impl WriteGameImpl {
  pub fn init_game_state(_game: &Game) -> ImplStateContainer {
    ImplStateContainer::new(WriteGameImplState {
      topic: String::default(),
      sentences: Vec::new(),
      round_state: RoundState::Intro,
    })
  }

  pub fn init_user_state(game: &Game, _user: &User) -> ImplStateContainer {
    ImplStateContainer::new(WriteUserImplState {
      user_type: if game.game_state == GameState::Lobby && game.users.is_empty() {
        WriteGameUserType::Leader
      } else if game.game_state == GameState::Lobby && game.users.len() < MAX_PLAYERS {
        WriteGameUserType::Player
      } else {
        WriteGameUserType::Audience
      },
      score: 0,
    })
  }

  pub async fn on_action(
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
    action: &str,
    payload: serde_json::Value,
  ) -> Result<MessageResponse, crate::error::SocketError> {
    if action == "wg/initial_sentence" {
      return InitialSentenceAction::on_receive(
        serde_json::from_value(payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        socket_manager,
        game,
        user,
      )
      .await;
    } else if action == "wg/leader_start_game" {
      return LeaderStartGameAction::on_receive(
        serde_json::from_value(payload)
          .map_err(|err| SocketError::Parse(err.to_string().into()))?,
        socket_manager,
        game,
        user,
      )
      .await;
    }

    Err(SocketError::InvalidAction)
  }
}
