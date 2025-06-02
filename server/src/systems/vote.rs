use std::{collections::HashMap, sync::Arc};

use itertools::Itertools;
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
  error::SocketError,
  models::{
    game::Game,
    user::{User, UserType},
    vote::{UserVote, VoteBuilder, VoteOption, VoteType},
  },
  ws::{MessageResponse, SocketManager},
};

#[derive(Deserialize)]
struct VoteStartTextOption {
  host_id: String,
  text: String,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum VoteStartOption {
  Text(VoteStartTextOption),
}

#[derive(Deserialize)]
pub struct VoteStartAction {
  vote_type: VoteType,
  options: Vec<VoteStartOption>,
}

impl VoteStartAction {
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

    let game = game.read().await;
    if socket_manager.database.game_to_vote.contains_key(&game.id) {
      return Err(SocketError::ValidationError(
        "Vote already exists for game id".to_string().into(),
      ));
    }

    let mut builder = VoteBuilder::new(self.vote_type);
    for option in self.options {
      match option {
        VoteStartOption::Text(text) => {
          builder.add_text_option(text.host_id, text.text);
        }
      }
    }

    let vote = builder.build(game.id);

    socket_manager
      .broadcast_to_game(&game, "vote/start".to_string(), vote.to_client_response())
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct VoteCastAction {
  vote_id: Uuid,
  option_id: Uuid,
}

impl VoteCastAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let user = user.read().await;
    if user.user_type != UserType::Client {
      return Err(SocketError::ClientOnlyAction);
    }

    let game = game.read().await;
    let vote = socket_manager
      .database
      .votes
      .get(&self.vote_id)
      .ok_or(SocketError::VoteNotFound)?;

    if vote.game_id != game.id {
      return Err(SocketError::VoteNotFound);
    }

    if !vote.options.iter().any(|option| match option {
      crate::models::vote::VoteOption::Text(vote_text_option) => {
        vote_text_option.id == self.option_id
      }
    }) {
      return Err(SocketError::ValidationError(
        "Vote option not found".to_string().into(),
      ));
    }

    match vote.user_votes.entry(user.id) {
      dashmap::Entry::Occupied(mut occupied_entry) => {
        if vote.vote_type == VoteType::Single {
          return Err(SocketError::ValidationError(
            "Vote already cast".to_string().into(),
          ));
        }

        let num_votes = occupied_entry.get().len();
        if vote.vote_type == VoteType::Ranked && num_votes >= 3 {
          return Err(SocketError::ValidationError(
            "Only three vote choices are allowed".to_string().into(),
          ));
        }

        occupied_entry.get_mut().push(UserVote {
          value: num_votes as u32 + 1,
          option_id: self.option_id,
        });
      }
      dashmap::Entry::Vacant(vacant_entry) => {
        vacant_entry.insert(vec![UserVote {
          value: 1,
          option_id: self.option_id,
        }]);
      }
    }

    drop(user);

    let votes = vote.user_votes.iter().map(|uv| {
      let user_votes = uv.value();
      json!({ "user_id": uv.key(), "votes": user_votes })
    });

    let message = json!({
      "id": vote.id,
      "votes": votes.collect_vec()
    });

    socket_manager
      .send_to_user(game.host_user_id, "vote/cast".to_string(), message)
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct VoteEndAction {
  vote_id: Uuid,
}

#[derive(Serialize)]
struct VoteEndResponseOption {
  option: VoteOption,
  score: u32,
}

impl VoteEndAction {
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

    let (_, mut vote) = socket_manager
      .database
      .votes
      .remove(&self.vote_id)
      .ok_or(SocketError::VoteNotFound)?;

    let mut options = HashMap::new();
    for option in vote.options.drain(0..) {
      match option {
        VoteOption::Text(text) => {
          options.insert(
            text.id,
            VoteEndResponseOption {
              option: VoteOption::Text(text),
              score: 0,
            },
          );
        }
      }
    }

    for kv in &vote.user_votes {
      for cast_vote in kv.value() {
        let option = options.get_mut(&cast_vote.option_id).ok_or_else(|| {
          warn!(
            "UserVote recorded for option {} but no option could be found",
            cast_vote.option_id
          );
          SocketError::ServerError
        })?;

        match vote.vote_type {
          VoteType::Ranked => {
            option.score += 4 - cast_vote.value;
          }
          VoteType::Single => {
            option.score += 1;
          }
        }
      }
    }

    let message = json!({
      "vote_id": self.vote_id,
      "options": options.values().collect_vec(),
      "votes": vote.user_votes.iter().map(|uv| {
        let user_votes = uv.value();
        json!({ "user_id": uv.key(), "votes": user_votes })
      }).collect_vec()
    });

    let game = game.read().await;
    socket_manager.database.game_to_vote.remove(&game.id);
    socket_manager
      .broadcast_to_game(&game, "vote/end".to_string(), serde_json::Value::Null)
      .await;
    socket_manager
      .send_to_user(game.host_user_id, "vote/end".to_string(), message)
      .await;

    Ok(None)
  }
}
