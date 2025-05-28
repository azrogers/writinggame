use config::Config;

#[derive(Clone)]
pub struct AppConfig {
    pub token_secret: String,
    pub token_duration: i64,
}

impl AppConfig {
    pub fn new() -> anyhow::Result<AppConfig> {
        let settings = Config::builder()
            .add_source(config::File::with_name("config"))
            .add_source(config::Environment::with_prefix("APP"))
            .build()?;

        let token_secret = settings.get_string("token_secret")?;
        let token_duration = settings.get_int("token_duration")?;
        Ok(AppConfig {
            token_secret,
            token_duration,
        })
    }
}
