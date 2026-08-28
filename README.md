# Emulator Studio

Open-source dashboards for **local cloud emulators** (GCP, AWS, Azure). Inspect resources, publish test messages, and validate integrations without touching production.

**Website:** [samuelfabel.github.io/emulator-studio](https://samuelfabel.github.io/emulator-studio/) · **Site repo:** [emulator-studio-site](https://github.com/samuelfabel/emulator-studio-site)

## Features

- **Nx monorepo** with isolated API and React web app
- **Pub/Sub dashboard (GCP)** — topics, subscriptions, publish & pull
- **Cloud Storage dashboard (GCP)** — buckets, folders, upload/download/delete via `fake-gcs-server` (Docker)
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
  storage/ → Cloud Storage (fake-gcs-server) service
  shared/  → Shared types and validation
```

The web app **never** talks to cloud providers directly — all emulator operations go through the API.

## Prerequisites

- Node.js 24+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) — for the Pub/Sub emulator
- [Docker](https://docs.docker.com/get-docker/) — for Cloud Storage (`fake-gcs-server`; there is no official `gcloud` storage emulator)
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

### 3. Start emulators

**Option A — from the Studio UI (recommended)**  
Install and start Pub/Sub and/or Cloud Storage from http://localhost:3000/emulators.

**Option B — manually**

```bash
# Pub/Sub
gcloud beta emulators pubsub start --project=local-dev --host-port=localhost:8085

# Cloud Storage (Docker)
docker run -d --name emulator-studio-gcs -p 4443:4443 \
  fsouza/fake-gcs-server:1.52.2 \
  -scheme http -port 4443 -backend memory \
  -external-url http://localhost:4443 -public-host localhost:4443
```

Load emulator variables (or set them in `.env`):

```bash
# Linux/macOS
export PUBSUB_EMULATOR_HOST=localhost:8085
export STORAGE_EMULATOR_HOST=http://localhost:4443
export GOOGLE_CLOUD_PROJECT=local-dev

# Windows (PowerShell)
$env:PUBSUB_EMULATOR_HOST = "localhost:8085"
$env:STORAGE_EMULATOR_HOST = "http://localhost:4443"
$env:GOOGLE_CLOUD_PROJECT = "local-dev"
```

### 4. Run API + Web

```bash
npm run dev
```

| Service   | URL                        |
| --------- | -------------------------- |
| Dashboard | http://localhost:3000      |
| API       | http://localhost:3001      |
| Swagger   | http://localhost:3001/docs |

## Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start API and web in parallel |
| `npm run dev:api` | API only                      |
| `npm run dev:web` | Web only                      |
| `npm test`        | Run all Vitest suites         |
| `npm run lint`    | ESLint on all projects        |
| `npm run build`   | Build all apps                |
| `npm run format`  | Prettier write                |

## API overview

### Pub/Sub

| Method | Path                                   | Description                        |
| ------ | -------------------------------------- | ---------------------------------- |
| GET    | `/api/pubsub/status`                   | Connection status + resource lists |
| POST   | `/api/pubsub/topics`                   | Create topic                       |
| DELETE | `/api/pubsub/topics/:name`             | Delete topic                       |
| POST   | `/api/pubsub/subscriptions`            | Create subscription                |
| DELETE | `/api/pubsub/subscriptions/:name`      | Delete subscription                |
| POST   | `/api/pubsub/publish`                  | Publish message                    |
| POST   | `/api/pubsub/subscriptions/:name/pull` | Pull messages (test consume)       |

### Cloud Storage

| Method | Path                                            | Description                          |
| ------ | ----------------------------------------------- | ------------------------------------ |
| GET    | `/api/storage/status`                           | Connection status + bucket list      |
| POST   | `/api/storage/buckets`                          | Create bucket                        |
| DELETE | `/api/storage/buckets/:bucket`                  | Delete bucket (`?force=true`)        |
| GET    | `/api/storage/buckets/:bucket/iam`              | IAM policy (if emulator supports it) |
| GET    | `/api/storage/buckets/:bucket/objects`          | List objects/folders (`?prefix=`)    |
| POST   | `/api/storage/buckets/:bucket/objects`          | Upload object (JSON body)            |
| GET    | `/api/storage/buckets/:bucket/objects/download` | Download object bytes                |
| DELETE | `/api/storage/buckets/:bucket/objects`          | Delete object (`?name=`)             |
| POST   | `/api/storage/buckets/:bucket/folders`          | Create folder placeholder            |

Full OpenAPI spec: http://localhost:3001/docs

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Planned emulators and local tooling: [ROADMAP.md](ROADMAP.md).

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
