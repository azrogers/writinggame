import { IconsManager } from "../data/IconsManager";
import {
  HostUIState,
  hostUiState,
  hostUserScores,
  type HostUserScore,
} from "../games/writegame/GameFlow";
import { GlobalGameState, globalGameState, isHosting } from "../state/AppState";
import {
  gameRoundCount,
  gameType,
  gameUsers,
  type GameUserState,
} from "../state/GameState";
import { Store } from "../state/Store";
import { userId } from "../state/UserState";
import {
  HostVoteState,
  hostVoteState,
  isVoteActive,
  voteId,
  voteOptions,
  voteTitle,
  voteType,
  voteUserVotes,
  type UserVote,
  type UserVotes,
  type VoteOption,
} from "../state/VoteState";
import { inDevState } from "./DeveloperMode";

export type DevStates = "vote_client" | "vote_host" | "scoring" | "winner";

export function setDevState(state: DevStates) {
  Store.set(inDevState, true);
  IconsManager.reset();
  Store.set(gameType, "WriteGame");
  const users: GameUserState[] = [];
  for (let i = 0; i < 5; i++) {
    users.push({
      id: `user${i}`,
      name: `User ${i}`,
      impl_state: {
        user_type: i == 0 ? "Leader" : "Player",
      },
      icon_id: IconsManager.getOrAssignIcon(`user${i}`),
    });
  }
  Store.set(gameUsers, users);
  Store.set(userId, "user0");

  if (state == "vote_client" || state == "vote_host") {
    Store.set(globalGameState, GlobalGameState.Game);
    Store.set(isHosting, state == "vote_host");
    Store.set(hostUiState, HostUIState.VoteSentence);
    Store.set(
      hostVoteState,
      state == "vote_host" ? HostVoteState.Finished : HostVoteState.Active
    );
    Store.set(isVoteActive, true);
    Store.set(voteId, "testVoteId");
    Store.set(voteTitle, "Test Vote Title");
    const options: VoteOption[] = [];
    for (let i = 0; i < 5; i++) {
      options.push({
        id: `option${i}`,
        host_id: `user${i}`,
        exclude_user: `user${i}`,
        score: 0,
        content: {
          type: "Text",
          text: `Option ${i + 1}`,
        },
      });
    }
    Store.set(voteOptions, options);
    Store.set(voteType, "Ranked");

    if (state == "vote_host") {
      const userVotes: UserVotes[] = [];
      for (let i = 0; i < 5; i++) {
        const votes: UserVote[] = [];
        const options = [0, 1, 2, 3, 4];
        for (let i = 0; i < 3; i++) {
          const optionId = options.splice(
            Math.floor(Math.random() * options.length),
            1
          )[0];
          votes.push({
            option_id: `option${optionId}`,
            value: i + 1,
          });
        }
        userVotes.push({ user_id: `user${i}`, votes });
      }
      Store.set(voteUserVotes, userVotes);
    }
  } else if (state == "scoring") {
    Store.set(globalGameState, GlobalGameState.Game);
    Store.set(hostUiState, HostUIState.Scoring);
    Store.set(isHosting, true);
    Store.set(gameRoundCount, 3);
    const scores: { [id: string]: HostUserScore } = {};
    users.forEach((u) => {
      scores[u.id] = {
        userId: u.id,
        score: 1000 + Math.floor(Math.random() * 5) * 1000,
        scoreAdded: Math.floor(Math.random() * 750) + 250,
      };
    });
    Store.set(hostUserScores, scores);
  } else if (state == "winner") {
    Store.set(globalGameState, GlobalGameState.Game);
    Store.set(isHosting, true);
    Store.set(hostUiState, HostUIState.AwardWinner);
    const scores: { [id: string]: HostUserScore } = {};
    users.forEach((u) => {
      scores[u.id] = {
        userId: u.id,
        score: 1000 + Math.floor(Math.random() * 5) * 1000,
        scoreAdded: Math.floor(Math.random() * 750) + 250,
      };
    });
    Store.set(hostUserScores, scores);
  }
}
