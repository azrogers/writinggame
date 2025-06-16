import { atom } from "jotai";
import type { Sentences, Topic } from "../games/writegame/Data";

export const developerModeEnabled = atom(false);
export const inDevState = atom(false);

export const topics = atom<Topic[]>([]);
export const sentences = atom<Sentences>({});
export const selectedTopic = atom<number>(-1);
export const selectedSentence = atom<number>(-1);
