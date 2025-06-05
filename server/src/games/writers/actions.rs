use std::sync::Arc;

use log::{error, warn};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
  error::SocketError,
  models::{
    game::Game,
    user::{User, UserType},
    ImplState,
  },
  ws::{MessageResponse, SocketManager},
};

use super::{Sentence, WriteGameImplState, WriteGameUserType, WriteUserImplState};

const MAX_SENTENCE_LENGTH: usize = 200;
const MIN_USERS_TO_START: usize = 2;

#[derive(Deserialize)]
pub struct LeaderStartGameAction;

impl LeaderStartGameAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let game = game.read().await;
    if game.users.len() < MIN_USERS_TO_START {
      return Err(SocketError::ValidationError(
        format!("Must have at least {MIN_USERS_TO_START} to start game").into(),
      ));
    }

    let user = user.read().await;
    let user_impl_state = user.impl_state.downcast_ref::<WriteUserImplState>();
    if user_impl_state.unwrap().user_type != WriteGameUserType::Leader {
      return Err(SocketError::ValidationError(
        "User type 'Leader' required to perform this action"
          .to_string()
          .into(),
      ));
    }

    socket_manager
      .send_to_user(
        game.host_user_id,
        "wg/leader_start_game".to_owned(),
        serde_json::Value::Null,
      )
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct SentenceAction {
  pub topic: Option<String>,
  pub sentence: String,
  pub sentence_author: Option<Uuid>,
}

#[derive(Serialize)]
struct SentenceResponse;

impl SentenceAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    game: Arc<RwLock<Game>>,
    user: Arc<RwLock<User>>,
  ) -> Result<MessageResponse, SocketError> {
    let sentence = self.sentence.trim();
    if sentence.is_empty() || sentence.len() > MAX_SENTENCE_LENGTH {
      return Err(SocketError::ValidationError(
        "Sentence must be between 1 and 200 characters"
          .to_string()
          .into(),
      ));
    }

    let user = user.read().await;
    if user.user_type != UserType::Host {
      warn!("user {0} tried to call wg/sentence, isn't host!", user.id);
      return Err(SocketError::HostOnlyAction);
    }

    let mut game = game.write().await;
    let impl_state: Option<&mut WriteGameImplState> = game.impl_state.downcast_mut();
    if impl_state.is_none() {
      error!("failed to downcase game.impl_state to WriteGameImplState");
      return Err(SocketError::ServerError);
    }

    let impl_state = impl_state.unwrap();
    if let Some(topic) = self.topic {
      impl_state.topic = topic;
    }
    impl_state.sentences.push(Sentence {
      author: self.sentence_author,
      text: self.sentence,
    });

    socket_manager
      .broadcast_to_game(
        &game,
        "game/state".to_string(),
        serde_json::to_value(game.to_state_update()).unwrap(),
      )
      .await;

    Ok(Some((
      "wg/sentence".to_string(),
      Box::new(SentenceResponse {}),
    )))
  }
}
