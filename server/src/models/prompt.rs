use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PromptResponse {
  Text { text: String },
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(tag = "type")]
pub enum PromptType {
  Text { minLength: usize, maxLength: usize },
}

pub struct Prompt {
  pub id: Uuid,
  pub title: String,
  pub game_id: Uuid,
  pub prompt_type: PromptType,
  pub user_responses: DashMap<Uuid, PromptResponse>,
}

impl Prompt {
  pub fn to_client_response(&self) -> serde_json::Value {
    json!({
      "id": self.id,
      "title": self.title,
      "prompt_type": self.prompt_type
    })
  }
}
