import { atom } from "jotai";
import { MessageDispatcher } from "../MessageDispatcher";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { Store } from "./Store";
import { GlobalGameState, globalGameState } from "./AppState";
import { checkGameInfo } from "./GameState";

export const userId = atom<string | null>(null);
export const userImplState = atom<object>({});

export const userJoining = atom(false);

let token: string | null = null;

export function getToken(): string | null {
  return import.meta.env.PROD ? localStorage.getItem("app:user_token") : token;
}

export function setToken(token_: string | null) {
  localStorage.setItem("app:user_token", token_ || "");
  token = token_;
}

export interface UserJoinInfo {
  name: string;
  code: string | null;
}

export function setUserJoinInfo(info: UserJoinInfo) {
  localStorage.setItem("app:user_join_info", JSON.stringify(info));
}

export function getUserJoinInfo(): UserJoinInfo | null {
  const str = localStorage.getItem("app:user_join_info");
  if (str) {
    return JSON.parse(str) as UserJoinInfo;
  }

  return null;
}

export function initUserHandlers() {
  MessageDispatcher.registerHandler<null>("user/disconnected", () => {
    Store.set(globalGameState, GlobalGameState.Join);
    Store.set(userId, null);
    Store.set(checkGameInfo, null);
    setToken(null);
    const info = getUserJoinInfo();
    if (info) {
      setUserJoinInfo({ code: null, name: info.name });
    }
  });
}

export function joinGame(
  sendJsonMessage: SendJsonMessage,
  code: string,
  name: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    const _checkGameInfo = Store.get(checkGameInfo);
    if (
      _checkGameInfo &&
      _checkGameInfo !== true &&
      _checkGameInfo.should_rejoin
    ) {
      MessageDispatcher.waitForMessage("user/rejoin", resolve, resolve);
      MessageDispatcher.sendMessage(sendJsonMessage, "user/rejoin", null);
    } else {
      setToken("");
      setUserJoinInfo({ code, name });

      MessageDispatcher.waitForMessage("user/join", resolve, resolve);
      MessageDispatcher.sendMessage(sendJsonMessage, "user/join", {
        join_code: code.toUpperCase(),
        name,
      });
    }
  });
}
