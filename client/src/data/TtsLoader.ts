import { endpointConfig } from "../state/AppState";
import { Store } from "../state/Store";

export interface AudioFile {
  data: AudioBuffer;
}

export class TtsLoader {
  static _context: AudioContext | null = null;

  static generate(text: string, voice: number): Promise<AudioFile> {
    const endpoint = Store.get(endpointConfig)?.tts_url || "";
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        speaker_id: voice,
      }),
    })
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if (!this._context) {
          this._context = new AudioContext();
        }
        return this._context?.decodeAudioData(buffer);
      })
      .then((buffer) => ({ data: buffer }));
  }

  static play(file: AudioFile): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this._context) {
        this._context = new AudioContext();
      }
      const playSound = this._context.createBufferSource();
      playSound.buffer = file.data;
      playSound.connect(this._context.destination);
      playSound.onended = () => {
        resolve();
      };
      playSound.start(this._context.currentTime);
    });
  }
}
