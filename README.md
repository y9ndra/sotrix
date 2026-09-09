<!-- ================================================================= -->
<!-- PROJECT HEADER & BRANDING                                       -->
<!-- ================================================================= -->
<div align="center">

  <!-- Logo placeholder: replace src with your logo path if needed -->
  <a href="https://github.com/y9ndra/sotrix">
    <img src="web/public/favicon.svg" alt="Sotrix Logo" width="88" height="88" />
  </a>

  <h1 align="center">Sotrix</h1>

  <p align="center">
    Full-stack social networking platform and real-time messaging application.
  </p>

  <p align="center">
    Built with TypeScript, Node.js, Express, React 19, MongoDB Atlas, Redis, BullMQ, and Socket.IO.
  </p>

  <p align="center">
    <a href="https://github.com/y9ndra/sotrix/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/y9ndra/sotrix/ci.yml?branch=main&label=CI%20Build&logo=githubactions&logoColor=white&style=flat-square" alt="CI Status" />
    </a>
    <a href="https://github.com/y9ndra/sotrix/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" />
    </a>
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=nodedotjs&logoColor=white&style=flat-square" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square" alt="React 19" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=flat-square" alt="Docker Ready" />
    <img src="https://img.shields.io/badge/API%20Docs-Swagger-85EA2D?logo=swagger&logoColor=black&style=flat-square" alt="Swagger" />
  </p>

</div>

<!-- Project Banner Placeholder: Replace with your custom banner (e.g. assets/banner.png or URL) -->
<p align="center">
  <img src="https://raw.githubusercontent.com/y9ndra/sotrix/main/web/src/assets/hero.png" alt="Sotrix Banner" width="100%" style="border-radius: 8px; max-height: 380px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Core Resource Modules](#core-resource-modules)
- [Real-Time Communication](#real-time-communication)
- [Background Workers & Queues](#background-workers--queues)
- [Quickstart & Local Development](#quickstart--local-development)
  - [Option A: Docker Compose](#option-a-docker-compose-recommended)
  - [Option B: Manual Setup](#option-b-manual-setup)
- [Testing](#testing)
- [Security](#security)
- [Production Cloud Deployment](#production-cloud-deployment)
- [License & Author](#license--author)

---

## Overview

Sotrix is a full-stack social web platform engineered for real-time messaging, asynchronous media processing, and high-throughput content feeds. 

The application is structured into clearly separated layers: an Express REST and WebSocket gateway, background worker processes managed by BullMQ and Redis, MongoDB Atlas for persistence, and a React 19 single-page application built on Vite and TanStack Query.

<!-- Screenshot Showcase Placeholder: Replace with actual UI screenshots or demo GIF -->
<details open>
  <summary><strong>Interface Preview (Click to toggle)</strong></summary>
  <br />
  <p align="center">
    <img src="https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1000&auto=format&fit=crop" alt="Feed Interface Preview" width="48%" style="border-radius: 8px; margin-right: 2%;" />
    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" alt="Messaging Preview" width="48%" style="border-radius: 8px;" />
  </p>
</details>

---

## Key Features

### Authentication & Sessions
- Dual-token setup: short-lived 15-minute access tokens with 7-day rotating refresh tokens stored in HttpOnly, secure cookies.
- Cryptographic password hashing using bcrypt with 10 salt rounds.
- Strict token invalidation and session cleanup on logout.

### Real-Time Messaging & Presence
- One-on-one private chat rooms backed by MongoDB conversation history.
- Real-time peer typing indicators and online/offline status broadcast over Socket.IO.
- Instant in-app push alerts for likes, comments, and new followers.

### Media Pipeline
- Asynchronous image processing via BullMQ and Redis queues.
- Image transformation using Sharp: EXIF metadata stripping, WebP compression, and automated thumbnail creation.
- Cloudinary integration for scalable cloud asset storage and delivery.

### Feeds & Caching
- Chronological timeline feed of followed creators alongside an explore discovery feed.
- Cursor-based pagination on posts and comments to avoid slow offset queries at scale.
- Redis cache-aside implementation with TTL invalidation for user profiles and frequent queries.
- Compound MongoDB text indexes for handle and post search.

### Frontend Architecture
- Built with React 19, Vite, and React Router v7.
- TanStack Query v5 manages server state, optimistic updates, and background cache synchronization.
- Zustand handles global client authentication state.
- Custom responsive dark-mode styling with CSS variables.

### Security
- Runtime payload validation using Zod schemas across body, query, and params.
- Tiered rate limiting with express-rate-limit to protect auth routes from brute-force attempts.
- Helmet security headers and configurable CORS multi-origin filtering.

---

## Tech Stack

- **Backend**: Node.js 22 LTS, Express.js, TypeScript, Zod
- **Frontend**: React 19, Vite, TanStack Query v5, Zustand, React Router v7
- **Database & Cache**: MongoDB Atlas (Mongoose), Redis (Upstash)
- **Queues & Real-Time**: BullMQ, Socket.IO
- **Media Processing**: Sharp, Multer, Cloudinary
- **Testing & Tooling**: Jest, Supertest, Oxlint, Swagger
- **DevOps**: Docker, Docker Compose, NGINX, GitHub Actions CI

---

## Core Resource Modules

| Module | Base Path | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Registration, login, refresh token rotation, session profile, and logout |
| **Users** | `/api/users` | Profile retrieval, user search, profile updates, and follow/unfollow toggle |
| **Posts** | `/api/posts` | Post publishing (with multipart upload), user posts, search, updates, deletion |
| **Feed & Explore** | `/api/feed`, `/api/explore` | Following feed, discovery feed, and creator recommendations |
| **Comments** | `/api/posts/:id/comments` | Threaded comments creation, pagination, updates, and deletion |
| **Likes** | `/api/posts/:id/like` | Post like toggle |
| **Conversations**| `/api/conversations` | Private 1-on-1 chat initialization, inbox listing, and paginated message history |
| **Notifications**| `/api/notifications` | User notification lists, unread counters, and mark-as-read endpoints |
| **Health** | `/health`, `/api/health` | Container liveness and health probes |

---

## Real-Time Communication

Real-time functionality is powered by Socket.IO with handshake JWT verification:

- **Direct Chat**: Users connect to private conversation rooms to exchange instant messages with persistent database storage.
- **Typing Status**: Lightweight broadcast signals update peers when someone is typing.
- **Online Presence**: Socket connection and disconnection lifecycle events update online/offline indicators in real time.
- **In-App Notifications**: Likes, comments, and follows trigger immediate push alerts without requiring page reloads or polling.

---

## Background Workers & Queues

Resource-intensive and non-blocking tasks run through Redis-backed **BullMQ** queues:

- **Media Queue**: Handles background image resizing, progressive WebP conversion, thumbnail generation via Sharp, and Cloudinary upload.
- **Notification Queue**: Handles notification creation and real-time delivery fan-out without adding latency to the main HTTP request.
- **Maintenance Queue**: Runs scheduled cron jobs via `node-cron` to prune expired tokens and purge temporary files.

---

## Quickstart & Local Development

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm or yarn / pnpm
- Docker & Docker Compose (optional, for containerized run)
- Running Redis instance (local or free cloud [Upstash](https://upstash.com/))
- MongoDB database (local or free [MongoDB Atlas](https://www.mongodb.com/atlas))

---

### Option A: Docker Compose (Recommended)

Start the entire stack with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/y9ndra/sotrix.git
cd sotrix

# 2. Configure server environment variables
cp server/.env.example server/.env
# Edit server/.env with your DATABASE_URL, JWT_SECRET, and Cloudinary keys

# 3. Build and launch all services
docker compose up --build
```

- **Frontend Client**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Swagger Docs**: `http://localhost:5000/api-docs`

---

### Option B: Manual Setup

#### 1. Backend Server
```bash
cd server
npm install
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, and REDIS_URL

# Start API server in development mode
npm run dev
```

#### 2. Background Worker (Optional locally)
In a separate terminal:
```bash
cd server
npm run worker
```

#### 3. Frontend Client
In a third terminal:
```bash
cd web
npm install
npm run dev
```

The web client runs on `http://localhost:5173`.

---


## Testing

```bash
# Run all server tests (Jest with in-memory MongoDB)
cd server
npm test

# Run isolated unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Compile TypeScript
npm run build

# Run frontend Oxlint linter
cd ../web
npm run lint
```

Every push and pull request to `main` runs through the GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

---

## Security

- **Cross-Site Cookie Protection**: In production, cookies enforce `SameSite=None`, `Secure=true`, and `HttpOnly=true` so cross-origin authentication works safely between separated domains.
- **Input Sanitization**: Request bodies, route parameters, and query arguments are parsed and validated with Zod before reaching business logic.
- **Brute-Force Rate Limiting**: Global rate limits paired with stricter limits on `/api/auth/*` routes.
- **Container Host Binding**: Production containers explicitly bind to `0.0.0.0` for reliable container networking.

---

## Production Cloud Deployment

Sotrix is ready for zero-cost cloud deployment across free-tier providers:

- **Frontend**: Hosted on **Vercel** with automatic SPA rewrites (`vercel.json`).
- **Backend API**: Hosted on **Render** as a Dockerized web service (`server/Dockerfile`).
- **Database**: **MongoDB Atlas** M0 shared cluster.
- **Redis & Queues**: **Upstash** serverless Redis.
- **Media CDN**: **Cloudinary** free tier.

---

## License & Author

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

Developed by **[Yugendhra (y9ndra)](https://github.com/y9ndra)**.
