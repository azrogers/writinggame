use std::any::Any;

use serde::{Deserialize, Serialize};

use crate::{
    models::{game::Game, user::User, SyncAny},
    ws::{MessageResponse, SocketManager},
};

pub struct WriteGameImplState {}

pub struct WriteUserImplState {}

pub struct WriteGameImpl;

impl WriteGameImpl {
    pub fn init_game_state(game: &Game) -> Box<dyn SyncAny> {
        Box::new(WriteGameImplState {})
    }

    pub fn init_user_state(game: &Game, user: &User) -> Box<dyn SyncAny> {
        Box::new(WriteUserImplState {})
    }

    pub fn on_action(
        socket_manager: &SocketManager,
        game: &mut Game,
        user: &mut User,
        action: &str,
        payload: serde_json::Value,
    ) -> Result<MessageResponse, crate::error::SocketError> {
        todo!()
    }
}
