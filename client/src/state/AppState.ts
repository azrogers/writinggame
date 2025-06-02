import { atom } from "jotai";
import { ReadyState } from "react-use-websocket";

export const connectionState = atom(ReadyState.UNINSTANTIATED);

export enum GlobalGameState {
  Join = 0,
  Lobby,
  Game,
  GameEnded,
}

export const globalGameState = atom(GlobalGameState.Join);

export const isHosting = atom(false);
