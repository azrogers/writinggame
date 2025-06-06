export interface EndpointConfig {
  websocket_url: string;
  tts_url: string;
}

export class EndpointConfigLoader {
  static load(): Promise<EndpointConfig> {
    return fetch("/endpoints.json")
      .then((res) => res.json())
      .then((res) => res as EndpointConfig);
  }
}
