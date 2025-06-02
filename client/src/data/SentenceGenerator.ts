import { LogFactory, type Logger } from "../lib/logger";

const logger: Logger = LogFactory.create("SentenceGenerator");

export interface SentenceTemplates {
  dictionaries: { [name: string]: string[] };
  templates: string[];
}

export class SentenceGenerator {
  private _dictionaries: { [name: string]: string[] };
  private _templates: string[];

  constructor(sentences: SentenceTemplates) {
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
        } else if (p1.startsWith("^")) {
          const parts = p1.substring(1).split(",");
          return this.selectRandom(parts);
        } else if (p1.indexOf(",") != -1) {
          const parts = p1.split(",");
          const totalLen = parts
            .map((p) => this._dictionaries[p].length)
            .reduce((partialSum, a) => partialSum + a, 0);
          let index = Math.floor(Math.random() * totalLen);
          for (let i = 0; i < parts.length; i++) {
            const dictionary = this._dictionaries[i];
            if (index >= dictionary.length) {
              index -= dictionary.length;
            } else {
              return this.evaluate(dictionary[index]);
            }
          }

          logger.error(`failed to find item for ${p1} - this shouldn't happen`);
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
