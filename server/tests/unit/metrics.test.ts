import request from "supertest";
import app from "../../src/app";
import { register } from "../../src/config/metrics";

describe("Prometheus Metrics & Instrumentation", () => {
  it("should expose GET /metrics with prometheus formatted content", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("sotrix_");
    expect(res.text).toContain("sotrix_http_requests_total");
    expect(res.text).toContain("sotrix_http_request_duration_seconds");
  });

  it("should record HTTP request metrics when hitting an endpoint", async () => {
    // Send a request to an endpoint
    const healthRes = await request(app).get("/health");
    expect(healthRes.status).toBe(200);

    // Fetch metrics output
    const metricsRes = await request(app).get("/metrics");
    expect(metricsRes.status).toBe(200);

    // Verify counter incremented for /health
    expect(metricsRes.text).toMatch(
      /sotrix_http_requests_total\{method="GET",route="\/health",status_code="200"\}\s+[1-9]\d*/
    );
  });

  it("should track 404 errors in httpErrorsTotal and httpRequestsTotal", async () => {
    const notFoundRes = await request(app).get("/api/non-existent-route-for-testing");
    expect(notFoundRes.status).toBe(404);

    const metricsRes = await request(app).get("/metrics");
    expect(metricsRes.status).toBe(200);

    expect(metricsRes.text).toContain("sotrix_http_errors_total");
    expect(metricsRes.text).toMatch(
      /sotrix_http_errors_total\{method="GET",route=".*",status_code="404"\}\s+[1-9]\d*/
    );
  });
});
