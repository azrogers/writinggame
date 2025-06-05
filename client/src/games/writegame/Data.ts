import { JsonLoader } from "../../data/JsonLoader";
import type { SentenceTemplates } from "../../data/SentenceGenerator";

const SENTENCES_FILE = "writers/sentences.json";
const TOPICS_FILE = "writers/topics.json";

export interface Topic {
  id: string;
  name: string;
  layout: "paragraph" | "title" | "verse";
}

export interface Topics {
  topics: Topic[];
}

export type Sentences = { [topic: string]: SentenceTemplates };

export class Data {
  static preload() {
    JsonLoader.preload(SENTENCES_FILE);
    JsonLoader.preload(TOPICS_FILE);
  }

  static topics(): Promise<Topic[]> {
    return JsonLoader.load(TOPICS_FILE).then((t) => {
      return (t as Topics).topics;
    });
  }

  static sentences(): Promise<Sentences> {
    return JsonLoader.load(SENTENCES_FILE).then((s) => {
      return s as Sentences;
    });
  }

  static assertSentences(): Sentences {
    return JsonLoader.assertLoaded(SENTENCES_FILE) as Sentences;
  }
}
