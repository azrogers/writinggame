use std::{collections::HashSet, sync::Arc};

use futures::future::join_all;
use log::error;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
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

const MAX_NAME_LEN: usize = 16;

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
    if self.name.is_empty() || self.name.len() > MAX_NAME_LEN {
      return Err(SocketError::ValidationError(
        "Name must be between 1 and 16 characters in length."
          .to_string()
          .into(),
      ));
    }
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
  pub game_id: Uuid,
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
    session_id: Uuid,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    // look up the user again so we can modify it
    // we don't want to get the user as mut in the socket manager because we don't want to write lock it, but we do here
    let mut user = user.write().await;

    if let Some(session) = socket_manager.database.sessions.get(&session_id) {
      if session.game_id.is_some() {
        return Err(SocketError::AlreadyJoinedGame);
      }
    }

    let game_id = *socket_manager
      .database
      .code_to_game
      .get(&self.join_code)
      .ok_or(SocketError::GameNotFound)?;

    let game_ptr = socket_manager
      .database
      .games
      .get(&game_id)
      .ok_or_else(|| {
        error!("Found game ID {game_id} from join code but couldn't find game?");
        SocketError::ServerError
      })?
      .clone();

    let mut game = game_ptr.write().await;

    user.impl_state = GameManager::init_user_state(&game, &user);
    game.users.push(user.id);

    if let Some(mut session) = socket_manager.database.sessions.get_mut(&session_id) {
      session.game_id = Some(game.id);
    }

    match socket_manager.database.game_to_sessions.entry(game.id) {
      dashmap::Entry::Occupied(mut sessions) => {
        sessions.get_mut().insert(session_id);
      }
      dashmap::Entry::Vacant(v) => {
        let mut set = HashSet::new();
        set.insert(session_id);
        v.insert(set);
      }
    };

    drop(user);

    let state_update = UserJoinStateUpdate {
      users: join_all(
        game
          .users
          .iter()
          .filter_map(|user_id| socket_manager.database.users.get(user_id))
          .map(async |u| {
            let u = u.read().await;
            UserJoinStateUpdateSingle {
              name: u.name.clone(),
              id: u.id,
              impl_state: u.impl_state.to_public_state(),
            }
          }),
      )
      .await,
    };

    socket_manager
      .broadcast_to_game(
        &game,
        "game/users".to_string(),
        serde_json::to_value(state_update).unwrap(),
      )
      .await;

    Ok(Some((
      "user/join".to_string(),
      Box::new(UserJoinResponse {
        game_id: game.id,
        game_mode: game.game_mode.clone(),
        game_state: game.game_state.clone(),
        game_type: game.game_type.clone(),
        impl_state: game.impl_state.to_public_state(),
      }),
    )))
  }
}

#[derive(Deserialize)]
pub struct UserCheckGameAction {
  join_code: String,
}

#[derive(Serialize)]
pub struct UserCheckGameResponse {
  game_type: GameType,
  game_mode: GameMode,
}

impl UserCheckGameAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
  ) -> Result<MessageResponse, SocketError> {
    let game = socket_manager
      .database
      .code_to_game
      .get(&self.join_code)
      .and_then(|game_id| socket_manager.database.games.get(&game_id));

    if let Some(game) = game {
      let game = game.read().await;
      return Ok(Some((
        "user/check_game".to_string(),
        Box::new(Some(UserCheckGameResponse {
          game_type: game.game_type.clone(),
          game_mode: game.game_mode.clone(),
        })),
      )));
    }

    Ok(Some((
      "user/check_game".to_string(),
      Box::new(None as Option<UserCheckGameResponse>),
    )))
  }
}
