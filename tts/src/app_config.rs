use config::Config;

#[derive(Clone)]
pub struct AppConfig {
  pub port: u16,
  pub pool_size: u32,
  pub speaker_count: i32,
}

impl AppConfig {
  pub fn new() -> AppConfig {
    let settings = Config::builder()
      .add_source(config::File::with_name("config"))
      .add_source(config::Environment::with_prefix("APP"))
      .build()
      .unwrap();

    let port = settings.get_int("port").unwrap();
    let pool_size = settings.get_int("pool_size").unwrap();
    let speaker_count = settings.get_int("speaker_count").unwrap();
    AppConfig {
      port: port as u16,
      pool_size: pool_size as u32,
      speaker_count: speaker_count as i32,
    }
  }
}
