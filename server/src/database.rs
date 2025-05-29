use std::{
  collections::{HashMap, HashSet},
  sync::Arc,
};

use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use warp::filters::ws::Message;

use crate::models::{game::Game, user::User};

pub struct SessionState {
  pub tx: mpsc::UnboundedSender<Message>,
  pub user_id: Option<Uuid>,
  pub game_id: Option<Uuid>,
}

type SessionMap = Arc<RwLock<HashMap<Uuid, SessionState>>>;
type GameMap = Arc<RwLock<HashMap<Uuid, Game>>>;
type UserMap = Arc<RwLock<HashMap<Uuid, User>>>;
type CodeToGameIdMap = Arc<RwLock<HashMap<String, Uuid>>>;
type UserToSessionIdMap = Arc<RwLock<HashMap<Uuid, Uuid>>>;
type GameToSessionIdsMap = Arc<RwLock<HashMap<Uuid, HashSet<Uuid>>>>;

#[derive(Default, Clone)]
pub struct Database {
  pub sessions: SessionMap,
  pub games: GameMap,
  pub users: UserMap,
  pub code_to_game: CodeToGameIdMap,
  pub user_to_session: UserToSessionIdMap,
  pub game_to_sessions: GameToSessionIdsMap,
}

impl Database {
  pub async fn session_add(&self, session_id: Uuid, tx: mpsc::UnboundedSender<Message>) {
    self.sessions.write().await.insert(
      session_id,
      SessionState {
        tx,
        user_id: None,
        game_id: None,
      },
    );
  }

  pub async fn session_remove(&self, session_id: Uuid) {
    if let Some(state) = self.sessions.read().await.get(&session_id) {
      if let Some(user_id) = &state.user_id {
        self.user_to_session.write().await.remove(user_id);

        // If the user isn't in a game, we can just get rid of them.
        if state.game_id.is_none() {
          self.users.write().await.remove(user_id);
        }
      }
      if let Some(game_id) = &state.game_id {
        self.game_to_sessions.write().await.remove(game_id);
      }
    }
    self.sessions.write().await.remove(&session_id);
  }

  pub async fn user_add(&self, session_id: Uuid, user: User) {
    let mut sessions = self.sessions.write().await;
    if let Some(state) = sessions.get_mut(&session_id) {
      state.user_id = Some(user.id);
      self
        .user_to_session
        .write()
        .await
        .insert(user.id, session_id);
    }
    self.users.write().await.insert(user.id, user);
  }

  pub async fn game_add(&self, game: Game) {
    self
      .code_to_game
      .write()
      .await
      .insert(game.join_code.clone(), game.id);
    self.games.write().await.insert(game.id, game);
  }

  pub async fn game_remove(&self, game: &Game) {
    for user_id in &game.users {
      self.users.write().await.remove(user_id);
      self.user_to_session.write().await.remove(user_id);
      if let Some(session) = self.sessions.write().await.get_mut(user_id) {
        session.user_id = None;
        session.game_id = None;
      }
    }
    self.code_to_game.write().await.remove(&game.join_code);
    self.games.write().await.remove(&game.id);
    self.game_to_sessions.write().await.remove(&game.id);
  }
}
