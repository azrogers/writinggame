import { atom } from "jotai";
import { Data } from "./Data";
import {
  endVote,
  HostVoteState,
  hostVoteState,
  isVoteActive,
  startVote,
  voteId,
  voteOptions,
} from "../../state/VoteState";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { Store } from "../../state/Store";
import { topicVoteDuration, topicVoteEndDuration } from "./Config";
import { MessageDispatcher } from "../../MessageDispatcher";
import { SentenceGenerator } from "../../data/SentenceGenerator";
import { isHosting } from "../../state/AppState";

export enum HostUIState {
  None,
  ChooseTopic,
  WriteSentence,
}

export const hostUiState = atom(HostUIState.None);

export function onUiStateChange(
  sendJsonMessage: SendJsonMessage,
  newState: HostUIState,
  timerRestart: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
) {
  if (!Store.get(isHosting)) {
    return;
  }
  if (newState == HostUIState.None) {
    Data.topics().then((topics) => {
      const selectedTopics = [];
      for (let i = 0; i < 3; i++) {
        const topic = topics.splice(
          Math.floor(topics.length * Math.random()),
          1
        )[0];
        if (topic) {
          selectedTopics.push(topic);
        }
      }

      startVote(
        sendJsonMessage,
        "Single",
        "Choose a topic:",
        selectedTopics.map((t) => ({
          text: t.name,
          host_id: t.id,
          type: "Text",
        }))
      );

      Store.set(hostUiState, HostUIState.ChooseTopic);
      Store.set(hostVoteState, HostVoteState.None);
    });
  } else if (newState == HostUIState.ChooseTopic) {
    if (Store.get(isVoteActive)) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + topicVoteDuration);
      timerRestart(expire, true);
      Store.set(hostVoteState, HostVoteState.Active);
    } else if (Store.get(hostVoteState) == HostVoteState.Active) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + topicVoteEndDuration);
      timerRestart(expire, true);
      Store.set(hostVoteState, HostVoteState.Finished);
    }
  }
}

export function onTimerExpire(
  sendJsonMessage: SendJsonMessage,
  state: HostUIState
) {
  if (!Store.get(isHosting)) {
    return;
  }
  if (state == HostUIState.ChooseTopic) {
    if (Store.get(hostVoteState) == HostVoteState.Active) {
      endVote(sendJsonMessage, Store.get(voteId) || "");
    } else if (Store.get(hostVoteState) == HostVoteState.Finished) {
      const options = [...Store.get(voteOptions)];
      options.sort((a, b) => b.score - a.score);
      const topicId = options[0].host_id;
      console.log("topic id: ", topicId);
      Data.sentences().then((sentences) => {
        const generator = new SentenceGenerator(sentences[topicId]);
        const initialSentence = generator.generate();
        sendInitialSentence(sendJsonMessage, topicId, initialSentence);
      });
    }
  }
}

export function initWriteGameHandlers() {
  MessageDispatcher.registerHandler<null>("wg/initial_sentence", () => {
    Store.set(hostVoteState, HostVoteState.None);
    Store.set(hostUiState, HostUIState.WriteSentence);
  });
}

function sendInitialSentence(
  sendJsonMessage: SendJsonMessage,
  topicId: string,
  sentence: string
) {
  MessageDispatcher.sendMessage(sendJsonMessage, "wg/initial_sentence", {
    topic: topicId,
    sentence,
  });
}
