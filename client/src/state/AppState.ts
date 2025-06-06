import { atom } from "jotai";
import { ReadyState } from "react-use-websocket";
import { type EndpointConfig } from "../Endpoints";

export const connectionState = atom(ReadyState.UNINSTANTIATED);

export enum GlobalGameState {
  Join = 0,
  Lobby,
  Game,
  GameEnded,
}

export const globalGameState = atom(GlobalGameState.Join);

export const isHosting = atom(false);

export const endpointConfig = atom<EndpointConfig | null>(null);
