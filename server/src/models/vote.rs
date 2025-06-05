use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Serialize)]
pub struct VoteTextOption {
  pub text: String,
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum VoteOptionContent {
  Text { text: String },
}

#[derive(Serialize)]
pub struct VoteOption {
  pub id: Uuid,
  pub host_id: String,
  pub exclude_user: Option<Uuid>,
  pub content: VoteOptionContent,
}

impl VoteOption {
  pub fn to_client_response(&self) -> serde_json::Value {
    json!({
      "id": self.id,
      "exclude_user": self.exclude_user,
      "content": self.content
    })
  }
}

#[derive(Serialize)]
pub struct UserVote {
  pub value: u32,
  pub option_id: Uuid,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum VoteType {
  Single,
  Ranked,
}

pub struct Vote {
  pub id: Uuid,
  pub title: String,
  pub game_id: Uuid,
  pub vote_type: VoteType,
  pub options: Vec<VoteOption>,
  pub user_votes: DashMap<Uuid, Vec<UserVote>>,
}

impl Vote {
  pub fn to_client_response(&self) -> serde_json::Value {
    let mut options = Vec::new();
    for option in &self.options {
      options.push(option.to_client_response());
    }

    json!({
      "id": self.id,
      "title": self.title,
      "vote_type": self.vote_type,
      "options": options
    })
  }
}
