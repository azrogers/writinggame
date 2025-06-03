import { LogFactory, type Logger } from "../lib/logger";

const logger: Logger = LogFactory.create("SentenceGenerator");

export interface SentenceTemplates {
  dictionaries: { [name: string]: string[] };
  templates: string[];
}

type WeightedText = {
  text: string;
  weight: number;
};

export class SentenceGenerator {
  private _dictionaries: { [name: string]: WeightedText[] };
  private _templates: WeightedText[];

  constructor(sentences: SentenceTemplates) {
    this._dictionaries = {};
    Object.keys(sentences.dictionaries).forEach((id) => {
      this._dictionaries[id] = sentences.dictionaries[id].map(this.parseWeight);
    });
    this._templates = sentences.templates.map(this.parseWeight);
  }

  generate(): string {
    return this.evaluate(this.selectWeightedRandom(this._templates));
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
          return parts[Math.floor(Math.random() * parts.length)];
        } else if (p1.indexOf(",") != -1) {
          const parts = p1.split(",");
          const combinedDict = parts.map((p) => this._dictionaries[p]).flat();
          return this.evaluate(this.selectWeightedRandom(combinedDict));
        } else if (this._dictionaries[p1]) {
          return this.evaluate(
            this.selectWeightedRandom(this._dictionaries[p1])
          );
        }

        logger.error(`dictionary ${p1} not found`);
        return match;
      }
    );
  }

  private selectWeightedRandom(arr: WeightedText[]): string {
    const sum = arr.reduce((partialSum, a) => partialSum + a.weight, 0);
    let target = Math.random() * sum;
    for (let i = 0; i < arr.length; i++) {
      target -= arr[i].weight;
      if (target <= 0) {
        return arr[i].text;
      }
    }
    logger.error(`weighted random failed`);
    return "";
  }

  private parseWeight(str: string): WeightedText {
    const groups = /^\{%(.+?)\}/.exec(str);
    if (!groups) {
      return {
        text: str,
        weight: 1.0,
      };
    }

    return {
      text: str.substring(groups[0].length),
      weight: Number(groups[1]),
    };
  }
}
