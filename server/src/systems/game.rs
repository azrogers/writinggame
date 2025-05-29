use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
  error::SocketError,
  games::GameManager,
  models::{
    game::{Game, GameMode, GameType},
    user::{User, UserType},
  },
  ws::{MessageResponse, SocketManager},
};

#[derive(Deserialize)]
pub struct GameHostAction {
  game_type: GameType,
  game_mode: GameMode,
}

#[derive(Serialize)]
pub struct GameHostResponse {
  game_id: Uuid,
  user_id: Uuid,
  token: String,
}

impl GameHostAction {
  pub async fn on_receive(
    self,
    socket_manager: &SocketManager,
    session_id: Uuid,
  ) -> Result<MessageResponse, SocketError> {
    let user = User::new(session_id, None, UserType::Host);
    let mut game = Game::new(&socket_manager.database, self.game_type, self.game_mode).await?;
    game.users.push(user.id);

    let token = user.create_token(&socket_manager.config)?;

    game.impl_state = GameManager::init_game_state(&game);

    let id = game.id;
    socket_manager.database.game_add(game).await;

    Ok(Some((
      "game/host".to_string(),
      Box::new(GameHostResponse {
        game_id: id,
        user_id: user.id,
        token,
      }),
    )))
  }
}
