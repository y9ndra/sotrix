# 🗺️ Sotrix Production-Grade Roadmap (Backend-Focused Full-Stack Path)

Welcome to the refined learning path for Sotrix. As a backend-focused full-stack developer, this roadmap is structured to prioritize high-performance backend architecture, caching, queues, security, database optimization, and DevOps, while providing a clean, simple, and functional React frontend to consume the APIs.

---

## 🟢 PHASE 1 — Foundation & Routing (Days 1–10)

### Day 1 [COMPLETED]
- Node.js Runtime & V8 Engine
- Express.js and TypeScript project initialization
- Folder architecture design for production
- React & Vite introduction

### Day 2 [COMPLETED]
- React Components, JSX, and Props
- Express routing structures and HTTP methods
- REST API design principles

### Day 3 [COMPLETED]
- React State (`useState`), event handling, and controlled inputs
- HTTP protocol, headers, request/response cycles
- REST resource structures

### Day 4 [COMPLETED]
- MongoDB, NoSQL concepts, and Mongoose Schema designs
- Database operations (CRUD)

### Day 5 [COMPLETED]
- Authentication vs. Authorization
- Password hashing (bcrypt)
- Data validation and environment variables
- JWT (JSON Web Tokens) structure & signature
- Authentication middleware and path protection on the backend


### Day 6 [COMPLETED]
- Frontend ↔ Backend Integration
- Axios client setup (request/response interceptors)
- Type-safe API Contracts & Client-side API layer
- Login & Signup components integration with backend
- JWT Token Storage (localStorage)
- Loading & Error states during form submission

### Day 7 [COMPLETED]
- React Router Configuration
- Client-side navigation & history control
- Protected Routes & Route Guards (frontend)
- Logout flow & cleanup

### Day 8 [COMPLETED]
- React Lifecycle & `useEffect` hook
- Fetching APIs automatically on component mount
- Loading and Error UI patterns for data fetching
- Fetching current user details (GET `/auth/me`), posts, and profile


### Day 9 [COMPLETED]
- Refactoring backend to MVC (Model-View-Controller) structure
- Separate controllers, route handlers, database services, and config files
- Clean code principles

### Day 10 [COMPLETED]
- Automated API testing concepts
- Comprehensive README documentation
- Git branching strategies & milestone review

---

## 🟡 PHASE 2 — Social Engine API (Days 11–20)
*Focus is on writing clean, REST-compliant endpoints on the backend and consuming them with simple React views.*

### Day 11 [COMPLETED]
- User profiles API (Fetching, editing details)
- Relational mapping in MongoDB for user metadata

### Day 12 [COMPLETED]
- User Profile Page Integration (Connecting profiles API to simple React views)
- Form submission for profile changes

### Day 13 [COMPLETED]
- Post schema design and CRUD APIs
- Storing posts with user references

### Day 14 [COMPLETED]
- Feed generation API
- Cursor-based vs. offset-based pagination concepts

### Day 15 [COMPLETED]
- Comments system: schema design, nested paths, and relational APIs

### Day 16 [COMPLETED]
- Likes system: toggle APIs & optimizing backend performance for simple operations

### Day 17 [COMPLETED]
- Follow/Unfollow relational schema and follower-following endpoints
- Generating personalized feeds based on followed users

### Day 18 [COMPLETED]
- MongoDB search optimization: text indexes, regex search patterns

### Day 19 [COMPLETED]
- Uploading files: multipart/form-data, Multer middleware, and storing media assets locally or on Cloudinary

### Day 20 [COMPLETED]
- Clean refactor, API documentation (Swagger/Postman collections), and Phase 2 review

---

## 🟠 PHASE 3 — Production Backend Architecture (Days 21–30)
*This is the core backend specialization phase. You will build high-scale, robust backend features.*

### Day 21 [COMPLETED]
- Redis integration for caching API responses (User profiles, static configurations)

### Day 22 [COMPLETED]
- Cache invalidation strategies, TTL (Time-To-Live) management, and cache-aside patterns

### Day 23 [COMPLETED]
- API security: rate limiting, CORS configuration, and security headers (Helmet)

### Day 24 [COMPLETED]
- Request payload schema validation on the backend using Zod (validating body, params, and query strings)

### Day 25 [COMPLETED]
- React State Optimization: understanding prop-drilling pain, introducing React Context or Zustand for clean, global auth token state management

### Day 26 [COMPLETED]
- TanStack Query (React Query) for simple, declarative data fetching, automatic caching, and cache sync on the frontend

### Day 27 [COMPLETED]
- Background job processing with BullMQ and Redis (Email queues, notifications)

### Day 28 [COMPLETED]
- Cron jobs and scheduled background scripts (database pruning, recalculating analytics)

### Day 29 [COMPLETED]
- Advanced Production Auth: refresh token rotation, token blacklist, sliding sessions

### Day 30 [COMPLETED]
- Backend unit and integration testing (Jest, Supertest)

---

## 🔵 PHASE 4 — Real-Time & Media Processing (Days 31–40)

### Day 31 [COMPLETED]
- WebSockets introduction & setting up Socket.IO in Express

### Day 32 [COMPLETED]
- Real-time notification service (Likes, comments, follows)

### Day 33 [COMPLETED]
- Frontend Feed Integration (TanStack Query, infinite scroll, optimistic likes, comment mutations, query-key architecture)

### Day 34 [COMPLETED]
- Chat features: private chat rooms, message persistence, online presence status, typing indicators

### Day 35 [COMPLETED]
- Advanced media pipeline: asynchronous uploads, processing jobs in queues

### Day 36
- Image processing (Sharp library) for compression, resizing, and generating thumbnails

### Day 37
- Text search optimization (Elasticsearch introduction or MongoDB Atlas Search)

### Day 38
- Performance testing: API profiling, identifying memory leaks in Node.js

### Day 39
- Load testing using K6 or Autocannon

### Day 40
- Refactoring, automated test suites execution, and Phase 4 review

---

## ⚫ PHASE 5 — DevOps, Cloud & SQL Migration (Days 41–50)

### Day 41
- Containerization: writing production Dockerfiles for Node.js and Vite React

### Day 42
- Multi-container orchestration using Docker Compose (Express app, MongoDB, Redis)

### Day 43
- NGINX setup as a reverse proxy, load balancer, and static files server

### Day 44
- SSL configurations, HTTPS redirection, and Let's Encrypt certificates

### Day 45
- CI/CD pipelines with GitHub Actions (Linting, running tests, automated building)

### Day 46
- Automated deployment to cloud providers (AWS EC2, DigitalOcean, or Render)

### Day 47
- Logging and Monitoring: Pino output logs, Prometheus metrics, and Grafana boards

### Day 48
- SQL migration concept: Introduction to PostgreSQL, writing relational schemas, comparing SQL vs. NoSQL

### Day 49
- Repository Pattern and Service Layer abstractions to decouple database layers

### Day 50
- Final code audit, security vulnerability scanning, and project completion

---

## 🎨 UI Design Checklist
*We will tackle these components and pages one by one, checking them off (`[x]`) as we proceed.*

### 🧱 Global & Design System Foundations
- [x] Global CSS Tokens & Themes
- [x] Global Layout Shell & Resets

### 📄 Pages
- [x] Homepage (Timeline Feed with Infinite Scroll)
- [x] Login Page
- [x] Signup Page
- [x] Explore Page
- [x] Profile Page (with User Posts tab)
- [x] Notifications Page
- [x] Search Page
- [ ] Direct Messages / Chat Page

### 🧩 Components
- [x] Navbar
- [x] Button
- [x] Input
- [x] PostCard
- [x] CreatePost
- [x] CommentList
- [x] CommentItem
- [x] CreateComment
- [x] UserCard
- [x] ProtectedRoute UI
- [x] AuthInitializer UI
- [ ] ChatRoom / MessageList
- [ ] ChatInput / TypingIndicator