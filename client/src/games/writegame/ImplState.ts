export type WriteGameUserType = "Leader" | "Player" | "Audience";

export interface WriteUserImplState {
  user_type: WriteGameUserType;
}

export interface WriteGameSentence {
  author: string | null;
  text: string;
}

export interface WriteGameImplState {
  topic: string;
  sentences: WriteGameSentence[];
}
