#![feature(trait_alias)]

use std::convert::Infallible;

use app_config::AppConfig;
use log::error;
use serde::Serialize;
use warp::{http::StatusCode, reject::Rejection, reply::Reply, Filter};
use ws::SocketManager;

mod app_config;
mod database;
mod error;
mod games;
mod models;
mod systems;
mod ws;

fn ws_handler(ws: warp::ws::Ws, socket_manager: SocketManager) -> impl Reply {
  ws.on_upgrade(move |socket| SocketManager::user_connected(socket_manager, socket))
}

#[derive(Serialize)]
struct ErrorMessage {
  code: u16,
  message: String,
}

async fn rejection_handler(err: Rejection) -> Result<impl Reply, Infallible> {
  let code;
  let message;

  if err.is_not_found() {
    code = StatusCode::NOT_FOUND;
    message = "NOT_FOUND";
  } else if err.find::<error::ParserError>().is_some() {
    code = StatusCode::BAD_REQUEST;
    message = "JSON_PARSER_ERROR";
  } else if err
    .find::<warp::filters::body::BodyDeserializeError>()
    .is_some()
  {
    code = StatusCode::BAD_REQUEST;
    message = "BAD_REQUEST";
  } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
    code = StatusCode::METHOD_NOT_ALLOWED;
    message = "METHOD_NOT_ALLOWED";
  } else {
    error!("unhandled rejection: {:?}", err);
    code = StatusCode::INTERNAL_SERVER_ERROR;
    message = "UNHANDLED_REJECTION";
  }

  let json = warp::reply::json(&ErrorMessage {
    code: code.as_u16(),
    message: message.into(),
  });

  Ok(warp::reply::with_status(json, code))
}

#[tokio::main]
async fn main() {
  log4rs::init_file("log4rs.yml", Default::default()).unwrap();

  let config = AppConfig::new().unwrap();
  let socket_manager = ws::SocketManager::new(config.clone());

  let hello = warp::path!("hello" / String).map(|name| format!("Hello, {name}!"));

  let ws_route = warp::path("ws")
    .and(warp::ws())
    .and(warp::any().map(move || socket_manager.clone()))
    .map(ws_handler)
    .recover(rejection_handler);

  warp::serve(ws_route)
    .run(([127, 0, 0, 1], config.port))
    .await;
}
