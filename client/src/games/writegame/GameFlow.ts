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
  roundCount,
  sentenceDisplayDuration,
  sentenceScoringDuration,
  sentenceTtsWaitDuration,
  sentenceVoteDuration,
  sentenceVoteEndDuration,
  sentenceWinnerDuration,
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
import {
  endGame,
  gameId,
  gameImplState,
  gameRoundCount,
  gameUsers,
} from "../../state/GameState";
import type { WriteGameImplState, WriteUserImplState } from "./ImplState";
import { TtsLoader } from "../../data/TtsLoader";

export enum HostUIState {
  None,
  ChooseTopic,
  WriteSentence,
  WriteSentenceTransition,
  VoteSentence,
  DisplayNewSentence,
  Scoring,
  DisplayFinalSentences,
  AwardWinner,
  Ended,
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
      const topicsCopy = [...topics];
      const selectedTopics = [];
      for (let i = 0; i < 3; i++) {
        const topic = topicsCopy.splice(
          Math.floor(topicsCopy.length * Math.random()),
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
      Store.set(hostUiState, HostUIState.WriteSentenceTransition);
    }
  } else if (newState == HostUIState.WriteSentenceTransition) {
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
    Store.set(hostUiState, HostUIState.VoteSentence);
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
  } else if (newState == HostUIState.DisplayNewSentence) {
    const expire = new Date();
    expire.setSeconds(expire.getSeconds() + sentenceDisplayDuration);
    timerRestart(expire, true);
  } else if (newState == HostUIState.Scoring) {
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
  } else if (newState == HostUIState.DisplayFinalSentences) {
    const implState = Store.get(gameImplState) as WriteGameImplState;
    const text = implState.sentences.map((s) => s.text).join(" ");
    TtsLoader.generate(text, Math.floor(Math.random() * 900)).then((audio) => {
      Store.set(hostUiState, HostUIState.DisplayFinalSentences);
      TtsLoader.play(audio).then(() => {
        const expire = new Date();
        expire.setSeconds(expire.getSeconds() + sentenceTtsWaitDuration);
        timerRestart(expire, true);
      });
    });
  } else if (newState == HostUIState.AwardWinner) {
    const expire = new Date();
    expire.setSeconds(expire.getSeconds() + sentenceWinnerDuration);
    timerRestart(expire, true);
  } else if (newState == HostUIState.Ended) {
    endGame(sendJsonMessage);
    Store.set(hostUiState, HostUIState.None);
    Store.set(isHosting, false);
    Store.set(gameId, null);
  }
}

export function onTimerExpire(
  sendJsonMessage: SendJsonMessage,
  state: HostUIState
): boolean {
  if (!Store.get(isHosting)) {
    return false;
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
  } else if (Store.get(hostUiState) == HostUIState.DisplayNewSentence) {
    Store.set(hostUiState, HostUIState.Scoring);
  } else if (Store.get(hostUiState) == HostUIState.Scoring) {
    if (Store.get(gameRoundCount) >= roundCount) {
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
  } else if (Store.get(hostUiState) == HostUIState.DisplayFinalSentences) {
    Store.set(hostUiState, HostUIState.AwardWinner);
  } else if (Store.get(hostUiState) == HostUIState.AwardWinner) {
    Store.set(hostUiState, HostUIState.Ended);
  }
  return false;
}

export function initWriteGameHandlers(sendJsonMessage: SendJsonMessage) {
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
    } else if (Store.get(hostUiState) == HostUIState.VoteSentence) {
      Store.set(hostUiState, HostUIState.DisplayNewSentence);
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
  if (!/[.,:!?]$/.test(sentence)) {
    sentence = sentence + ".";
  }
  MessageDispatcher.sendMessage(sendJsonMessage, "wg/sentence", {
    sentence,
    sentence_author: authorId,
  });
}
