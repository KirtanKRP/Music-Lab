<!-- ───────────────────────────────────────────────
     DAW Music Lab — README
     Update the variables below if you rename the repo.
     REPO_OWNER  : KirtanKRP
     REPO_NAME   : Music-Lab
     PROJECT_NAME: DAW Music Lab
     ─────────────────────────────────────────────── -->

<div align="center">

# 🎛️ DAW Music Lab

**A browser-based Digital Audio Workstation with an integrated beat marketplace.**

[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## Overview

DAW Music Lab combines a **multi-track timeline editor** (DAW) with a **beat marketplace** in a single full-stack application. Producers can compose, save, and load projects directly in the browser. Artists can list beats for sale, and listeners can preview, wishlist, and purchase them — all backed by real-time WebSocket collaboration.

### Key Capabilities

| Module | What it does |
|---|---|
| **Studio** | Multi-track timeline with drag-and-drop audio regions, BPM control, playback transport, and Web Audio API–powered mixing |
| **Marketplace** | Browse, search, preview, and purchase beats with license-type pricing (Standard Lease / Exclusive Rights) |
| **Live Collaboration** | STOMP-over-WebSocket synchronisation so multiple browser tabs (or users) see the same project state in real time |
| **Project Persistence** | Java `ObjectOutputStream` serialisation stores full project state (tracks, regions, metadata) as binary blobs in PostgreSQL |
| **Audio Storage** | Java NIO file I/O for uploading, storing, and streaming audio assets from the server filesystem |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  Next.js 16 · React 19 · Zustand · Tone.js · STOMP.js          │
└──────────────────────┬──────────────────┬───────────────────────┘
                       │ REST (HTTP)      │ WebSocket (STOMP)
                       ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot 3.4 (Java 17)                    │
│                                                                 │
│  Controllers ──► Services ──► Repositories ──► PostgreSQL       │
│       │              │                                          │
│       │         Strategy Pattern                                │
│       │        (License Pricing)                                │
│       │                                                         │
│  WebSocket ──► SimpMessagingTemplate ──► /topic/studio.*        │
│                                                                 │
│  Audio I/O ──► NIO Files.copy / UrlResource streaming           │
│  Project I/O ─► ObjectOutputStream / ObjectInputStream          │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │   (Supabase)    │
              │                 │
              │  users          │
              │  projects       │
              │  market_tracks  │
              │  transactions   │
              └─────────────────┘
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Java 17 | Language runtime |
| Spring Boot 3.4 | Application framework, dependency injection, REST controllers |
| Spring Data JPA | ORM / repository abstraction over PostgreSQL |
| Spring WebSocket | STOMP broker for real-time studio sync |
| Flyway | Versioned database migrations (`V1__create_core_schema.sql`, `V2__seed_reference_data.sql`) |
| PostgreSQL 15 | Relational database (hosted on Supabase) |
| Maven | Build tool and dependency management |

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Server-side rendering, file-system routing |
| React 19 | Component model |
| TypeScript 5 | Type safety |
| Zustand | Lightweight client-side state management |
| Tone.js | Web Audio API abstraction for the DAW playback engine |
| STOMP.js | WebSocket client for real-time collaboration |
| Tailwind CSS 4 | Utility-first styling |

---

## Project Structure

```
Music-Lab/
├── backend/                          # Spring Boot API
│   ├── src/main/java/com/musiclab/backend/
│   │   ├── MusicLabApplication.java  # Entry point
│   │   ├── config/                   # CORS, WebSocket, Storage, DB Seeder
│   │   ├── controller/               # REST + WebSocket endpoints
│   │   │   ├── ProjectStudioController.java
│   │   │   ├── MarketplaceController.java
│   │   │   ├── AudioAssetController.java
│   │   │   └── LiveStudioController.java
│   │   ├── service/                  # Business logic
│   │   │   ├── ProjectManagementService.java   # Facade pattern
│   │   │   ├── ProjectIioService.java          # Serialisation I/O
│   │   │   ├── MarketplaceService.java         # Transactions
│   │   │   └── AudioFileStorageService.java    # NIO file ops
│   │   ├── entity/                   # JPA entities
│   │   ├── domain/                   # Serialisable domain models
│   │   ├── repository/               # Spring Data JPA interfaces
│   │   ├── strategy/                 # License pricing (Strategy pattern)
│   │   └── exception/               # Global error handling
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/            # Flyway SQL scripts
│   └── pom.xml
│
├── frontend/                         # Next.js client
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── page.tsx              # Studio (DAW) — home route
│   │   │   ├── marketplace/          # Beat marketplace
│   │   │   ├── explore/              # Discovery feed
│   │   │   ├── market/               # Upload, artist profiles
│   │   │   ├── wishlist/             # Saved / liked tracks
│   │   │   ├── hooks-lab/            # Audio hooks playground
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── components/
│   │   │   ├── studio/               # Timeline, tracks, regions, playhead
│   │   │   ├── market/               # Track cards, cart, player, modals
│   │   │   ├── ui/                   # Shared UI primitives
│   │   │   ├── Sidebar.tsx
│   │   │   └── SidebarLayout.tsx
│   │   ├── store/                    # Zustand stores
│   │   ├── hooks/                    # Custom React hooks
│   │   └── lib/
│   │       ├── api/                  # REST client helpers
│   │       ├── audio/                # AudioEngine (Tone.js wrapper)
│   │       └── constants/
│   └── package.json
│
├── DATABASE_SCHEMA.sql               # Full schema reference
└── README.md                         # ← you are here
```

---

## Design Patterns Used

| Pattern | Where | Why |
|---|---|---|
| **Strategy** | `LicensePricingStrategy` → `StandardLeaseStrategy`, `ExclusiveRightsStrategy` | Swap pricing algorithms at runtime depending on the license type selected during purchase |
| **Facade** | `ProjectManagementService` | Single entry point that orchestrates serialisation, entity persistence, and audio linking behind one method call |
| **DAO / Repository** | `JpaRepository` interfaces in `repository/` | Decouples service logic from raw SQL — Spring Data generates queries from method names |
| **Observer** | STOMP pub/sub (`/topic/studio.*`) | Clients subscribe to a project topic and receive broadcasts when any collaborator changes state |

---

## Getting Started

### Prerequisites

- **Java 17+** (JDK)
- **Maven 3.9+** (or use the bundled `./mvnw` wrapper)
- **Node.js 20+** and **npm 10+**
- **PostgreSQL 15+** — a free [Supabase](https://supabase.com) project works out of the box

### 1. Clone the repository

```bash
git clone https://github.com/KirtanKRP/Music-Lab.git
cd Music-Lab
```

### 2. Configure the database

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your PostgreSQL credentials:

```env
DB_URL=jdbc:postgresql://<host>:5432/<database>?sslmode=require
DB_USERNAME=postgres
DB_PASSWORD=<your-password>
```

Flyway will automatically run the migration scripts on first startup.

### 3. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## API Endpoints

### Studio

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/studio/save` | Save project state (serialise + persist) |
| `GET` | `/api/v1/studio/load/{id}` | Load a saved project |
| `POST` | `/api/v1/studio/serialize` | Serialise project to bytes (ObjectOutputStream) |
| `POST` | `/api/v1/studio/deserialize` | Deserialise bytes back to project object |

### Audio

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/audio/upload` | Upload an audio file (multipart, max 50 MB) |
| `GET` | `/api/v1/audio/stream/{filename}` | Stream an audio file |

### Marketplace

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/market/tracks` | List all marketplace tracks |
| `POST` | `/api/v1/market/purchase` | Purchase a track (transactional) |

### WebSocket

| Protocol | Endpoint | Description |
|---|---|---|
| STOMP | `/ws-studio` | WebSocket handshake endpoint |
| — | `/app/studio.sync` | Client → server sync messages |
| — | `/topic/studio.{projectId}` | Server → client broadcasts |

---

## Database Schema

Four core tables managed by Flyway migrations:

```sql
users           (id, username, email, password_hash, wallet_balance)
projects        (id, project_id, project_name, user_id, serialized_data, created_at)
market_tracks   (id, project_id, seller_id, title, base_price, listed_at)
transactions    (id, buyer_id, track_id, amount_paid, license_type, transaction_date)
```

See [`DATABASE_SCHEMA.sql`](DATABASE_SCHEMA.sql) for the full DDL with indexes and seed data.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_URL` | Yes | Supabase URL | JDBC connection string |
| `DB_USERNAME` | Yes | `postgres` | Database user |
| `DB_PASSWORD` | Yes | — | Database password |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8080` | Backend API base URL |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add: your feature description"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Authors

- **Kirtan Patel** — [@KirtanKRP](https://github.com/KirtanKRP)
- **Kanav Modi** — [@KanavCode](https://github.com/KanavCode)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
