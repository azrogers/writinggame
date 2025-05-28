use std::any::Any;

use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use jwt::{SignWithKey, VerifyWithKey};
use log::{error, warn};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;

use crate::{app_config::AppConfig, error::SocketError};

use super::SyncAny;

#[derive(Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(tag = "type")]
pub enum UserType {
    Client,
    Host,
}

pub struct User {
    pub id: Uuid,
    pub session_id: Uuid,
    pub name: Option<String>,
    pub created: DateTime<Utc>,
    pub user_type: UserType,
    pub impl_state: Box<dyn SyncAny>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct JwtTokenContents {
    pub user_id: Uuid,
    pub user_type: UserType,
    pub created: DateTime<Utc>,
    pub expires: DateTime<Utc>,
}

impl User {
    pub fn new(session_id: Uuid, name: Option<String>, user_type: UserType) -> Self {
        Self {
            id: Uuid::default(),
            session_id,
            name,
            created: chrono::offset::Utc::now(),
            user_type,
            impl_state: Box::new(false),
        }
    }

    pub fn verify_token(config: &AppConfig, token: &str) -> Result<JwtTokenContents, SocketError> {
        let key: Hmac<Sha256> =
            Hmac::new_from_slice(config.token_secret.as_bytes()).map_err(|err| {
                error!("Failed to create token hmac: {:?}", err);
                SocketError::ServerError
            })?;
        let contents: JwtTokenContents = token.verify_with_key(&key).map_err(|err| {
            warn!("Failed to verify token: {:?}", err);
            SocketError::AuthError
        })?;

        if contents.expires > chrono::offset::Utc::now() {
            warn!("Attempted to authenticate with expired token");
            return Err(SocketError::AuthError);
        }

        Ok(contents)
    }

    pub fn create_token(&self, config: &AppConfig) -> Result<String, SocketError> {
        let key: Hmac<Sha256> =
            Hmac::new_from_slice(config.token_secret.as_bytes()).map_err(|err| {
                error!("Failed to create token hmac: {:?}", err);
                SocketError::ServerError
            })?;
        let expires = chrono::offset::Utc::now() + chrono::Duration::seconds(config.token_duration);
        let contents = JwtTokenContents {
            user_id: self.id,
            user_type: self.user_type,
            created: chrono::offset::Utc::now(),
            expires,
        };

        contents.sign_with_key(&key).map_err(|err| {
            error!("error signing jwt token: {:?}", err);
            SocketError::ServerError
        })
    }
}
