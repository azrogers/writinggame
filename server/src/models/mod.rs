pub mod game;
pub mod user;

pub trait ImplState: Send + Sync {
  fn to_public_state(&self) -> serde_json::Value;
}

pub struct EmptyState;

impl ImplState for EmptyState {
  fn to_public_state(&self) -> serde_json::Value {
    serde_json::Value::Null
  }
}
