# Contributing to Sotrix

Thanks for helping improve Sotrix. Here is a quick guide to getting set up and submitting changes.

---

## Local Setup

### 1. Backend (`server`)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

- API runs at `http://localhost:5000`
- Swagger docs run at `http://localhost:5000/api-docs`
- Background worker (optional for media queues): `npm run worker`

### 2. Frontend (`web`)

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

- Web app runs at `http://localhost:5173`

---

## Branching & Commit Conventions

Create a branch off `main`:
- `feat/<feature-name>` for new features
- `fix/<bug-name>` for bug fixes
- `refactor/<name>` for code cleanup
- `docs/<name>` for documentation changes

Follow conventional commits:
```bash
git commit -m "feat(feed): add cursor pagination"
git commit -m "fix(auth): handle token refresh expiration"
```

---

## Quality Checks Before Submitting

Run these commands locally to verify everything builds and passes tests:

```bash
# In server/
npm test
npm run build

# In web/
npm run lint
npm run build
```

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request targeting the `main` branch.
3. Fill out the pull request template.
4. Ensure all CI checks pass.

---

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md). For any conduct issues, contact [@y9ndra](https://github.com/y9ndra) on GitHub.
