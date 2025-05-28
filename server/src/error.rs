use serde::Serialize;
use warp::reject::{Reject, Rejection};

#[derive(Debug)]
pub struct ParserError;

impl Reject for ParserError {}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum SocketError {
    Parse(String),
    InvalidAction,
    ServerError,
    AuthError,
    NotFound,
}
