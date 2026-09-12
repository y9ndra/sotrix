import client from "prom-client";

// Collect default Node.js system and process metrics (CPU, Memory, Event Loop, etc.)
client.collectDefaultMetrics({
  prefix: "sotrix_",
});

export const register = client.register;

/**
 * Counter tracking total HTTP requests received.
 * Labeled by HTTP method, route path, and status code.
 */
export const httpRequestsTotal = new client.Counter({
  name: "sotrix_http_requests_total",
  help: "Total number of HTTP requests made to Sotrix API",
  labelNames: ["method", "route", "status_code"],
});

/**
 * Histogram tracking HTTP request duration in seconds.
 * Provides granular p50, p95, p99 latency calculations.
 */
export const httpRequestDurationSeconds = new client.Histogram({
  name: "sotrix_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/**
 * Gauge tracking currently active in-flight requests.
 */
export const httpActiveRequests = new client.Gauge({
  name: "sotrix_http_active_requests",
  help: "Number of active in-flight HTTP requests",
  labelNames: ["method"],
});

/**
 * Counter tracking HTTP error responses (4xx and 5xx).
 */
export const httpErrorsTotal = new client.Counter({
  name: "sotrix_http_errors_total",
  help: "Total number of HTTP error responses returned",
  labelNames: ["method", "route", "status_code"],
});
