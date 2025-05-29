import log, { type LoggingMethod } from "loglevel";

export type Logger = log.Logger & {
  assert: (condition: boolean, ...args: any[]) => void;
};

export class LogFactory {
  static create(namespace: string): Logger {
    const logger = log.getLogger(namespace);
    logger.setLevel("DEBUG");
    const originalFactory = logger.methodFactory;
    logger.methodFactory = function (
      methodName,
      logLevel,
      loggerName
    ): LoggingMethod {
      const rawMethod = originalFactory(methodName, logLevel, loggerName);

      return function (...args: any[]) {
        const messages = [`[${namespace}] `].concat(args);
        rawMethod(...messages);
      };
    };

    logger.setLevel(logger.getLevel());
    const assertLogger = logger as Logger;
    assertLogger.assert = (condition: boolean, ...args: any[]): void => {
      if (!condition) {
        logger.error("Assertion failed: ", args);
      }
    };
    return assertLogger;
  }
}

export class LoggedError extends Error {
  constructor(logger: Logger, message: string) {
    logger.error("Thrown error: " + message);
    super(message);
  }
}
