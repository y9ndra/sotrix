# Sotrix 🚀

Sotrix is a modern, production-grade full-stack social media web application built with TypeScript, Node.js, Express, MongoDB, and React.

---

## 📖 Table of Contents
- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture & Layered Structure](#architecture--layered-structure)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Installation & Running Locally](#installation--running-locally)
- [API Documentation](#api-documentation)
  - [1. Register User (`POST /api/auth/signup`)](#1-register-user-post-apiauthsignup)
  - [2. Authenticate User (`POST /api/auth/login`)](#2-authenticate-user-post-apiauthlogin)
  - [3. Get Current User Profile (`GET /api/auth/me`)](#3-get-current-user-profile-get-apiauthme)
- [Authentication Flow](#authentication-flow)
- [Future Features](#future-features)

---

## 🧐 About

Sotrix is engineered using an enterprise **Route ➔ Middleware ➔ Controller ➔ Service ➔ Model** backend architecture. It provides robust authentication, strict separation of concerns, environment validation, centralized error handling, and clean TypeScript typings across client and server.

---

## ✨ Features

- **Decoupled Architecture**: Clean separation between HTTP presentation (Controllers), core business logic (Services), and database interactions (Models).
- **Secure Password Hashing**: Passwords are securely hashed using `bcrypt` (salt factor 10) before persistence.
- **JWT Authentication**: Stateless authentication utilizing JSON Web Tokens with strict authorization header checks.
- **Centralized Error Handling**: Unified Express error middleware using type-safe `error instanceof Error` narrowing.
- **Environment Security**: Strict environment variable loading with immediate crash safety on missing critical configuration (`JWT_SECRET`).
- **Responsive React Client**: Type-safe React + Vite frontend with persistent state, token management, and auto-redirects.

---

## 🛠 Tech Stack

### Backend (`/server`)
- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ORM
- **Authentication & Security**: JSON Web Tokens (`jsonwebtoken`), `bcrypt`
- **Environment**: `dotenv`

### Frontend (`/web`)
- **Framework**: React 19, Vite, TypeScript
- **Routing**: React Router v6
- **HTTP Client**: Axios with Request & Response Interceptors

---

## 🏗 Architecture & Layered Structure

Each request passes through a strict 5-layer pipeline:

```text
Request
   ↓
Route Handler       (Traffic Director: Maps HTTP verbs & paths to Controllers)
   ↓
Middleware          (Authentication & Request validation)
   ↓
Controller          (HTTP Layer: req/res processing, status codes)
   ↓
Service             (Business Logic: bcrypt hashing, JWT signing, DB operations)
   ↓
Model               (Mongoose Schema & MongoDB persistence)
   ↓
MongoDB Atlas
```

---

## 📁 Project Structure

```text
sotrix/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts               # Database connection setup
│   │   │   └── env.ts              # Environment variable loader & safety checks
│   │   ├── controllers/
│   │   │   └── auth.controller.ts  # HTTP Request/Response handling
│   │   ├── services/
│   │   │   └── auth.service.ts     # Core business logic (bcrypt, JWT, DB calls)
│   │   ├── models/
│   │   │   └── user.model.ts       # User schema & document interfaces
│   │   ├── routes/
│   │   │   └── auth.routes.ts      # Endpoint traffic router
│   │   ├── middleware/
│   │   │   ├── authenticate.ts     # JWT Authorization header verification
│   │   │   └── errorHandler.ts     # Centralized Express error handler
│   │   ├── types/
│   │   │   ├── auth.types.ts       # Auth DTOs & service typings
│   │   │   └── express.d.ts        # Express Request augmentation (req.user)
│   │   ├── app.ts                  # Express application setup
│   │   └── server.ts               # Server startup listener
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── web/                            # React + Vite client app
│   ├── src/
│   │   ├── api/                    # Axios instances & client API methods
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Page components (Login, Signup, Homepage)
│   │   └── types/                  # Shared frontend types
│   ├── package.json
│   └── tsconfig.json
│
└── Roadmap.md                      # Production learning roadmap
```

---

## 🔑 Environment Variables

The server configuration relies on standard environment variables.

### `.env` (Local configuration - gitignored)
```env
PORT=5000
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/sotrix
JWT_SECRET=your_super_secret_jwt_key
```

### `.env.example` (Template - safe to commit)
```env
PORT=5000
DATABASE_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_here
```

---

## 💻 Installation & Running Locally

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB Atlas cluster URL (or local MongoDB daemon)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/sotrix.git
cd sotrix
```

### 2. Setup Server
```bash
cd server
npm install
```
Create a `.env` file in `server/` based on `.env.example`:
```bash
cp .env.example .env
```
Fill in your `DATABASE_URL` and `JWT_SECRET`. Then launch the development server:
```bash
npm run dev
```

### 3. Setup Frontend
In a new terminal:
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📚 API Documentation

### Base URL
`http://localhost:5000/api`

---

### 1. Register User (`POST /api/auth/signup`)
Registers a new user account with hashed password credentials.

- **Authentication Required**: No
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "username": "yugendhra",
  "email": "yugendhra@example.com",
  "password": "password123"
}
```

#### Success Response (`201 Created`)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "66a3d9f2b1a2c3d4e5f67890",
    "username": "yugendhra",
    "email": "yugendhra@example.com"
  }
}
```

#### Error Responses
- **`400 Bad Request`**: Missing required fields or duplicate username/email.
  ```json
  {
    "message": "User with this email or username already exists"
  }
  ```

---

### 2. Authenticate User (`POST /api/auth/login`)
Authenticates user credentials and issues a signed JSON Web Token (JWT).

- **Authentication Required**: No
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "identifier": "yugendhra@example.com",
  "password": "password123"
}
```
*(Note: `identifier` accepts either email or username)*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "User logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses
- **`400 Bad Request`**: Missing identifier or password.
  ```json
  {
    "message": "All fields are required"
  }
  ```
- **`401 Unauthorized`**: Non-existent user or invalid password.
  ```json
  {
    "message": "Invalid password"
  }
  ```

---

### 3. Get Current User Profile (`GET /api/auth/me`)
Fetches profile details of the currently authenticated user session.

- **Authentication Required**: Yes
- **Headers**:
  - `Authorization: Bearer <your_jwt_token>`

#### Request Body
*None*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": "66a3d9f2b1a2c3d4e5f67890",
    "username": "yugendhra",
    "email": "yugendhra@example.com"
  }
}
```

#### Error Responses
- **`401 Unauthorized`**: Missing, malformed, or expired JWT token.
  ```json
  {
    "message": "Invalid or expired token"
  }
  ```
- **`404 Not Found`**: User no longer exists in database.
  ```json
  {
    "message": "User not found"
  }
  ```

---

## 🔒 Authentication Flow

1. Client sends user credentials to `POST /api/auth/login`.
2. Backend verifies credentials against hashed passwords using `bcrypt`.
3. Backend returns a JWT token with a 1-hour expiration time.
4. Client stores token in `localStorage` and attaches header `Authorization: Bearer <token>` to subsequent requests.
5. Server `authenticate` middleware intercepts requests, decodes token, populates `req.user = { id }`, and permits access to protected controllers.

---
