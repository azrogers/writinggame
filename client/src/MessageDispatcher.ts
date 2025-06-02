import { LogFactory } from "./lib/logger";
import { toast } from "react-toastify";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { getToken } from "./state/UserState";

const logger = LogFactory.create("MessageHandler");

type SocketMessage =
  | {
      status: "error";
      error: {
        type: string;
      };
      display_text: string;
    }
  | { status: "success"; action: string; payload: object }
  | { status: undefined; action: string; payload: object };

export class MessageDispatcher {
  private static _messageHandlers: {
    [action: string]: (payload: any) => void;
  } = {};

  private static _waitingOnMessage: {
    [action: string]: {
      onReceive: () => void;
      onError: () => void;
    }[];
  } = {};

  static registerHandler<T>(action: string, func: (payload: T) => void) {
    MessageDispatcher._messageHandlers[action] = func;
  }

  static onReceive(message: MessageEvent<any>) {
    logger.info("received message ", JSON.parse(message.data));
    const parsedMessage = JSON.parse(message.data) as SocketMessage;

    if (parsedMessage.status == "error") {
      logger.error("socket error: ", parsedMessage.error);
      toast(`${parsedMessage.display_text}`, { type: "error" });
      Object.keys(this._waitingOnMessage).forEach((k) => {
        this._waitingOnMessage[k].forEach((cb) => {
          cb.onError();
        });
      });
      return;
    }

    if (!this._messageHandlers[parsedMessage.action]) {
      logger.error(`missing handler for action ${parsedMessage.action}`);
      return;
    }

    this._messageHandlers[parsedMessage.action](parsedMessage.payload);

    if (this._waitingOnMessage[parsedMessage.action]) {
      this._waitingOnMessage[parsedMessage.action].forEach((cb) => {
        cb.onReceive();
      });
      delete this._waitingOnMessage[parsedMessage.action];
    }
  }

  static waitForMessage(
    action: string,
    onReceive: () => void,
    onError: () => void
  ) {
    if (!this._waitingOnMessage[action]) {
      this._waitingOnMessage[action] = [];
    }

    this._waitingOnMessage[action].push({ onReceive, onError });
  }

  static sendMessage(
    sendJsonMessage: SendJsonMessage,
    action: string,
    payload: object
  ) {
    let token = getToken();
    if (!token) {
      token = null;
    }
    const msg = {
      action,
      payload,
      token: getToken(),
    };
    sendJsonMessage(msg);
    logger.info("send message ", msg);
  }
}
