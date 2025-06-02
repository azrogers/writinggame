use serde::Serialize;
use warp::reject::{Reject, Rejection};

#[derive(Debug)]
pub struct ParserError;

impl Reject for ParserError {}

#[derive(Serialize, Debug)]
pub struct ErrorMessage {
  pub message: String,
}

impl From<String> for ErrorMessage {
  fn from(val: String) -> Self {
    ErrorMessage { message: val }
  }
}

pub trait ToDisplayText {
  fn to_display_text(&self) -> String;
}

#[derive(Serialize, Debug)]
#[serde(tag = "type")]
pub enum SocketError {
  Parse(ErrorMessage),
  InvalidAction,
  ServerError,
  AuthError,
  GameNotFound,
  ClientOnlyAction,
  HostOnlyAction,
  ActionStateMismatch,
  ValidationError(ErrorMessage),
  AlreadyJoinedGame,
  VoteNotFound,
}

impl ToDisplayText for SocketError {
  fn to_display_text(&self) -> String {
    match self {
      SocketError::Parse(_) => {
        "Server encountered an error while trying to parse the message".to_string()
      }
      SocketError::InvalidAction => "Unknown action".to_string(),
      SocketError::ServerError => {
        "Server encountered an error while processing the request".to_string()
      }
      SocketError::AuthError => "Authentication error".to_string(),
      SocketError::GameNotFound => "Game not found".to_string(),
      SocketError::ClientOnlyAction => "Action can only be performed by a client".to_string(),
      SocketError::HostOnlyAction => "Action can only be performed by the host".to_string(),
      SocketError::ActionStateMismatch => {
        "Action cannot be performed during the current game state".to_string()
      }
      SocketError::ValidationError(error_message) => {
        format!("Validation error: {}", error_message.message)
      }
      SocketError::AlreadyJoinedGame => "User has already joined a game".to_string(),
      SocketError::VoteNotFound => "Vote not found".to_string(),
    }
  }
}
