use std::{convert::Infallible, sync::Arc};

use app_config::AppConfig;
use log::{error, info};
use mp3lame_encoder::{Builder, Encoder, FlushNoGap, MonoPcm};
use serde::Deserialize;
use sherpa_rs::tts::{TtsAudio, VitsTts, VitsTtsConfig};
use tub::Pool;
use warp::{http::Response, Filter};

mod app_config;

#[derive(Deserialize)]
pub struct TtsRequest {
  pub text: String,
  pub speaker_id: i32,
}

fn create_encoder(audio: &TtsAudio) -> Result<Encoder, mp3lame_encoder::BuildError> {
  let mut mp3_encoder = Builder::new().ok_or(mp3lame_encoder::BuildError::Other(999))?;
  mp3_encoder.set_num_channels(1)?;
  mp3_encoder.set_sample_rate(audio.sample_rate)?;
  mp3_encoder.set_brate(mp3lame_encoder::Bitrate::Kbps192)?;
  mp3_encoder.set_quality(mp3lame_encoder::Quality::Good)?;

  let mp3_encoder = mp3_encoder.build()?;
  Ok(mp3_encoder)
}

fn generate_tts(
  config: &AppConfig,
  request: TtsRequest,
  tts: &mut VitsTts,
) -> anyhow::Result<Vec<u8>> {
  let sid = request.speaker_id % config.speaker_count;
  let audio = tts.create(&request.text, sid, 1.0).map_err(|err| {
    error!("tts error: {err:?}");
    anyhow::Error::msg("TTS error")
  })?;

  let mut mp3_encoder = create_encoder(&audio).map_err(|err| {
    error!("build error: {err:?}");
    anyhow::Error::msg("Build error")
  })?;

  let mut buffer = Vec::with_capacity(mp3lame_encoder::max_required_buffer_size(
    audio.samples.len(),
  ));
  let input = MonoPcm(&audio.samples);
  let encoded_size = mp3_encoder
    .encode(input, buffer.spare_capacity_mut())
    .map_err(|err| {
      error!("encoding error: {err:?}");
      anyhow::Error::msg("Encoding error")
    })?;

  unsafe {
    buffer.set_len(buffer.len().wrapping_add(encoded_size));
  }

  let encoded_size = mp3_encoder
    .flush::<FlushNoGap>(buffer.spare_capacity_mut())
    .expect("to flush");
  unsafe {
    buffer.set_len(buffer.len().wrapping_add(encoded_size));
  }

  Ok(buffer)
}

async fn tts_handler(
  config: AppConfig,
  pool: Arc<Pool<VitsTts>>,
  request: TtsRequest,
) -> Result<impl warp::Reply, Infallible> {
  let mut tts = pool.acquire().await;
  let mp3_buffer = generate_tts(&config, request, &mut tts).map_err(|err| {
    error!("error: {err:?}");
  });
  drop(tts);

  Ok(match mp3_buffer {
    Ok(buffer) => Response::builder()
      .header("Content-Type", "audio/mpeg")
      .header("Content-Disposition", "attachment; filename=\"tts.mp3\"")
      .body(buffer),
    Err(_) => Response::builder().body("Server error".as_bytes().to_vec()),
  })
}

fn create_tts() -> VitsTts {
  let config = VitsTtsConfig {
    model: "./data/en_US-libritts_r-medium.onnx".into(),
    data_dir: "./data/espeak-ng-data".into(),
    tokens: "./data/tokens.txt".into(),
    length_scale: 1.0,
    ..Default::default()
  };

  VitsTts::new(config)
}

#[tokio::main]
async fn main() {
  log4rs::init_file("log4rs.yml", Default::default()).unwrap();
  let config = AppConfig::new();

  info!("creating pool of {} tts instances", config.pool_size);
  let pool: Pool<VitsTts> = (0..config.pool_size).map(|_| create_tts()).into();
  let pool = Arc::new(pool);

  let port = config.port;

  let tts = warp::post()
    .and(warp::path("tts"))
    .and(warp::any().map(move || config.clone()))
    .and(warp::any().map(move || pool.clone()))
    .and(warp::body::content_length_limit(1024 * 32))
    .and(warp::body::json())
    .and_then(tts_handler)
    .with(
      warp::cors()
        .allow_any_origin()
        .allow_header("content-type")
        .allow_method("POST"),
    );

  info!("starting server on port {port}");
  warp::serve(tts).run(([0, 0, 0, 0], port)).await
}
