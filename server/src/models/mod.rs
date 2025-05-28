pub mod game;
pub mod user;

pub trait SyncAny = std::any::Any + Send + Sync;
