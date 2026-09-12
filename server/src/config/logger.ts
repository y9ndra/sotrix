import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const defaultLevel = isTest ? "silent" : isProduction ? "info" : "debug";

export const logger = pino({
  level: process.env.LOG_LEVEL || defaultLevel,
  redact: {
    paths: [
      "password",
      "token",
      "refreshToken",
      "secret",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    !isProduction && !isTest
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export default logger;
