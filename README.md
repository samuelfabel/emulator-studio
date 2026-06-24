# Emulator Studio

Open-source dashboards for **local cloud emulators** (GCP, AWS, Azure). Inspect resources, publish test messages, and validate integrations without touching production.

## Features

- **Nx monorepo** with isolated API and React web app
- **Pub/Sub dashboard (GCP)** — topics, subscriptions, publish & pull
- **Multi-cloud roadmap** — AWS and Azure emulators planned ([ROADMAP.md](ROADMAP.md))
- **Swagger UI** at `/docs` on the API
- **Dark mode** on the web dashboard
- **Vitest** tests with coverage
- **Conventional Commits** + Commitlint + Husky

## Architecture

```
apps/
  api/     → NestJS REST API + Swagger (port 3001)
  web/     → React + Vite dashboard (port 3000)
libs/
  pubsub/  → Pub/Sub emulator service
  shared/  → Shared types and validation
```

The web app **never** talks to cloud providers directly — all emulator operations go through the API.

## Prerequisites

- Node.js 20+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) — required only for the Pub/Sub emulator today
- npm

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Start the Pub/Sub emulator

```bash
gcloud beta emulators pubsub start --project=local-dev --host-port=localhost:8085
```

In another terminal, load emulator variables (or set them in `.env`):

```bash
# Linux/macOS
export PUBSUB_EMULATOR_HOST=localhost:8085
export GOOGLE_CLOUD_PROJECT=local-dev

# Windows (PowerShell)
$env:PUBSUB_EMULATOR_HOST = "localhost:8085"
$env:GOOGLE_CLOUD_PROJECT = "local-dev"
```

### 4. Run API + Web

```bash
npm run dev
```

| Service    | URL |
|-----------|-----|
| Dashboard | http://localhost:3000 |
| API       | http://localhost:3001 |
| Swagger   | http://localhost:3001/docs |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and web in parallel |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm test` | Run all Vitest suites |
| `npm run lint` | ESLint on all projects |
| `npm run build` | Build all apps |
| `npm run format` | Prettier write |

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pubsub/status` | Connection status + resource lists |
| POST | `/api/pubsub/topics` | Create topic |
| DELETE | `/api/pubsub/topics/:name` | Delete topic |
| POST | `/api/pubsub/subscriptions` | Create subscription |
| DELETE | `/api/pubsub/subscriptions/:name` | Delete subscription |
| POST | `/api/pubsub/publish` | Publish message |
| POST | `/api/pubsub/subscriptions/:name/pull` | Pull messages (test consume) |

Full OpenAPI spec: http://localhost:3001/docs

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Planned emulators and local tooling: [ROADMAP.md](ROADMAP.md).

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
