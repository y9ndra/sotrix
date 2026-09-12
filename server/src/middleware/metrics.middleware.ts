import { Request, Response, NextFunction } from "express";
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpActiveRequests,
  httpErrorsTotal,
} from "../config/metrics";

/**
 * Normalizes dynamic path parameters (such as MongoDB ObjectId or UUIDs)
 * into parameterized path tokens to prevent high cardinality in Prometheus.
 */
function normalizePath(req: Request): string {
  if (req.route?.path) {
    if (Array.isArray(req.route.path)) {
      const match = req.route.path.find((p: string) => p === req.path);
      return `${req.baseUrl || ""}${match || req.route.path[0]}`;
    }
    return `${req.baseUrl || ""}${req.route.path}`;
  }

  const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;

  return rawPath
    // Replace MongoDB 24-character hexadecimal ObjectIds
    .replace(/\b[0-9a-fA-F]{24}\b/g, ":id")
    // Replace standard UUIDs
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, ":id")
    // Replace numeric IDs in path segments
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Do not record metrics scrape endpoint itself
  if (req.path === "/metrics") {
    next();
    return;
  }

  const startTime = process.hrtime.bigint();
  const method = req.method;

  httpActiveRequests.inc({ method });

  res.on("finish", () => {
    httpActiveRequests.dec({ method });

    const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
    const route = normalizePath(req) || "unknown";
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc({
        method,
        route,
        status_code: statusCode,
      });
    }
  });

  next();
};

export default metricsMiddleware;
