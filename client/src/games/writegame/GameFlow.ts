import { atom } from "jotai";
import { Data, type Topic } from "./Data";
import {
  endVote,
  HostVoteState,
  hostVoteState,
  isVoteActive,
  startVote,
  voteId,
  voteOptions,
  voteUserVotes,
  type VoteOption,
  type VoteStartOption,
} from "../../state/VoteState";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { Store } from "../../state/Store";
import {
  sentenceDisplayDuration,
  sentenceScoringDuration,
  sentenceVoteDuration,
  sentenceVoteEndDuration,
  sentenceWriteDuration,
  topicVoteDuration,
  topicVoteEndDuration,
} from "./Config";
import { MessageDispatcher } from "../../MessageDispatcher";
import { SentenceGenerator } from "../../data/SentenceGenerator";
import { isHosting } from "../../state/AppState";
import {
  endPrompt,
  HostPromptState,
  hostPromptState,
  isPromptActive,
  promptId,
  promptUserResponses,
  startPrompt,
} from "../../state/PromptState";
import { gameRoundCount, gameUsers } from "../../state/GameState";
import type { WriteUserImplState } from "./ImplState";

export enum HostUIState {
  None,
  ChooseTopic,
  WriteSentence,
  VoteSentence,
  DisplayNewSentence,
  Scoring,
  DisplayFinalSentences,
}

export const hostUiState = atom(HostUIState.None);
export const hostGameTopic = atom<Topic | null>(null);

export interface HostUserScore {
  userId: string;
  score: number;
  scoreAdded: number;
}

export const hostUserScores = atom<{ [userId: string]: HostUserScore }>({});

export function onUiStateChange(
  sendJsonMessage: SendJsonMessage,
  newState: HostUIState,
  timerRestart: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
) {
  if (!Store.get(isHosting)) {
    return;
  }
  if (newState == HostUIState.None) {
    const users = Store.get(gameUsers);
    const scores: { [userId: string]: HostUserScore } = {};
    users.forEach((user) => {
      scores[user.id] = {
        userId: user.id,
        score: 0,
        scoreAdded: 0,
      };
    });
    Store.set(hostUserScores, scores);

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
          host_id: t.id,
          exclude_user: null,
          content: {
            type: "Text",
            text: t.name,
          },
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
  } else if (newState == HostUIState.WriteSentence) {
    if (Store.get(isPromptActive)) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + sentenceWriteDuration);
      timerRestart(expire, true);
      Store.set(hostPromptState, HostPromptState.Active);
    } else if (Store.get(hostPromptState) == HostPromptState.Active) {
      Store.set(hostPromptState, HostPromptState.None);
      Store.set(hostUiState, HostUIState.VoteSentence);
      const responses = Store.get(promptUserResponses);
      const hasUserIds: { [userId: string]: boolean } = {};
      responses.forEach((res) => {
        hasUserIds[res.user_id] = true;
      });
      const options: VoteStartOption[] = Store.get(promptUserResponses).map(
        (res) => ({
          host_id: res.user_id,
          exclude_user: res.user_id,
          content: {
            type: "Text",
            text: res.response.text,
          },
        })
      );

      const noResponseGenerator = new SentenceGenerator(
        Data.assertSentences()["no_submission"]
      );
      Store.get(gameUsers).forEach((user) => {
        const implState = user.impl_state as WriteUserImplState;
        if (implState.user_type != "Audience" && !hasUserIds[user.id]) {
          options.push({
            host_id: user.id,
            exclude_user: user.id,
            content: {
              type: "Text",
              text: noResponseGenerator.generate(),
            },
          });
        }
      });

      startVote(
        sendJsonMessage,
        "Ranked",
        "Vote on the best three sentences:",
        options
      );
    }
  } else if (newState == HostUIState.VoteSentence) {
    if (Store.get(isVoteActive)) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + sentenceVoteDuration);
      timerRestart(expire, true);
      Store.set(hostVoteState, HostVoteState.Active);
    } else if (Store.get(hostVoteState) == HostVoteState.Active) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + sentenceVoteEndDuration);
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
      Store.set(hostVoteState, HostVoteState.None);
      const options = Store.get(voteOptions);
      const winningTopic = selectWinningVote(options);
      console.log("topic id: ", winningTopic.host_id);
      Data.topics()
        .then((topics) => {
          Store.set(
            hostGameTopic,
            topics.filter((t) => t.id == winningTopic.host_id)[0]
          );
          return Data.sentences();
        })
        .then((sentences) => {
          const generator = new SentenceGenerator(
            sentences[winningTopic.host_id]
          );
          const initialSentence = generator.generate();
          sendInitialSentence(
            sendJsonMessage,
            winningTopic.host_id,
            initialSentence
          );
        });
    }
  } else if (state == HostUIState.WriteSentence) {
    if (Store.get(hostPromptState) == HostPromptState.Active) {
      endPrompt(sendJsonMessage, Store.get(promptId) || "");
    }
  } else if (state == HostUIState.VoteSentence) {
    if (Store.get(hostVoteState) == HostVoteState.Active) {
      endVote(sendJsonMessage, Store.get(voteId) || "");
    } else if (Store.get(hostVoteState) == HostVoteState.Finished) {
      Store.set(hostVoteState, HostVoteState.None);
      const winningSentence = selectWinningVote(Store.get(voteOptions));
      console.log(
        "winning user: ",
        winningSentence.host_id,
        ", winning text: ",
        winningSentence.content.text
      );
      sendSentence(
        sendJsonMessage,
        winningSentence.content.text,
        winningSentence.host_id
      );
    }
  }
}

export function initWriteGameHandlers(
  sendJsonMessage: SendJsonMessage,
  timerRestart: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
) {
  MessageDispatcher.registerHandler<null>("wg/sentence", () => {
    Store.set(hostVoteState, HostVoteState.None);
    if (Store.get(hostUiState) == HostUIState.ChooseTopic) {
      Store.set(hostUiState, HostUIState.WriteSentence);
      startPrompt(
        sendJsonMessage,
        {
          type: "Text",
          minLength: 3,
          maxLength: 200,
        },
        "Enter the next sentence:"
      );
    } else if (Store.get(hostUiState) == HostUIState.WriteSentence) {
      Store.set(hostUiState, HostUIState.DisplayNewSentence);
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + sentenceDisplayDuration);
      timerRestart(expire, true);
    } else if (Store.get(hostUiState) == HostUIState.DisplayNewSentence) {
      const expire = new Date();
      expire.setSeconds(expire.getSeconds() + sentenceScoringDuration);
      timerRestart(expire, true);
      const scores = Store.get(hostUserScores);
      Store.get(voteUserVotes).forEach((userVote) => {
        const scoreObj = scores[userVote.user_id];
        let score = 0;
        userVote.votes.forEach((vote) => {
          if (vote.value == 1) {
            score += 1000;
          } else if (vote.value == 2) {
            score += 500;
          } else if (vote.value == 3) {
            score += 250;
          }
        });

        scoreObj.score += score;
        scoreObj.scoreAdded = score;
      });
      Store.set(hostUserScores, scores);
      Store.set(hostUiState, HostUIState.Scoring);
    } else if (Store.get(hostUiState) == HostUIState.Scoring) {
      if (Store.get(gameRoundCount) >= 5) {
        Store.set(hostUiState, HostUIState.DisplayFinalSentences);
      } else {
        Store.set(gameRoundCount, Store.get(gameRoundCount) + 1);
        Store.set(hostUiState, HostUIState.WriteSentence);
        startPrompt(
          sendJsonMessage,
          {
            type: "Text",
            minLength: 3,
            maxLength: 200,
          },
          "Enter the next sentence:"
        );
      }
    }
  });
}

function selectWinningVote(options: VoteOption[]) {
  const highestScore = options.reduce(
    (accum, v) => Math.max(accum, v.score),
    0
  );
  const candidates = options.filter((o) => o.score == highestScore);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function sendInitialSentence(
  sendJsonMessage: SendJsonMessage,
  topicId: string,
  sentence: string
) {
  MessageDispatcher.sendMessage(sendJsonMessage, "wg/sentence", {
    topic: topicId,
    sentence,
  });
}

function sendSentence(
  sendJsonMessage: SendJsonMessage,
  sentence: string,
  authorId: string
) {
  MessageDispatcher.sendMessage(sendJsonMessage, "wg/sentence", {
    sentence,
    sentence_author: authorId,
  });
}
