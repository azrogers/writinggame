import { atom } from "jotai";
import { MessageDispatcher } from "../MessageDispatcher";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { Store } from "./Store";

export const userId = atom<string | null>(null);
export const userImplState = atom<object>({});

export const userJoining = atom(false);

let token: string | null = null;

export function getToken(): string | null {
  //return localStorage.getItem("app:user_token");
  return token;
}

export function setToken(token_: string | null) {
  //localStorage.setItem("app:user_token", token || "");
  token = token_;
}

interface UserInitializeResponse {
  user_id: string;
  token: string;
}

export function initUserHandlers() {
  MessageDispatcher.registerHandler<UserInitializeResponse>(
    "user/initialize",
    (payload) => {
      Store.set(userId, payload.user_id);
      setToken(payload.token);
    }
  );
}

export function joinGame(
  sendJsonMessage: SendJsonMessage,
  code: string,
  name: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    setToken("");

    MessageDispatcher.waitForMessage(
      "user/initialize",
      () => {
        MessageDispatcher.waitForMessage("user/join", resolve, resolve);
        MessageDispatcher.sendMessage(sendJsonMessage, "user/join", {
          join_code: code.toUpperCase(),
        });
      },
      () => {
        resolve();
      }
    );

    MessageDispatcher.sendMessage(sendJsonMessage, "user/initialize", {
      name,
    });
  });
}
