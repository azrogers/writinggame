use as_any::{AsAny, Downcast};

pub mod game;
pub mod prompt;
pub mod user;
pub mod vote;

pub trait ImplState: AsAny + Send + Sync {
  fn to_public_state(&self) -> serde_json::Value;
}

pub struct ImplStateContainer {
  state: Box<dyn ImplState>,
}

impl ImplStateContainer {
  pub fn new<T: ImplState>(val: T) -> ImplStateContainer {
    ImplStateContainer {
      state: Box::new(val),
    }
  }

  pub fn to_public_state(&self) -> serde_json::Value {
    self.state.to_public_state()
  }

  pub fn downcast_ref<T>(&self) -> Option<&T>
  where
    T: 'static,
  {
    (*self.state).downcast_ref()
  }

  pub fn downcast_mut<T>(&mut self) -> Option<&mut T>
  where
    T: 'static,
  {
    (*self.state).downcast_mut()
  }
}

pub struct EmptyState;

impl ImplState for EmptyState {
  fn to_public_state(&self) -> serde_json::Value {
    serde_json::Value::Null
  }
}
