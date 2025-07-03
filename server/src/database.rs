use std::{collections::HashSet, sync::Arc};

use dashmap::DashMap;
use log::{debug, info};
use serde_json::json;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use warp::filters::ws::Message;

use crate::models::{
  game::Game,
  prompt::Prompt,
  user::{User, UserType},
  vote::Vote,
};

pub struct SessionState {
  pub tx: mpsc::UnboundedSender<Message>,
  pub user_id: Option<Uuid>,
  pub game_id: Option<Uuid>,
}

#[derive(Default, Clone)]
pub struct Database {
  pub sessions: Arc<DashMap<Uuid, SessionState>>,
  pub games: Arc<DashMap<Uuid, Arc<RwLock<Game>>>>,
  pub users: Arc<DashMap<Uuid, Arc<RwLock<User>>>>,
  pub code_to_game: Arc<DashMap<String, Uuid>>,
  pub user_to_session: Arc<DashMap<Uuid, Uuid>>,
  pub game_to_sessions: Arc<DashMap<Uuid, HashSet<Uuid>>>,
  pub votes: Arc<DashMap<Uuid, Vote>>,
  pub game_to_vote: Arc<DashMap<Uuid, Uuid>>,
  pub prompts: Arc<DashMap<Uuid, Prompt>>,
  pub game_to_prompt: Arc<DashMap<Uuid, Uuid>>,
}

impl Database {
  pub async fn session_add(&self, session_id: Uuid, tx: mpsc::UnboundedSender<Message>) {
    self.sessions.insert(
      session_id,
      SessionState {
        tx,
        user_id: None,
        game_id: None,
      },
    );
  }

  pub async fn session_remove(&self, session_id: Uuid) {
    if let Some(state) = self.sessions.get(&session_id) {
      if let Some(game_id) = &state.game_id {
        if let Some(mut sessions) = self.game_to_sessions.get_mut(game_id) {
          sessions.remove(&session_id);
        }
      }

      if let Some(user_id) = &state.user_id {
        self.user_to_session.remove(user_id);

        // If the user isn't in a game, we can just get rid of them.
        if state.game_id.is_none() {
          self.users.remove(user_id);
        } else if let Some(user) = self.users.get(user_id) {
          let user = user.read().await;
          if user.user_type == UserType::Host {
            drop(user);
            if let Some(game) = self.games.get(&state.game_id.unwrap()) {
              let id = game.read().await.id;
              info!("host left, destroying game {id}");
              drop(state);
              drop(game);
              self.game_remove(id).await;
            }
          }
        }
      }
    }
    self.sessions.remove(&session_id);
  }

  pub async fn user_add(&self, session_id: Uuid, user: User) {
    if let Some(mut state) = self.sessions.get_mut(&session_id) {
      state.user_id = Some(user.id);
      self.user_to_session.insert(user.id, session_id);
    }
    self.users.insert(user.id, Arc::new(RwLock::new(user)));
  }

  pub async fn game_add(&self, game: Game) {
    self.code_to_game.insert(game.join_code.clone(), game.id);
    self.games.insert(game.id, Arc::new(RwLock::new(game)));
  }

  pub async fn game_remove(&self, game_id: Uuid) {
    if let Some(game) = self.games.get(&game_id) {
      let game = game.read().await;
      let response_json = json!({ "action": "user/disconnected" });
      let response = Message::text(serde_json::to_string(&response_json).unwrap());
      for user_id in &game.users {
        self.users.remove(user_id);
        if let Some(session_id) = self.user_to_session.get(user_id) {
          if let Some(mut session) = self.sessions.get_mut(&session_id) {
            debug!("{:?}", response);
            let _ = session.tx.send(response.clone());
            session.user_id = None;
            session.game_id = None;
          }
        }
        self.user_to_session.remove(user_id);
      }

      self.code_to_game.remove(&game.join_code);
    }

    if let Some(vote_id) = self.game_to_vote.get(&game_id) {
      self.votes.remove(&vote_id);
      self.game_to_vote.remove(&game_id);
    }

    if let Some(prompt_id) = self.game_to_prompt.get(&game_id) {
      self.prompts.remove(&prompt_id);
      self.game_to_prompt.remove(&game_id);
    }

    self.games.remove(&game_id);
    self.game_to_sessions.remove(&game_id);
  }
}
