# 🌐 Sotrix Web Client

The official frontend single-page application (SPA) for **Sotrix** — built with React 19, Vite, TanStack Query v5, and Zustand.

---

## ⚡ Tech Stack & Highlights

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Server State**: [TanStack Query v5](https://tanstack.com/query/latest) (optimistic UI mutations, cursor-based infinite queries, cache-aside hydration)
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs/) (auth store, presence, notifications, interactive widgets)
- **Real-Time WebSockets**: [Socket.IO Client](https://socket.io/) (live chat, typing indicators, presence broadcasting)
- **Styling**: Vanilla CSS tokens & variables with responsive layouts and dark/light themes
- **Linter & Tooling**: [Oxlint](https://oxc.rs/) + TypeScript

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend REST API endpoint | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Backend Socket.IO server URL | `http://localhost:5000` |

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
The compiled output will be generated in `dist/`.

### 5. Lint
```bash
npm run lint
```
