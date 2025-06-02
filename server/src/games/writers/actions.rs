use std::sync::Arc;

use log::{error, warn};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::{
  error::SocketError,
  models::{
    game::Game,
    user::{User, UserType},
    ImplState,
  },
  ws::{MessageResponse, SocketManager},
};

use super::{RoundState, Sentence, WriteGameImplState, WriteGameUserType, WriteUserImplState};

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
    if user_impl_state.is_none() || user_impl_state.unwrap().user_type != WriteGameUserType::Leader
    {
      return Err(SocketError::ValidationError(
        "User type 'Leader' required to perform this action"
          .to_string()
          .into(),
      ));
    }

    socket_manager
      .send_to_user(
        game.host_user_id,
        "game/leader_start_game".to_owned(),
        serde_json::Value::Null,
      )
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct InitialSentenceAction {
  pub topic: String,
  pub sentence: String,
}

#[derive(Serialize)]
struct InitialSentenceResponse;

impl InitialSentenceAction {
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
      warn!(
        "user {0} tried to call wg/initial_sentence, isn't host!",
        user.id
      );
      return Err(SocketError::HostOnlyAction);
    }

    let mut game = game.write().await;
    let impl_state: Option<&mut WriteGameImplState> = game.impl_state.downcast_mut();
    if impl_state.is_none() {
      error!("failed to downcase game.impl_state to WriteGameImplState");
      return Err(SocketError::ServerError);
    }

    let impl_state = impl_state.unwrap();
    if impl_state.round_state != RoundState::Intro {
      warn!(
        "tried to use wg/initial_sentence in RoundStage {:?}",
        impl_state.round_state
      );
      return Err(SocketError::ActionStateMismatch);
    }

    if !impl_state.sentences.is_empty() {
      warn!("tried to use wg/initial_sentence but an initial sentence was already set");
      return Err(SocketError::ActionStateMismatch);
    }

    impl_state.topic = self.topic;
    impl_state.sentences.push(Sentence {
      author: None,
      text: self.sentence,
    });

    let state_update = impl_state.to_public_state();

    socket_manager
      .broadcast_to_game(&game, "wg/sentences_update".to_string(), state_update)
      .await;

    Ok(Some((
      "wg/initial_sentence".to_string(),
      Box::new(InitialSentenceResponse {}),
    )))
  }
}
