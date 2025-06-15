use chrono::{DateTime, Utc};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::Database, error::SocketError};

use super::{EmptyState, ImplStateContainer};

const ALPHABET: [char; 26] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
  'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

#[derive(Serialize, Deserialize, PartialEq, Clone, Copy)]
pub enum GameType {
  WriteGame,
}

#[derive(Serialize, Deserialize, PartialEq, Clone, Copy)]
pub enum GameMode {
  Normal,
}

#[derive(Serialize, Deserialize, PartialEq, Clone, Copy)]
pub enum GameState {
  Lobby,
  Playing,
  Concluded,
}

#[derive(Serialize)]
pub struct GameStateResponse {
  pub game_state: GameState,
  pub impl_state: serde_json::Value,
}

pub struct Game {
  pub id: Uuid,
  pub game_type: GameType,
  pub game_mode: GameMode,
  pub game_state: GameState,
  pub join_code: String,
  pub host_user_id: Uuid,
  pub users: Vec<Uuid>,
  pub created: DateTime<Utc>,
  pub impl_state: ImplStateContainer,
}

impl Game {
  pub async fn new(
    database: &Database,
    game_type: GameType,
    game_mode: GameMode,
    host_user_id: Uuid,
  ) -> Result<Game, SocketError> {
    let id = Uuid::new_v4();
    let code = Self::generate_and_insert_unique_code(database, id).await?;

    Ok(Game {
      id,
      host_user_id,
      game_type,
      game_mode,
      game_state: GameState::Lobby,
      join_code: code,
      users: Vec::default(),
      created: chrono::offset::Utc::now(),
      impl_state: ImplStateContainer::new(EmptyState {}),
    })
  }

  async fn generate_and_insert_unique_code(
    database: &Database,
    game_id: Uuid,
  ) -> Result<String, SocketError> {
    loop {
      let code = Self::generate_code();
      if !database.code_to_game.contains_key(&code) {
        database.code_to_game.insert(code.clone(), game_id);
        return Ok(code);
      }
    }
  }

  fn generate_code() -> String {
    let mut bytes: [u8; 5] = [0; 5];
    rand::rng().fill_bytes(&mut bytes);
    let mut s = String::with_capacity(5);
    for b in bytes {
      let num = b % 26;
      s.push(ALPHABET[num as usize]);
    }
    s
  }

  pub fn to_state_update(&self) -> GameStateResponse {
    GameStateResponse {
      game_state: self.game_state,
      impl_state: self.impl_state.to_public_state(),
    }
  }
}
