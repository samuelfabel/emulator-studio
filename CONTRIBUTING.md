# Contributing to Emulator Studio

Thank you for your interest in contributing!

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Development setup

1. Fork and clone the repository
2. Install Node.js 20+
3. Run `npm install`
4. Copy `.env.example` to `.env`
5. Start the Pub/Sub emulator (see README)
6. Run `npm run dev`

## Project structure

- `apps/api` — REST API + Swagger
- `apps/web` — React + Vite dashboard
- `libs/pubsub` — Pub/Sub emulator logic
- `libs/shared` — Shared types and utilities

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(pubsub): add subscription filter support
fix(api): handle missing emulator host
docs: update quick start guide
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Pull requests

1. Create a feature branch from `main`
2. Run `npm test` and `npm run lint`
3. Keep changes focused and documented
4. Describe what changed and how to test

## Testing

```bash
npm test
nx test shared
nx test pubsub
nx test api
```

Coverage reports are written to `coverage/`.

## Reporting issues

Include OS, Node version, emulator command, and steps to reproduce.
