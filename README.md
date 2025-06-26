# CUB Notification Service

A production-ready Node.js & TypeScript microservice for sending, tracking, and streaming notification events via Kafka and PostgreSQL. It supports SMS and WhatsApp channels, honor ordered status transitions, and publishes inbound webhooks to Kafka streams for other consumers.

## 📦 Docker Quick Start

Set up and run all dependencies (Postgres, Kafka, Zookeeper) and the notification API via Docker Compose:

```bash
# build and start containers
docker-compose up --build -d

# view logs
docker-compose logs -f notification-api
```

> ⚠️ If running locally without Docker, be sure to copy `.env.example` to `.env` and adjust any environment variables (database URL, Kafka broker endpoints, credentials) before starting.

## 🔧 Prerequisites

- Node.js v22+ (or your system default if running without Docker)
- pnpm (npm i -g pnpm)
- Docker & Docker Compose (optional for local Docker)

## 🚀 Running Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Copy example env and adjust variables
cp .env.example .env
# Edit .env to point to your local Kafka & Postgres or SQLite URL

# 3. Start development server
pnpm dev
```

The API listens on port 3000 by default. Endpoints:
- `POST /notifications` — send a new notification
- `GET /notifications` — list all (or filter by channel)
- `GET /notifications/:id` — get by internal ID
- `GET /notifications/external/:externalId` — get by external ID
- `PUT /notifications/:id` — update body, channel, or status
- `DELETE /notifications/:id` — delete notification
- `POST /webhook/:externalId` — receive status updates via webhook

## 🔐 Authentication

All API routes (except health checks) are protected by a simple bearer token middleware. Set `API_TOKEN` in your `.env` and include the header:

```
Authorization: Bearer <API_TOKEN>
```

## 🧪 Postman Collection

You can import the provided Postman collection and environment to test all endpoints:

- `postman/NotificationAPI.postman_collection.json`
- `postman/NotificationAPI.postman_environment.json`

## 🗺️ Kubernetes Manifests

All Kubernetes manifests for deployment, services, configMaps, secrets, PVCs, and HPA are under the `k8s/` directory. Apply them with:

```bash
kubectl apply -f k8s/
```

---

## ❓ Challenge Questions & Answers

**1. What measures make the application more robust against lost events when the service is down?**  
- Deploy on Kubernetes with horizontal scaling and multiple replicas.  
- Decouple webhook ingestion into a lightweight service that immediately pushes to Kafka (with multiple instances in K8s) to buffer events.

**2. How to guarantee at-least-once delivery to a streaming platform like Kafka?**  
- Use Kafka transactions and produce messages within a transactional session after persisting state.  
- Configure idempotent producers to avoid duplicates.

**3. How to handle out-of-order webhook events?**  
- Store an `updatedAt` timestamp on each record and compare incoming webhook timestamps.  
- Ignore any event older than the last-known update, ensuring only the most recent status is recorded.
