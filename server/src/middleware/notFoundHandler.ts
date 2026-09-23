import { Request, Response } from "express";

function renderNotFoundHtml(method: string, url: string): string {
  const sanitizedUrl = url.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sanitizedMethod = method.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Not Found</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #0a0a0a;
      border: 1px solid #1e1e1e;
      border-radius: 12px;
      padding: 32px 28px;
      max-width: 380px;
      width: 100%;
      text-align: center;
    }
    .status {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .title {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #f4f4f5;
    }
    .desc {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .route {
      font-family: monospace;
      font-size: 12px;
      color: #71717a;
      background: #030303;
      border: 1px solid #1e1e1e;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 20px;
      word-break: break-all;
    }
    .links {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    a {
      color: #10b981;
      font-size: 13px;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">404</div>
    <div class="title">endpoint not found</div>
    <div class="desc">The route you requested does not exist on this server.</div>
    <div class="route">${sanitizedMethod} ${sanitizedUrl}</div>
    <div class="links">
      <a href="/api-docs">api docs</a>
      <a href="/health">health</a>
    </div>
  </div>
</body>
</html>`;
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404);

  const acceptsHtml = req.accepts("html");

  if (acceptsHtml && !req.xhr && (!req.headers.accept || !req.headers.accept.includes("application/json"))) {
    res.type("html").send(renderNotFoundHtml(req.method, req.originalUrl));
    return;
  }

  res.json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
