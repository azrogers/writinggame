use std::sync::Arc;

use dashmap::DashMap;
use itertools::Itertools;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
  error::SocketError,
  models::{
    game::Game,
    prompt::{Prompt, PromptResponse, PromptType},
    user::{User, UserType},
  },
  ws::{MessageResponse, SocketManager},
};

#[derive(Deserialize)]
pub struct PromptStartAction {
  prompt_type: PromptType,
  title: String,
}

impl PromptStartAction {
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
    if socket_manager
      .database
      .game_to_prompt
      .contains_key(&game.id)
    {
      return Err(SocketError::ValidationError(
        "Prompt already exists for game id".to_string().into(),
      ));
    }

    let prompt = Prompt {
      id: Uuid::new_v4(),
      title: self.title,
      game_id: game.id,
      prompt_type: self.prompt_type,
      user_responses: DashMap::new(),
    };
    let response = prompt.to_client_response();

    socket_manager
      .database
      .game_to_prompt
      .insert(game.id, prompt.id);
    socket_manager.database.prompts.insert(prompt.id, prompt);

    socket_manager
      .broadcast_to_game(&game, "prompt/start".to_string(), response)
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct PromptSubmitAction {
  prompt_id: Uuid,
  response: PromptResponse,
}

impl PromptSubmitAction {
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
    let prompt = socket_manager
      .database
      .prompts
      .get(&self.prompt_id)
      .ok_or(SocketError::VoteNotFound)?;

    if prompt.game_id != game.id {
      return Err(SocketError::PromptNotFound);
    }

    if prompt.user_responses.contains_key(&user.id) {
      return Err(SocketError::ValidationError(
        "Prompt response already given".to_string().into(),
      ));
    }

    match prompt.prompt_type {
      PromptType::Text {
        minLength,
        maxLength,
      } => match &self.response {
        PromptResponse::Text { text } => {
          if text.len() > maxLength || text.len() < minLength {
            return Err(SocketError::ValidationError(
              format!("Prompt response must be between {minLength} and {maxLength}").into(),
            ));
          }
        }
        _ => {
          return Err(SocketError::ValidationError(
            "Prompt response must be Text type.".to_string().into(),
          ));
        }
      },
    };

    prompt.user_responses.insert(user.id, self.response);

    let responses = prompt
      .user_responses
      .iter()
      .map(|res| json!({ "user_id": res.key(), "response": res.value() }));

    let message = json!({
      "id": prompt.id,
      "responses": responses.collect_vec()
    });

    socket_manager
      .send_to_user(game.host_user_id, "prompt/submit".to_string(), message)
      .await;

    Ok(None)
  }
}

#[derive(Deserialize)]
pub struct PromptEndAction {
  prompt_id: Uuid,
}

impl PromptEndAction {
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

    let (_, prompt) = socket_manager
      .database
      .prompts
      .remove(&self.prompt_id)
      .ok_or(SocketError::VoteNotFound)?;

    let responses = prompt
      .user_responses
      .iter()
      .map(|res| json!({ "user_id": res.key(), "response": res.value() }));

    let message = json!({
      "id": prompt.id,
      "responses": responses.collect_vec()
    });

    let game = game.read().await;
    socket_manager.database.game_to_prompt.remove(&game.id);
    socket_manager
      .broadcast_to_game(&game, "prompt/end".to_string(), serde_json::Value::Null)
      .await;
    socket_manager
      .send_to_user(game.host_user_id, "prompt/end".to_string(), message)
      .await;

    Ok(None)
  }
}
