export type WriteGameUserType = "Leader" | "Player" | "Audience";

export interface WriteUserImplState {
  user_type: WriteGameUserType;
}

export type WriteGameRoundState =
  | "Intro"
  | "Writing"
  | "Voting"
  | "Intermission"
  | "Reading"
  | "Outro";

export interface WriteGameImplState {
  topic: string;
  sentences: string[];
  round_state: WriteGameRoundState;
}
