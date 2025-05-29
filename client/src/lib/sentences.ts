import { LogFactory, type Logger } from "./logger";

const logger: Logger = LogFactory.create("SentenceGenerator");

export interface TopicSentences {
  dictionaries: { [name: string]: string[] };
  templates: string[];
}

export type Sentences = { [topic: string]: TopicSentences };

export class SentenceGenerator {
  private _dictionaries: { [name: string]: string[] };
  private _templates: string[];

  constructor(sentences: TopicSentences) {
    this._dictionaries = sentences.dictionaries;
    this._templates = sentences.templates;
  }

  generate(): string {
    return this.evaluate(this.selectRandom(this._templates));
  }

  private evaluate(template: string): string {
    return template.replace(
      /\{(.+?)\}/g,
      (match: string, p1: string): string => {
        if (p1.startsWith(".")) {
          const operation = p1.substring(1);
          if (operation == "year") {
            return new Date().getFullYear().toString();
          } else {
            logger.warn(`Unknown operation ${operation}`);
          }
        } else if (p1.startsWith("#")) {
          const parts = p1.substring(1).split("|");
          logger.assert(
            parts.length == 2,
            "rand template must be in the format {#template|range}"
          );
          const rangeParts = parts[1].split("-");
          logger.assert(
            rangeParts.length == 2,
            "rand template range must be two values"
          );
          const range = [Number(rangeParts[0]), Number(rangeParts[1])];
          logger.assert(
            !Number.isNaN(range[0]) && !Number.isNaN(range[1]),
            "rand template range must be two numbers"
          );
          logger.assert(
            parts[0].indexOf("X") !== -1,
            "rand template must include 'X' for substitution location"
          );
          const randNum = Math.floor(
            Math.random() * (range[1] - range[0]) + range[0]
          );
          return parts[0].replace(/X+/, randNum.toString());
        } else if (this._dictionaries[p1]) {
          return this.evaluate(this.selectRandom(this._dictionaries[p1]));
        }

        logger.error(`dictionary ${p1} not found`);
        return match;
      }
    );
  }

  private selectRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
