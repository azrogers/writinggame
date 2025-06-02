import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { MessageDispatcher } from "../MessageDispatcher";
import { atom } from "jotai";
import { Store } from "./Store";
import { setToken, userId, userImplState } from "./UserState";
import { GlobalGameState, globalGameState, isHosting } from "./AppState";

export type GameType = "WriteGame";
export type GameMode = "Normal";
export type GameState = "Lobby" | "Playing" | "Concluded";

export function gameTypeToString(type: GameType) {
  if (type == "WriteGame") {
    return "Write Game";
  }

  return "Unknown Game";
}

interface GameUserState {
  name: string | null;
  id: string;
  impl_state: object;
}

interface CheckGameResponse {
  game_type: GameType;
  game_mode: GameMode;
}

export const checkGameInfo = atom<CheckGameResponse | null | boolean>(null);

export const gameId = atom<string | null>(null);
export const gameImplState = atom<object>({});
export const gameType = atom<GameType | null>(null);
export const gameMode = atom<GameMode | null>(null);
export const gameUsers = atom<GameUserState[]>([]);

export const creatingGame = atom(false);
export const joinCode = atom<string | null>(null);

interface GameHostResponse {
  game_id: string;
  user_id: string;
  token: string;
  impl_state: object;
  join_code: string;
  game_type: GameType;
  game_mode: GameMode;
}

interface UserJoinResponse {
  game_id: string;
  game_type: GameType;
  game_mode: GameMode;
  game_state: GameState;
  impl_state: object;
}

interface UserJoinStateResponse {
  users: GameUserState[];
}

interface GameStateResponse {
  game_state: GameState;
  impl_state: object;
}

export function initGameHandlers() {
  MessageDispatcher.registerHandler<GameHostResponse>(
    "game/host",
    (payload) => {
      Store.set(gameId, payload.game_id);
      Store.set(userId, payload.user_id);
      setToken(payload.token);
      Store.set(globalGameState, GlobalGameState.Lobby);
      Store.set(creatingGame, false);
      Store.set(joinCode, payload.join_code);
      Store.set(gameImplState, payload.impl_state);
      Store.set(gameMode, payload.game_mode);
      Store.set(gameType, payload.game_type);
    }
  );

  MessageDispatcher.registerHandler<UserJoinResponse>(
    "user/join",
    (payload) => {
      Store.set(gameId, payload.game_id);
      Store.set(gameType, payload.game_type);
      Store.set(gameMode, payload.game_mode);
      Store.set(gameImplState, payload.impl_state);
      if (payload.game_state == "Lobby") {
        Store.set(globalGameState, GlobalGameState.Lobby);
      } else if (payload.game_state == "Playing") {
        Store.set(globalGameState, GlobalGameState.Game);
      } else if (payload.game_state == "Concluded") {
        Store.set(globalGameState, GlobalGameState.GameEnded);
      }
    }
  );

  MessageDispatcher.registerHandler<UserJoinStateResponse>(
    "game/users",
    (payload) => {
      Store.set(gameUsers, payload.users);
      for (let i = 0; i < payload.users.length; i++) {
        if (payload.users[i].id == Store.get(userId)) {
          Store.set(userImplState, payload.users[i].impl_state);
          break;
        }
      }
    }
  );

  MessageDispatcher.registerHandler<GameStateResponse>(
    "game/start",
    (payload) => {
      Store.set(gameImplState, payload.impl_state);
      if (payload.game_state == "Lobby") {
        Store.set(globalGameState, GlobalGameState.Lobby);
      } else if (payload.game_state == "Playing") {
        Store.set(globalGameState, GlobalGameState.Game);
      } else if (payload.game_state == "Concluded") {
        Store.set(globalGameState, GlobalGameState.GameEnded);
      }
    }
  );

  MessageDispatcher.registerHandler<CheckGameResponse | null>(
    "user/check_game",
    (payload) => {
      Store.set(checkGameInfo, payload ? payload : false);
    }
  );
}

export function initGameHandlersWithSend(sendJsonMessage: SendJsonMessage) {
  MessageDispatcher.registerHandler<null>("game/leader_start_game", () => {
    MessageDispatcher.sendMessage(sendJsonMessage, "game/start", {});
  });
}

export function checkGame(sendJsonMessage: SendJsonMessage, code: string) {
  Store.set(checkGameInfo, null);
  MessageDispatcher.sendMessage(sendJsonMessage, "user/check_game", {
    join_code: code.toUpperCase(),
  });
}

export function hostGame(sendJsonMessage: SendJsonMessage) {
  Store.set(isHosting, true);
  MessageDispatcher.sendMessage(sendJsonMessage, "game/host", {
    game_type: "WriteGame",
    game_mode: "Normal",
  });
}

export function startGameLeader(sendJsonMessage: SendJsonMessage) {
  MessageDispatcher.sendMessage(sendJsonMessage, "game/leader_start_game", {});
}
