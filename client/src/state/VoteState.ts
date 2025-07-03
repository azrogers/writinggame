import { atom } from "jotai";
import { MessageDispatcher } from "../MessageDispatcher";
import { Store } from "./Store";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { isHosting } from "./AppState";
import Sound from "../Sound";

export type VoteType = "Single" | "Ranked";

export type VoteOptionContent = {
  type: "Text";
  text: string;
};

export interface VoteOption {
  id: string;
  host_id: string;
  exclude_user: string | null;
  score: number;
  content: VoteOptionContent;
}

export const isVoteActive = atom<boolean>(false);
export const voteId = atom<string | null>(null);
export const voteTitle = atom<string | null>(null);
export const voteType = atom<VoteType>("Single");
export const voteOptions = atom<VoteOption[]>([]);

export const voteOptionSelectedCount = atom<number>(0);
export const voteOptionsSelected = atom<{ [id: string]: boolean }>({});

export enum HostVoteState {
  None,
  Active,
  Finished,
}

export const hostVoteState = atom<HostVoteState>(HostVoteState.None);

export interface UserVote {
  option_id: string;
  value: number;
}

export interface UserVotes {
  user_id: string;
  votes: UserVote[];
}

export const voteUserVotes = atom<UserVotes[]>([]);
export const voteUserVoteCounts = atom<{ [id: string]: number }>({});

interface VoteStartResponse {
  id: string;
  title: string;
  vote_type: VoteType;
  options: VoteOption[];
  user_vote_counts: { [id: string]: number };
}

interface VoteCastResponse {
  id: string;
  votes: UserVotes[];
}

interface VoteEndOption {
  option: VoteOption;
  score: number;
}

interface VoteEndResponse {
  vote_id: string;
  options: VoteEndOption[];
  votes: UserVotes[];
}

export function initVoteHandlers() {
  MessageDispatcher.registerHandler<VoteStartResponse>(
    "vote/start",
    (payload) => {
      Store.set(voteOptionSelectedCount, 0);
      Store.set(voteOptionsSelected, {});
      Store.set(voteId, payload.id);
      Store.set(voteTitle, payload.title);
      Store.set(voteType, payload.vote_type);
      Store.set(voteOptions, payload.options);
      Store.set(voteUserVotes, []);
      Store.set(isVoteActive, true);
      Store.set(hostVoteState, HostVoteState.None);
      Store.set(voteUserVoteCounts, payload.user_vote_counts);
    }
  );

  MessageDispatcher.registerHandler<VoteCastResponse>(
    "vote/cast",
    (payload) => {
			Store.set(voteUserVotes, payload.votes);
			if (Store.get(isHosting))
			{
				Sound.sfxPlay("submit");
			}
    }
  );

  MessageDispatcher.registerHandler<VoteEndResponse | null>(
    "vote/end",
    (payload) => {
      if (payload) {
        const options = payload.options.map((option) => {
          const opt = option.option as VoteOption;
          opt.score = option.score;
          return opt;
        });
        Store.set(voteOptions, options);
        Store.set(voteUserVotes, payload.votes);
      }

      Store.set(isVoteActive, false);
    }
  );
}

export type VoteStartOptionContent = {
  type: "Text";
  text: string;
};

export interface VoteStartOption {
  host_id: string;
  exclude_user: string | null;
  content: VoteStartOptionContent;
}

export function startVote(
  sendJsonMessage: SendJsonMessage,
  type: VoteType,
  title: string,
  options: VoteStartOption[]
) {
  Store.set(voteUserVotes, []);
  MessageDispatcher.sendMessage(sendJsonMessage, "vote/start", {
    vote_type: type,
    title: title,
    options: options,
  });
}

export function castVote(
  sendJsonMessage: SendJsonMessage,
  voteId: string,
  optionId: string
) {
  Store.set(voteOptionSelectedCount, Store.get(voteOptionSelectedCount) + 1);
  const selected = Store.get(voteOptionsSelected);
  selected[optionId] = true;
  Store.set(voteOptionsSelected, selected);
  MessageDispatcher.sendMessage(sendJsonMessage, "vote/cast", {
    vote_id: voteId,
    option_id: optionId,
  });
}

export function endVote(sendJsonMessage: SendJsonMessage, voteId: string) {
  MessageDispatcher.sendMessage(sendJsonMessage, "vote/end", {
    vote_id: voteId,
  });
}
