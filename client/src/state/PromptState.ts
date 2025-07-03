import { atom } from "jotai";
import { MessageDispatcher } from "../MessageDispatcher";
import { Store } from "./Store";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { isHosting } from "./AppState";
import Sound from "../Sound";

export type PromptType = {
  type: "Text";
  minLength: number;
  maxLength: number;
};

type PromptResponse = {
  type: "Text";
  text: string;
};

export const isPromptActive = atom<boolean>(false);
export const promptId = atom<string | null>(null);
export const promptTitle = atom<string | null>(null);
export const promptType = atom<PromptType>({
  type: "Text",
  minLength: 0,
  maxLength: 0,
});

export const promptSubmitted = atom<boolean>(false);

export enum HostPromptState {
  None,
  Active,
  Finished,
}

export const hostPromptState = atom<HostPromptState>(HostPromptState.None);

interface UserPromptResponse {
  user_id: string;
  response: PromptResponse;
}

export const promptUserResponses = atom<UserPromptResponse[]>([]);

interface PromptStartResponse {
  id: string;
  title: string;
  prompt_type: PromptType;
}

interface PromptSubmitResponse {
  id: string;
  responses: UserPromptResponse[];
}

interface PromptEndResponse {
  id: string;
  responses: UserPromptResponse[];
}

export function initPromptHandlers() {
  MessageDispatcher.registerHandler<PromptStartResponse>(
    "prompt/start",
    (payload) => {
      Store.set(promptSubmitted, false);
      Store.set(promptId, payload.id);
      Store.set(promptTitle, payload.title);
      Store.set(promptType, payload.prompt_type);
      Store.set(promptUserResponses, []);
      Store.set(isPromptActive, true);
      Store.set(hostPromptState, HostPromptState.None);
    }
  );

  MessageDispatcher.registerHandler<PromptSubmitResponse>(
    "prompt/submit",
    (payload) => {
      Store.set(promptUserResponses, payload.responses);
			if (Store.get(isHosting))
			{
				Sound.sfxPlay("submit");
			}
    }
  );

  MessageDispatcher.registerHandler<PromptEndResponse | null>(
    "prompt/end",
    (payload) => {
      if (payload) {
        Store.set(promptUserResponses, payload.responses);
      }

      Store.set(isPromptActive, false);
    }
  );
}

export function startPrompt(
  sendJsonMessage: SendJsonMessage,
  type: PromptType,
  title: string
) {
  Store.set(promptUserResponses, []);
  MessageDispatcher.sendMessage(sendJsonMessage, "prompt/start", {
    prompt_type: type,
    title: title,
  });
}

export function submitPrompt(
  sendJsonMessage: SendJsonMessage,
  promptId: string,
  response: PromptResponse
) {
  MessageDispatcher.sendMessage(sendJsonMessage, "prompt/submit", {
    prompt_id: promptId,
    response,
  });
}

export function endPrompt(sendJsonMessage: SendJsonMessage, promptId: string) {
  MessageDispatcher.sendMessage(sendJsonMessage, "prompt/end", {
    prompt_id: promptId,
  });
}
