use config::Config;

#[derive(Clone)]
pub struct AppConfig {
  pub token_secret: String,
  pub token_duration: i64,
  pub port: u16,
}

impl AppConfig {
  pub fn new() -> anyhow::Result<AppConfig> {
    let settings = Config::builder()
      .add_source(config::File::with_name("config"))
      .add_source(config::Environment::with_prefix("APP"))
      .build()?;

    let token_secret = settings.get_string("token_secret")?;
    let token_duration = settings.get_int("token_duration")?;
    let port = settings.get_int("port")?;
    Ok(AppConfig {
      token_secret,
      token_duration,
      port: port as u16,
    })
  }
}
