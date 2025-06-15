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
    game::{Game, GameMode, GameState, GameType},
    user::{User, UserType},
  },
  ws::{MessageResponse, SocketManager},
};

const MAX_NAME_LEN: usize = 16;

#[derive(Deserialize)]
pub struct UserInitializeAction {
  name: String,
}

#[derive(Deserialize)]
pub struct UserJoinAction {
  join_code: String,
  name: String,
}

#[derive(Serialize)]
struct UserJoinResponse {
  pub token: String,
  pub user_id: Uuid,
  pub user_impl_state: serde_json::Value,
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
  ) -> Result<MessageResponse, SocketError> {
    if self.name.is_empty() || self.name.len() > MAX_NAME_LEN {
      return Err(SocketError::ValidationError(
        "Name must be between 1 and 16 characters in length."
          .to_string()
          .into(),
      ));
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

    let mut user = User::new(session_id, Some(self.name), UserType::Client);
    let token = User::create_token(&user, game_id, &socket_manager.config)?;

    let mut game = game_ptr.write().await;

    let user_id = user.id;
    user.impl_state = GameManager::init_user_state(&game, &user);
    let user_impl_state_response = user.impl_state.to_public_state();
    socket_manager.database.user_add(session_id, user).await;

    game.users.push(user_id);

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
        token,
        user_id,
        game_id: game.id,
        game_mode: game.game_mode.clone(),
        game_state: game.game_state,
        game_type: game.game_type.clone(),
        user_impl_state: user_impl_state_response,
        impl_state: game.impl_state.to_public_state(),
      }),
    )))
  }
}

#[derive(Deserialize)]
pub struct UserCheckGameAction {
  join_code: String,
  token: Option<String>,
}

#[derive(Serialize)]
pub struct UserCheckGameResponse {
  game_type: GameType,
  game_mode: GameMode,
  should_rejoin: bool,
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
      let should_rejoin = self
        .token
        .map(|t| User::verify_token(&socket_manager.config, &t))
        .map(|t| t.map(|t| t.game_id == game.id).unwrap_or(false))
        .unwrap_or(false);

      return Ok(Some((
        "user/check_game".to_string(),
        Box::new(Some(UserCheckGameResponse {
          game_type: game.game_type.clone(),
          game_mode: game.game_mode.clone(),
          should_rejoin,
        })),
      )));
    }

    Ok(Some((
      "user/check_game".to_string(),
      Box::new(None as Option<UserCheckGameResponse>),
    )))
  }
}

#[derive(Deserialize)]
pub struct UserRejoinAction;

#[derive(Serialize)]
pub struct UserRejoinResponse {
  pub user_id: Uuid,
  pub user_impl_state: serde_json::Value,
  pub game_id: Uuid,
  pub game_type: GameType,
  pub game_mode: GameMode,
  pub game_state: GameState,
  pub impl_state: serde_json::Value,
}

impl UserRejoinAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let game_id = game.read().await.id;
    let user_id = user.read().await.id;

    if let Some(vote_id) = socket_manager.database.game_to_vote.get(&game_id) {
      if let Some(vote) = socket_manager.database.votes.get(&vote_id) {
        socket_manager
          .send_to_user(user_id, "vote/start".to_string(), vote.to_client_response())
          .await;
      }
    }

    if let Some(prompt_id) = socket_manager.database.game_to_prompt.get(&game_id) {
      if let Some(prompt) = socket_manager.database.prompts.get(&prompt_id) {
        socket_manager
          .send_to_user(
            user_id,
            "prompt/start".to_string(),
            prompt.to_client_response(),
          )
          .await;
      }
    }

    let user_impl_state = user.read().await.impl_state.to_public_state();
    let game = game.read().await;
    let game_type = game.game_type;
    let game_mode = game.game_mode;
    let game_state = game.game_state;
    let game_impl_state = game.impl_state.to_public_state();
    drop(game);

    Ok(Some((
      "user/rejoin".to_string(),
      Box::new(Some(UserRejoinResponse {
        user_id,
        user_impl_state,
        game_id,
        game_type,
        game_mode,
        game_state,
        impl_state: game_impl_state,
      })),
    )))
  }
}
