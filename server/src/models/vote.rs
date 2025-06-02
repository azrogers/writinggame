use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Serialize)]
pub struct VoteTextOption {
  pub id: Uuid,
  pub host_id: String,
  pub text: String,
}

impl VoteTextOption {
  pub fn to_client_response(&self) -> serde_json::Value {
    json!({ "id": self.id, "text": self.text })
  }
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum VoteOption {
  Text(VoteTextOption),
}

impl VoteOption {
  pub fn to_client_response(&self) -> serde_json::Value {
    match self {
      VoteOption::Text(vote_text_option) => vote_text_option.to_client_response(),
    }
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
      "vote_type": self.vote_type,
      "options": options
    })
  }
}

pub struct VoteBuilder {
  vote_type: VoteType,
  options: Vec<VoteOption>,
}

impl VoteBuilder {
  pub fn new(vote_type: VoteType) -> Self {
    Self {
      vote_type,
      options: Vec::new(),
    }
  }

  pub fn add_text_option(&mut self, host_id: String, text: String) {
    self.options.push(VoteOption::Text(VoteTextOption {
      id: Uuid::new_v4(),
      host_id,
      text,
    }))
  }

  pub fn build(self, game_id: Uuid) -> Vote {
    Vote {
      id: Uuid::new_v4(),
      game_id,
      vote_type: self.vote_type,
      options: self.options,
      user_votes: DashMap::new(),
    }
  }
}
