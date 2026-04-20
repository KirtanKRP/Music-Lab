# MusicLab — Complete Project Documentation
### AJT Semester Project | Spring Boot + Next.js DAW Platform

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Complete Project File Structure](#3-complete-project-file-structure)
4. [Database Design](#4-database-design)
   1. [Entity Relationship Overview](#41-entity-relationship-overview)
   2. [Table: users](#42-table-users)
   3. [Table: projects](#43-table-projects)
   4. [Table: market_tracks](#44-table-market_tracks)
   5. [Table: transactions](#45-table-transactions)
   6. [Database Indexes](#46-database-indexes)
   7. [Flyway Migration Strategy](#47-flyway-migration-strategy)
   8. [Seed Data](#48-seed-data)
5. [Backend Architecture](#5-backend-architecture)
   1. [Spring Boot Application Entry Point](#51-spring-boot-application-entry-point)
   2. [Configuration Layer](#52-configuration-layer)
   3. [Domain Objects (Java I/O — Unit 2)](#53-domain-objects-java-io--unit-2)
   4. [JPA Entities (Unit 4)](#54-jpa-entities-unit-4)
   5. [Repository Layer (DAO Pattern — Unit 8)](#55-repository-layer-dao-pattern--unit-8)
   6. [Service Layer](#56-service-layer)
   7. [Exception Handling](#57-exception-handling)
6. [REST API Reference (Unit 6/7)](#6-rest-api-reference-unit-67)
7. [WebSocket Architecture (Unit 3)](#7-websocket-architecture-unit-3)
   1. [Overview](#71-overview)
   2. [Backend WebSocket Setup](#72-backend-websocket-setup)
   3. [Backend Message Handler](#73-backend-message-handler)
   4. [Frontend WebSocket Client](#74-frontend-websocket-client)
   5. [Complete Message Flow](#75-complete-message-flow)
   6. [Echo Prevention](#76-echo-prevention)
8. [Frontend Architecture](#8-frontend-architecture)
   1. [Next.js App Router Pages](#81-nextjs-app-router-pages)
   2. [State Management (Zustand Stores)](#82-state-management-zustand-stores)
   3. [Audio Engine (Tone.js)](#83-audio-engine-tonejs)
   4. [Playhead Synchronization](#84-playhead-synchronization)
   5. [Studio Components](#85-studio-components)
   6. [Marketplace Components](#86-marketplace-components)
   7. [API Client Layer](#87-api-client-layer)
9. [Design Patterns (Unit 8)](#9-design-patterns-unit-8)
   1. [Strategy Pattern — License Pricing](#91-strategy-pattern--license-pricing)
   2. [Singleton Pattern — AudioEngine](#92-singleton-pattern--audioengine)
   3. [Singleton Pattern — StudioSocketClient](#93-singleton-pattern--studiosocketclient)
   4. [Facade Pattern — ProjectManagementService](#94-facade-pattern--projectmanagementservice)
   5. [DAO Pattern — Repository Layer](#95-dao-pattern--repository-layer)
10. [AJT Syllabus Coverage](#10-ajt-syllabus-coverage)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
   1. [User Purchases a Track](#111-user-purchases-a-track)
   2. [User Saves a Studio Project](#112-user-saves-a-studio-project)
   3. [User Loads a Studio Project](#113-user-loads-a-studio-project)
   4. [Audio File Upload and Playback](#114-audio-file-upload-and-playback)
   5. [Real-Time Track Mute Sync](#115-real-time-track-mute-sync)
12. [How to Run the Project](#12-how-to-run-the-project)
   1. [Prerequisites](#121-prerequisites)
   2. [Environment Setup](#122-environment-setup)
   3. [Database Setup](#123-database-setup)
   4. [Starting the Backend](#124-starting-the-backend)
   5. [Starting the Frontend](#125-starting-the-frontend)
   6. [Verifying Everything Works](#126-verifying-everything-works)
13. [Known Limitations and Honest Notes](#13-known-limitations-and-honest-notes)
14. [Glossary](#14-glossary)

---

## 1. Project Overview

MusicLab is a full-stack digital audio workstation (DAW) plus beat marketplace project implemented with Spring Boot on the backend and Next.js on the frontend. It combines studio-style timeline editing, audio upload and streaming, serialization-based project save/load, and marketplace purchase flows into one platform. The root studio page (`/`) hosts a timeline where users can import clips, add tracks, control BPM and transport state, and persist project state.

The repository is aligned to an AJT semester project structure. The backend code explicitly references AJT units in comments across controllers, services, and configs. Unit 2 is represented by Java I/O and Java NIO usage, Unit 3 by STOMP/WebSocket networking, Unit 4 by JPA transactions and persistence, Unit 6/7 by REST controller design, and Unit 8 by Strategy/Singleton/Facade/DAO patterns.

The product solves two linked use cases in one workflow: production and monetization. Users can create or load studio projects in the DAW, and marketplace users can browse tracks, preview audio, add items to cart, select license type (standard vs exclusive), and complete purchase requests that reach a transactional backend service.

Technically, the codebase is interesting because it integrates multiple layers that usually live in separate products: real-time collaboration signaling (STOMP topics), relational persistence (JPA + PostgreSQL), Java object serialization/deserialization for full project state, file upload and MIME-aware streaming for audio clips, and a stateful React UI backed by Zustand stores and a Tone.js singleton engine.

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend language | Java | 17 (`<java.version>17</java.version>`) | Core backend implementation language |
| Backend framework | Spring Boot | 3.4.3 (`spring-boot-starter-parent`) | REST, dependency injection, lifecycle, configuration |
| Database | PostgreSQL (Supabase-hosted) | Managed service (project-specific) | Persistent storage for users/projects/market/transactions |
| Migration tool | Flyway (`flyway-core`, `flyway-database-postgresql`) | Inherited from Spring Boot 3.4.3 dependency management | Versioned SQL migrations (`V1`, `V2`) |
| ORM | Spring Data JPA + Hibernate | Inherited from Spring Boot 3.4.3 | Entity mapping and repository-based DAO access |
| WebSocket | Spring WebSocket + STOMP | Inherited from Spring Boot 3.4.3 | Real-time studio event publish/subscribe |
| Frontend language | TypeScript | `^5` (devDependency) | Typed UI/application layer |
| Frontend framework | Next.js | 16.2.1 | App Router pages and frontend runtime |
| UI library | React | 19.2.4 | Component rendering and UI composition |
| Audio engine | Tone.js | ^15.1.22 | Playback transport, synchronized audio region scheduling |
| State management | Zustand | ^5.0.12 | Lightweight global stores for studio/market/auth states |
| Styling | Tailwind CSS | ^4 | Utility-first CSS with custom theme variables |
| WebSocket client | @stomp/stompjs | ^7.3.0 | STOMP client for frontend real-time sync |

---

## 3. Complete Project File Structure

Music-Lab/
├── backend/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/musiclab/backend/
│   │       │   ├── MusicLabApplication.java — Spring Boot app entry point with `@SpringBootApplication`.
│   │       │   ├── config/
│   │       │   │   ├── CorsConfig.java — Enables CORS for `http://localhost:3000` with credentials.
│   │       │   │   ├── WebSocketConfig.java — Configures STOMP broker, prefixes, and `/ws-studio` endpoint.
│   │       │   │   ├── StorageConfig.java — Creates audio storage directory at startup via `@PostConstruct`.
│   │       │   │   └── DatabaseSeeder.java — Optional legacy startup seed runner behind property flag.
│   │       │   ├── controller/
│   │       │   │   ├── MarketplaceController.java — Lists tracks and processes purchase requests.
│   │       │   │   ├── ProjectStudioController.java — Save/load/serialize/deserialize studio projects.
│   │       │   │   ├── AudioAssetController.java — Upload and stream audio files.
│   │       │   │   └── LiveStudioController.java — Receives STOMP events and broadcasts by project topic.
│   │       │   ├── domain/
│   │       │   │   ├── MusicProject.java — Serializable top-level DAW project model.
│   │       │   │   ├── AudioTrack.java — Serializable track model with regions list.
│   │       │   │   ├── AudioRegion.java — Serializable timeline clip model.
│   │       │   │   └── StudioSyncMessage.java — WebSocket payload model for realtime sync events.
│   │       │   ├── entity/
│   │       │   │   ├── UserEntity.java — JPA map for `users`.
│   │       │   │   ├── ProjectEntity.java — JPA map for `projects` with serialized byte payload.
│   │       │   │   ├── MarketTrackEntity.java — JPA map for `market_tracks`.
│   │       │   │   └── TransactionLedgerEntity.java — JPA map for `transactions` ledger.
│   │       │   ├── exception/
│   │       │   │   ├── GlobalExceptionHandler.java — Central exception-to-HTTP mapping.
│   │       │   │   └── InsufficientFundsException.java — Domain exception for wallet shortfall.
│   │       │   ├── repository/
│   │       │   │   ├── UserRepository.java — DAO interface for users.
│   │       │   │   ├── ProjectRepository.java — DAO interface for projects, adds `findByProjectId`.
│   │       │   │   ├── MarketTrackRepository.java — DAO interface for market tracks.
│   │       │   │   └── TransactionLedgerRepository.java — DAO interface for transactions.
│   │       │   ├── service/
│   │       │   │   ├── MarketplaceService.java — Transactional purchase orchestration and pricing strategy selection.
│   │       │   │   ├── ProjectManagementService.java — Facade combining serialization and persistence.
│   │       │   │   ├── ProjectIioService.java — ObjectOutputStream/ObjectInputStream conversion service.
│   │       │   │   └── AudioFileStorageService.java — Java NIO storage and secure file retrieval.
│   │       │   └── strategy/
│   │       │       ├── LicensePricingStrategy.java — Strategy interface for price calculation.
│   │       │       ├── StandardLeaseStrategy.java — Returns base price unchanged.
│   │       │       └── ExclusiveRightsStrategy.java — Returns base price multiplied by 10.
│   │       └── resources/
│   │           ├── db/migration/
│   │           │   ├── V1__create_core_schema.sql — Creates core tables and indexes idempotently.
│   │           │   └── V2__seed_reference_data.sql — Idempotently inserts demo user + 3 market tracks.
│   │           └── application.properties — Datasource/JPA/Flyway/storage/upload configuration.
│   ├── API_TESTS.http — REST Client request collection for endpoint validation.
│   ├── API_TESTS.md — Endpoint matrix and demo instructions.
│   ├── pom.xml — Maven build + dependencies for Spring Boot backend.
│   ├── start-supabase.ps1 — Loads `.env`, validates DB vars, starts backend via Maven wrapper.
│   └── .env.example — Environment variable template for Supabase connection.
├── frontend/
│   ├── package.json — Next.js scripts and dependency versions.
│   ├── next.config.ts — Next image remote host allowlist.
│   └── src/
│       ├── app/ — Next.js App Router pages
│       │   ├── layout.tsx — Global HTML/body wrapper + metadata + fonts.
│       │   ├── globals.css — Theme variables, animations, utility styles.
│       │   ├── page.tsx — Root route mounting Studio layout.
│       │   ├── marketplace/page.tsx — Marketplace route shell.
│       │   ├── explore/page.tsx — Genre/artist discovery page.
│       │   ├── wishlist/page.tsx — Wishlist/library view with modal and player portal.
│       │   ├── login/page.tsx — Login form wired to mock auth store.
│       │   ├── signup/page.tsx — Signup form with role selection.
│       │   ├── hooks-lab/page.tsx — Hook browser page (UI table style).
│       │   ├── market/upload/page.tsx — Upload page for listing tracks.
│       │   └── market/artist/[id]/page.tsx — Dynamic artist profile page.
│       ├── components/ — React UI components
│       │   ├── Sidebar.tsx — Main navigation with auth profile/logout modal.
│       │   ├── SidebarLayout.tsx — Shared two-column layout wrapper.
│       │   ├── Portal.tsx — Body-level portal for overlays/modals/drawers.
│       │   ├── studio/
│       │   │   ├── StudioLayout.tsx — DAW shell (transport, timeline, mixer, instruments, save/load).
│       │   │   ├── TrackRow.tsx — Per-track lane with regions and mute indicator.
│       │   │   ├── Playhead.tsx — Visual playhead connected to RAF sync hook.
│       │   │   └── RegionBlock.tsx — Absolute-positioned clip blocks on timeline.
│       │   ├── market/
│       │   │   ├── MarketplaceView.tsx — Track grid, filters, sort, backend badge, modal/player/cart portal.
│       │   │   ├── MarketTrackCard.tsx — Card with preview toggle, wishlist, badges, price/rating.
│       │   │   ├── MarketAudioPlayer.tsx — Bottom fixed audio player with seek + next/prev.
│       │   │   ├── TrackDetailsModal.tsx — Track details, license selector, rating, cart action.
│       │   │   └── CartDrawer.tsx — Multi-step checkout drawer with GST + mock payment.
│       │   └── ui/
│       │       └── LoadingSpinner.tsx — Reusable loading text pulse component.
│       ├── hooks/ — Custom React hooks
│       │   └── usePlayheadSync.ts — requestAnimationFrame DOM mutation for playhead movement.
│       ├── lib/ — Utilities and API clients
│       │   ├── constants/index.ts — Shared constants (`PIXELS_PER_SECOND`, `DEFAULT_BPM`, `API_BASE_URL`).
│       │   ├── audio/AudioEngine.ts — Tone.js singleton wrapper for transport and region players.
│       │   └── api/
│       │       ├── marketClient.ts — Market list fetch, mock enrichment, purchase API.
│       │       ├── audioClient.ts — Upload API and stream URL helper.
│       │       ├── projectClient.ts — Save/load studio project API helpers.
│       │       └── socketClient.ts — STOMP singleton client for realtime studio sync.
│       └── store/ — Zustand state stores
│           ├── useStudioStore.ts — Studio transport/track/project state and sync actions.
│           ├── useMarketStore.ts — Cart, wishlist, preview, ratings, purchase history state.
│           └── useAuthStore.ts — Mock auth state with localStorage persistence.
├── DATABASE_SCHEMA.sql — Standalone SQL schema and seed script for Supabase SQL Editor.
├── DEMO_GUIDE.md — Demo script mapped to AJT units and known limitations.
└── PROJECT_DOCUMENTATION.md — This file

---

## 4. Database Design

### 4.1 Entity Relationship Overview

MusicLab uses four core relational tables: `users`, `projects`, `market_tracks`, and `transactions`. The code treats these relationships as ID-based references (`user_id`, `seller_id`, `buyer_id`, `track_id`, `project_id`) rather than object relationships with JPA `@ManyToOne` mappings.

Logical links in the current schema:

1. `projects.user_id` points to the owning user in `users.id`.
2. `market_tracks.seller_id` points to the seller user in `users.id`.
3. `market_tracks.project_id` optionally links a listed track back to an internal project entry.
4. `transactions.buyer_id` points to the buyer in `users.id`.
5. `transactions.track_id` points to the purchased listing in `market_tracks.id`.

Important implementation detail from `V1__create_core_schema.sql`: no explicit SQL foreign key constraints are declared. The relationships are semantic and enforced at service/repository level (for example, `MarketplaceService` performs explicit lookups for buyer and track before creating transaction rows).

### 4.2 Table: users

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | bigint | Primary key, identity (`generated by default as identity`) | Surrogate numeric key for user records |
| username | varchar(50) | `NOT NULL`; unique via `ux_users_username` and entity `unique=true` | Display/login username |
| email | varchar(100) | `NOT NULL`; unique via `ux_users_email` and entity `unique=true` | Email address used in seed and mock auth flows |
| password_hash | varchar(255) | `NOT NULL` | Stored password hash placeholder (`hashed_placeholder` in seed) |
| wallet_balance | numeric(12,2) | `NOT NULL` | Wallet funds used in purchase validation (`compareTo` in service) |

Relevant JPA mapping from `UserEntity.java`:

```java
@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;
    // ...
}
```

### 4.3 Table: projects

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | bigint | Primary key, identity | Internal DB key |
| project_id | varchar(100) | `NOT NULL`, unique index `ux_projects_project_id` | Stable external project identifier used by API load/save |
| project_name | varchar(150) | `NOT NULL` | Human-readable project title |
| user_id | bigint | `NOT NULL` | Owner user reference (logical) |
| serialized_data | oid | `NOT NULL` | Serialized `MusicProject` byte payload persisted from ObjectOutputStream output |
| created_at | timestamp with time zone | `NOT NULL` | Creation timestamp |

Why `serialized_data (oid)` exists and what it stores:

- `ProjectIioService.serializeProject()` writes a full `MusicProject` object graph to `byte[]`.
- `ProjectManagementService.saveProjectState()` writes that byte array into `ProjectEntity.serializedData`.
- `ProjectIioService.deserializeProject()` reconstructs the object graph from DB bytes.
- This allows full DAW session rehydration (BPM + tracks + regions) from a single persisted blob.

Implementation snippet:

```java
@Lob
@Column(name = "serialized_data", nullable = false)
private byte[] serializedData;

@Transactional
public void saveProjectState(MusicProject project, Long userId) {
    byte[] serializedData = projectIioService.serializeProject(project);
    // ... entity.setSerializedData(serializedData)
}
```

### 4.4 Table: market_tracks

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | bigint | Primary key, identity | Listing ID used in purchase API |
| project_id | bigint | Nullable | Optional reference back to source project |
| seller_id | bigint | `NOT NULL` | Seller user ID |
| title | varchar(200) | `NOT NULL` | Track listing title |
| base_price | numeric(10,2) | `NOT NULL` | Standard license base price |
| listed_at | timestamp with time zone | `NOT NULL` | Listing creation timestamp |

JPA excerpt:

```java
@Entity
@Table(name = "market_tracks")
public class MarketTrackEntity {
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "seller_id", nullable = false)
    private Long sellerId;
}
```

### 4.5 Table: transactions

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | bigint | Primary key, identity | Transaction ledger row ID |
| buyer_id | bigint | `NOT NULL` | Buyer user ID |
| track_id | bigint | `NOT NULL` | Purchased listing ID |
| amount_paid | numeric(10,2) | `NOT NULL` | Final computed amount after strategy pricing |
| license_type | varchar(50) | `NOT NULL` | `standard` or `exclusive` input from API |
| transaction_date | timestamp with time zone | `NOT NULL` | Purchase timestamp |

JPA excerpt:

```java
@Entity
@Table(name = "transactions")
public class TransactionLedgerEntity {
    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "track_id", nullable = false)
    private Long trackId;
}
```

### 4.6 Database Indexes

| Index Name | Table | Column | Type | Purpose |
|---|---|---|---|---|
| ux_users_username | users | username | Unique B-tree | Enforces unique usernames |
| ux_users_email | users | email | Unique B-tree | Enforces unique email addresses |
| ux_projects_project_id | projects | project_id | Unique B-tree | Supports unique project lookup by API ID |
| ix_projects_user_id | projects | user_id | Non-unique B-tree | Faster filtering by owner user |
| ix_market_tracks_seller_id | market_tracks | seller_id | Non-unique B-tree | Faster seller listing queries |
| ix_market_tracks_project_id | market_tracks | project_id | Non-unique B-tree | Faster listing lookup by source project |
| ix_transactions_buyer_id | transactions | buyer_id | Non-unique B-tree | Faster purchase history by buyer |
| ix_transactions_track_id | transactions | track_id | Non-unique B-tree | Faster transaction lookup by track |

### 4.7 Flyway Migration Strategy

`V1__create_core_schema.sql`:

- Creates all four tables (`users`, `projects`, `market_tracks`, `transactions`) using `create table if not exists`.
- Creates all required indexes using `create index if not exists` and `create unique index if not exists`.
- Intentionally idempotent, so rerunning against an initialized DB does not fail on object existence.

`V2__seed_reference_data.sql`:

- Inserts one reference user (`TestProducer`) only when that email does not already exist.
- Inserts three marketplace tracks only when a row with the same seller and title does not exist.
- Uses `insert ... select ... where not exists (...)` pattern for each seeded record.

Why `spring.flyway.baseline-on-migrate=true` is set:

- This setting allows Flyway to baseline and adopt an existing schema instead of failing if the DB was initialized outside Flyway at some point (common in Supabase SQL-editor-first setups).

Why `spring.jpa.hibernate.ddl-auto=validate` is used:

- `validate` checks that entity mappings match the existing schema but does not create/alter tables.
- This avoids conflicting schema ownership between Hibernate and Flyway.
- `create` or `update` would introduce runtime schema drift and bypass explicit migration history.

Why idempotent SQL is used:

- Deployment safety across repeated local starts, reset scripts, and pre-seeded databases.
- `if not exists` and `where not exists` patterns avoid duplicate object/row errors.
- Consistent with migration comments in both `V1` and `V2` that scripts are safe for already-initialized databases.

### 4.8 Seed Data

Exact records inserted by `V2__seed_reference_data.sql`:

Seed user:

| Table | username | email | password_hash | wallet_balance |
|---|---|---|---|---|
| users | TestProducer | test@musiclab.com | hashed_placeholder | 5000.00 |

Seed tracks (all inserted with `project_id = null`, `listed_at = now()`, and `seller_id = u.id` where `u.email = 'test@musiclab.com'`):

| Table | title | base_price |
|---|---|---|
| market_tracks | Lofi Study Beat | 29.99 |
| market_tracks | Cyberpunk Synthwave | 45.50 |
| market_tracks | Acoustic Guitar Loop | 15.00 |

Seed SQL pattern snippet:

```sql
insert into market_tracks (project_id, seller_id, title, base_price, listed_at)
select null, u.id, 'Lofi Study Beat', 29.99, now()
from users u
where u.email = 'test@musiclab.com'
  and not exists (
      select 1
      from market_tracks mt
      where mt.seller_id = u.id
        and mt.title = 'Lofi Study Beat'
  );
```

---

## 5. Backend Architecture

### 5.1 Spring Boot Application Entry Point

`MusicLabApplication.java` is the standard Spring Boot entry class. It declares `@SpringBootApplication` and starts the app through `SpringApplication.run(...)`.

```java
package com.musiclab.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MusicLabApplication {
    public static void main(String[] args) {
        SpringApplication.run(MusicLabApplication.class, args);
    }
}
```

### 5.2 Configuration Layer

#### CorsConfig.java

- File: `backend/src/main/java/com/musiclab/backend/config/CorsConfig.java`
- What it configures: Global CORS policy for MVC endpoints.
- Key settings:
  - `addMapping("/**")`
  - `allowedOrigins("http://localhost:3000")`
  - `allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")`
  - `allowedHeaders("*")`
  - `allowCredentials(true)`
- Why needed: Next.js dev server runs on `:3000` and backend on `:8080`; browser requests require explicit CORS allowlist.

#### WebSocketConfig.java

- File: `backend/src/main/java/com/musiclab/backend/config/WebSocketConfig.java`
- What it configures: STOMP broker and endpoint registration.
- Key settings:
  - `@EnableWebSocketMessageBroker`
  - `enableSimpleBroker("/topic")`
  - `setApplicationDestinationPrefixes("/app")`
  - `addEndpoint("/ws-studio").setAllowedOriginPatterns("*")`
- Why needed: Enables project-scoped publish/subscribe for live studio synchronization.

Snippet:

```java
@Override
public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic");
    config.setApplicationDestinationPrefixes("/app");
}

@Override
public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws-studio")
            .setAllowedOriginPatterns("*");
}
```

#### StorageConfig.java

- File: `backend/src/main/java/com/musiclab/backend/config/StorageConfig.java`
- What it configures: Audio storage directory existence.
- Key settings:
  - `@Value("${musiclab.storage.audio-dir:./storage/audio}")`
  - `@PostConstruct init()` creates directory if missing.
- Why needed: Upload endpoint requires deterministic writable path before first request.

#### DatabaseSeeder.java

- File: `backend/src/main/java/com/musiclab/backend/config/DatabaseSeeder.java`
- What it configures: Legacy runtime seed data path (Java seeding).
- Key settings:
  - `@ConditionalOnProperty(name = "musiclab.legacy-seeder.enabled", havingValue = "true", matchIfMissing = false)`
  - Checks `userRepository.count()` and skips if DB not empty.
  - Creates `TestProducer` and 3 track entities.
- Why needed: Optional fallback seeding route, though disabled by default in `application.properties` because Flyway owns DB initialization.

### 5.3 Domain Objects (Java I/O — Unit 2)

These classes represent DAW state or realtime payloads used by controllers/services.

Serializable note:

- `MusicProject`, `AudioTrack`, and `AudioRegion` implement `Serializable` because the save path uses `ObjectOutputStream` and `ObjectInputStream`.
- `serialVersionUID` is a version identifier for Java serialization compatibility checks between serialized bytes and class definitions.
- `StudioSyncMessage` does **not** implement `Serializable` in this codebase because it is used as a JSON STOMP payload, not Java object-stream persistence.

#### MusicProject

- Represents: Entire DAW session state.
- Implements Serializable: Yes.
- `serialVersionUID`: `1L`.
- Fields:
  - `String projectId`
  - `String userId`
  - `String projectName`
  - `int bpm`
  - `List<AudioTrack> tracks`

#### AudioTrack

- Represents: One track lane in a project.
- Implements Serializable: Yes.
- `serialVersionUID`: `1L`.
- Fields:
  - `String trackId`
  - `String name`
  - `double volume`
  - `boolean isMuted`
  - `List<AudioRegion> regions`

#### AudioRegion

- Represents: One clip region on timeline.
- Implements Serializable: Yes.
- `serialVersionUID`: `2L`.
- Fields:
  - `String sampleId`
  - `double startTime`
  - `double duration`
  - `String audioFileUrl`

#### StudioSyncMessage

- Represents: Realtime sync payload for WebSocket events.
- Implements Serializable: No (plain POJO for JSON deserialization).
- Fields:
  - `String projectId`
  - `String actionType`
  - `double playheadPosition`
  - `String trackId`
  - `String sourceClientId`

Snippet:

```java
public class StudioSyncMessage {
    private String projectId;
    private String actionType;
    private double playheadPosition;
    private String trackId;
    private String sourceClientId;

    public StudioSyncMessage() {}
    // getters/setters
}
```

### 5.4 JPA Entities (Unit 4)

#### UserEntity (`users`)

- Table mapping: `@Table(name = "users")`
- Special annotations:
  - `@Id`, `@GeneratedValue(strategy = GenerationType.IDENTITY)`
- Fields with column metadata:
  - `id` (`@Id`)
  - `username` (`@Column(nullable=false, unique=true, length=50)`)
  - `email` (`@Column(nullable=false, unique=true, length=100)`)
  - `passwordHash` (`@Column(name="password_hash", nullable=false, length=255)`)
  - `walletBalance` (`@Column(name="wallet_balance", nullable=false, precision=12, scale=2)`)

#### ProjectEntity (`projects`)

- Table mapping: `@Table(name = "projects")`
- Special annotations:
  - `@Lob` on `serializedData`
  - `@GeneratedValue(strategy = GenerationType.IDENTITY)`
  - `@Column(... updatable = false)` on `createdAt`
- Fields:
  - `id`
  - `projectId` -> `project_id`
  - `projectName` -> `project_name`
  - `userId` -> `user_id`
  - `serializedData` -> `serialized_data`
  - `createdAt` -> `created_at`

#### MarketTrackEntity (`market_tracks`)

- Table mapping: `@Table(name = "market_tracks")`
- Fields:
  - `id`
  - `projectId` -> `project_id`
  - `sellerId` -> `seller_id`
  - `title` (`length=200`)
  - `basePrice` -> `base_price` (`precision=10`, `scale=2`)
  - `listedAt` -> `listed_at` (`updatable=false`)

#### TransactionLedgerEntity (`transactions`)

- Table mapping: `@Table(name = "transactions")`
- Fields:
  - `id`
  - `buyerId` -> `buyer_id`
  - `trackId` -> `track_id`
  - `amountPaid` -> `amount_paid` (`precision=10`, `scale=2`)
  - `licenseType` -> `license_type` (`length=50`)
  - `transactionDate` -> `transaction_date` (`updatable=false`)

Entity field snippet example:

```java
@Column(name = "amount_paid", nullable = false, precision = 10, scale = 2)
private BigDecimal amountPaid;

@Column(name = "license_type", nullable = false, length = 50)
private String licenseType;

@Column(name = "transaction_date", nullable = false, updatable = false)
private Instant transactionDate;
```

### 5.5 Repository Layer (DAO Pattern — Unit 8)

All repositories are Spring Data interfaces extending `JpaRepository<Entity, Long>`.

What `JpaRepository` provides automatically:

- `save(...)`
- `findById(...)`
- `findAll()`
- `deleteById(...)`
- `count()`
- paging/sorting variants

Repository summary:

1. `UserRepository` manages `UserEntity`.
2. `ProjectRepository` manages `ProjectEntity` and adds custom `Optional<ProjectEntity> findByProjectId(String projectId)`.
3. `MarketTrackRepository` manages `MarketTrackEntity`.
4. `TransactionLedgerRepository` manages `TransactionLedgerEntity`.

Custom method snippet:

```java
@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
    Optional<ProjectEntity> findByProjectId(String projectId);
}
```

### 5.6 Service Layer

#### MarketplaceService

What it does:

- Implements the complete purchase transaction path.
- Validates buyer and track existence.
- Selects price strategy by license type.
- Checks wallet balance and throws `InsufficientFundsException` when insufficient.
- Deducts wallet amount and writes ledger row in a single transaction.

`purchaseTrack()` flow (numbered):

1. Read buyer from `UserRepository.findById(buyerId)`.
2. Read track from `MarketTrackRepository.findById(trackId)`.
3. Resolve `LicensePricingStrategy` with `resolvePricingStrategy(licenseType)`.
4. Compute `finalPrice = strategy.calculatePrice(track.getBasePrice())`.
5. Compare wallet: `buyer.getWalletBalance().compareTo(finalPrice) < 0` => throw `InsufficientFundsException`.
6. Subtract wallet balance and `userRepository.save(buyer)`.
7. Create `TransactionLedgerEntity` and `transactionLedgerRepository.save(transaction)`.
8. Return saved transaction.

`@Transactional` and rollback behavior:

- The method is annotated with `@Transactional`.
- Any runtime exception in steps 1–7 causes rollback of previous DB writes within the same transaction.
- Example: if balance deduction happens but transaction save fails, the deduction is rolled back.

Strategy selection code:

```java
private LicensePricingStrategy resolvePricingStrategy(String licenseType) {
    return switch (licenseType.toLowerCase()) {
        case "exclusive" -> new ExclusiveRightsStrategy();
        case "standard" -> new StandardLeaseStrategy();
        default -> {
            logger.warn("Unknown license type '{}'", licenseType);
            yield new StandardLeaseStrategy();
        }
    };
}
```

#### ProjectManagementService

What it does:

- Facade over serialization (`ProjectIioService`) plus persistence (`ProjectRepository`).
- Exposes high-level `saveProjectState(...)` and `loadProjectState(...)` methods to controllers.

`saveProjectState()` flow:

1. Serialize incoming `MusicProject` to bytes via `projectIioService.serializeProject(project)`.
2. Upsert-style lookup with `projectRepository.findByProjectId(project.getProjectId())`.
3. Fill entity fields (`projectId`, `projectName`, `userId`, `serializedData`).
4. Set `createdAt` only if entity is new (`id == null`).
5. Persist entity inside transaction with `projectRepository.save(entity)`.

`loadProjectState()` flow:

1. Query row by business ID via `projectRepository.findByProjectId(projectId)`.
2. Throw `RuntimeException` if not found.
3. Deserialize stored bytes with `projectIioService.deserializeProject(entity.getSerializedData())`.
4. Return reconstructed `MusicProject` to controller.

Facade behavior:

- Controller code remains simple and unaware of stream APIs or repository upsert logic.

#### ProjectIioService

What it does:

- Encapsulates Java object stream operations for `MusicProject`.

`ObjectOutputStream` usage:

- Creates `ByteArrayOutputStream` + `ObjectOutputStream`.
- Calls `oos.writeObject(project)` then `oos.flush()`.
- Returns `baos.toByteArray()`.

`ObjectInputStream` usage:

- Creates `ByteArrayInputStream` + `ObjectInputStream`.
- Reads object via `(MusicProject) ois.readObject()`.

Actual stream code:

```java
try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
     ObjectOutputStream oos = new ObjectOutputStream(baos)) {

    oos.writeObject(project);
    oos.flush();
    return baos.toByteArray();
}
```

```java
try (ByteArrayInputStream bais = new ByteArrayInputStream(data);
     ObjectInputStream ois = new ObjectInputStream(bais)) {

    MusicProject project = (MusicProject) ois.readObject();
    return project;
}
```

#### AudioFileStorageService

What it does:

- Stores uploaded audio files in configured directory using Java NIO.
- Loads files as Spring `Resource` for streaming.

UUID filename generation:

- Extracts original extension.
- Generates `uniqueFilename = UUID.randomUUID().toString() + extension`.
- Prevents naming collisions and preserves file type suffix for MIME resolution.

Path security check:

- Both store and load methods normalize resolved path and ensure `targetPath.startsWith(storageLocation)`.
- This blocks path traversal attempts (`..` style escapes).

Store/load methods snippet:

```java
String uniqueFilename = UUID.randomUUID().toString() + extension;
Path targetPath = storageLocation.resolve(uniqueFilename).normalize();
if (!targetPath.startsWith(storageLocation)) {
    throw new IOException("Cannot store file outside the configured storage directory");
}
Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
```

```java
Path filePath = storageLocation.resolve(filename).normalize();
if (!filePath.startsWith(storageLocation)) {
    throw new FileNotFoundException("File path traversal detected: " + filename);
}
Resource resource = new UrlResource(filePath.toUri());
```

### 5.7 Exception Handling

`GlobalExceptionHandler` uses `@RestControllerAdvice` to centralize exception-to-response mapping.

- `InsufficientFundsException` -> HTTP `402 PAYMENT_REQUIRED`, body `{status: "error", message: ...}`
- `RuntimeException` -> HTTP `400 BAD_REQUEST`, body `{status: "error", message: ...}`

Snippet:

```java
@ExceptionHandler(InsufficientFundsException.class)
public ResponseEntity<Map<String, String>> handleInsufficientFundsException(InsufficientFundsException ex) {
    return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
            "status", "error",
            "message", ex.getMessage()
    ));
}
```

Why centralized handling is better:

1. Keeps controllers smaller and consistent.
2. Guarantees stable error JSON shape.
3. Makes status-code policy easy to audit in one class.
4. Prevents repetitive try/catch blocks for common runtime failures.

---

## 6. REST API Reference (Unit 6/7)

### 1) Get All Marketplace Tracks
- **Method:** GET
- **URL:** `/api/v1/market/tracks`
- **Controller:** `MarketplaceController.java` (`getAllTracks()`)
- **AJT Unit:** Unit 7 (REST), Unit 4 (JPA retrieval)
- **Request Body:** None
- **Response Body:** JSON array of `MarketTrackEntity` objects
- **Success Status:** `200 OK`
- **Error Status:** Not explicitly mapped in method; framework-level errors possible
- **What it does:** Calls `marketTrackRepository.findAll()`, logs the request, and returns all marketplace listings as JSON.

### 2) Purchase Track
- **Method:** POST
- **URL:** `/api/v1/market/buy`
- **Controller:** `MarketplaceController.java` (`purchaseTrack()`)
- **AJT Unit:** Unit 7 (REST), Unit 4 (`@Transactional` service), Unit 8 (Strategy)
- **Request Body:**
  ```json
  {
    "buyerId": 1,
    "trackId": 5,
    "licenseType": "standard"
  }
  ```
- **Response Body:**
  ```json
  {
    "status": "success",
    "message": "Track purchased successfully",
    "transactionId": 12,
    "amountPaid": 29.99,
    "licenseType": "standard",
    "transactionDate": "2026-04-19T..."
  }
  ```
- **Success Status:** `200 OK`
- **Error Status:** `402 PAYMENT_REQUIRED` (insufficient funds), `400 BAD_REQUEST` (runtime input/lookup issues)
- **What it does:** Parses payload, delegates to `MarketplaceService.purchaseTrack`, and returns transaction metadata.

### 3) Upload Audio File
- **Method:** POST
- **URL:** `/api/v1/audio/upload`
- **Controller:** `AudioAssetController.java` (`uploadAudioFile()`)
- **AJT Unit:** Unit 7 (multipart REST), Unit 2 (NIO file write)
- **Request Body:** Multipart form data with `file`
- **Response Body:**
  ```json
  {
    "status": "success",
    "message": "Audio file uploaded successfully",
    "originalFilename": "beat.wav",
    "storedFilename": "uuid.wav",
    "sizeBytes": 123456,
    "streamUrl": "/api/v1/audio/stream/uuid.wav"
  }
  ```
- **Success Status:** `201 CREATED`
- **Error Status:** `400 BAD_REQUEST` (empty file), `500 INTERNAL_SERVER_ERROR` (I/O error)
- **What it does:** Stores uploaded file with UUID filename and returns stream path for playback.

### 4) Stream Audio File
- **Method:** GET
- **URL:** `/api/v1/audio/stream/{filename}`
- **Controller:** `AudioAssetController.java` (`streamAudioFile()`)
- **AJT Unit:** Unit 7 (REST), Unit 2 (NIO resource streaming)
- **Request Body:** None
- **Response Body:** Binary audio resource with MIME type
- **Success Status:** `200 OK`
- **Error Status:** `404 NOT_FOUND` when file missing
- **What it does:** Loads file as `Resource`, resolves MIME by extension (`mp3`, `wav`, `ogg`, `flac`, `aac/m4a`, `webm`), streams inline.

### 5) Save Studio Project
- **Method:** POST
- **URL:** `/api/v1/studio/save`
- **Controller:** `ProjectStudioController.java` (`saveProject()`)
- **AJT Unit:** Unit 2 (ObjectOutputStream), Unit 4 (`@Transactional` persistence), Unit 7
- **Request Body:** JSON matching `MusicProject`
- **Response Body:**
  ```json
  {
    "status": "success",
    "message": "Project saved successfully (Serialized via ObjectOutputStream → DB)",
    "projectId": "demo-project-001",
    "projectName": "AJT Demo Project"
  }
  ```
- **Success Status:** `200 OK`
- **Error Status:** `500 INTERNAL_SERVER_ERROR`
- **What it does:** Serializes project state and persists bytes via `ProjectManagementService.saveProjectState(project, 1L)`.

### 6) Load Studio Project
- **Method:** GET
- **URL:** `/api/v1/studio/load/{projectId}`
- **Controller:** `ProjectStudioController.java` (`loadProject()`)
- **AJT Unit:** Unit 2 (ObjectInputStream), Unit 4 (repository read), Unit 7
- **Request Body:** None
- **Response Body:** JSON `MusicProject` object
- **Success Status:** `200 OK`
- **Error Status:** `404 NOT_FOUND` (project absent), `500 INTERNAL_SERVER_ERROR` (deserialization/read issues)
- **What it does:** Reads serialized bytes from DB, deserializes project, and returns full DAW state.

### 7) Serialize Project (Utility)
- **Method:** POST
- **URL:** `/api/v1/studio/serialize`
- **Controller:** `ProjectStudioController.java` (`serializeProject()`)
- **AJT Unit:** Unit 2, Unit 7
- **Request Body:** JSON `MusicProject`
- **Response Body:**
  ```json
  {
    "status": "success",
    "projectId": "serialize-test-001",
    "serializedSizeBytes": 512,
    "serializedData": "BASE64..."
  }
  ```
- **Success Status:** `200 OK`
- **Error Status:** `500 INTERNAL_SERVER_ERROR`
- **What it does:** Serializes incoming project and returns Base64 bytes without DB persistence.

### 8) Deserialize Project (Utility)
- **Method:** POST
- **URL:** `/api/v1/studio/deserialize`
- **Controller:** `ProjectStudioController.java` (`deserializeProject()`)
- **AJT Unit:** Unit 2, Unit 7
- **Request Body:**
  ```json
  {
    "serializedData": "BASE64..."
  }
  ```
- **Response Body:**
  ```json
  {
    "status": "success",
    "message": "Project deserialized successfully via Java ObjectInputStream (Unit 2)",
    "project": { "projectId": "...", "tracks": [] }
  }
  ```
- **Success Status:** `200 OK`
- **Error Status:** `400 BAD_REQUEST` (missing or invalid Base64), `500 INTERNAL_SERVER_ERROR` (I/O/class errors)
- **What it does:** Decodes Base64, deserializes object bytes, and returns reconstructed project JSON.

### 9) WebSocket Studio Endpoint
- **Method:** WS (STOMP over WebSocket)
- **URL:** `/ws-studio`
- **Controller:** `WebSocketConfig.java` + `LiveStudioController.java`
- **AJT Unit:** Unit 3
- **Request Body:** STOMP message JSON (`StudioSyncMessage`) published to `/app/studio.sync`
- **Response Body:** Broadcast JSON to subscribers on `/topic/project/{projectId}`
- **Success Status:** WebSocket connect and subscription success (protocol-level)
- **Error Status:** STOMP error frames; disconnect/reconnect behavior via client config
- **What it does:** Accepts sync events from one client and broadcasts same event to all project subscribers.

---

## 7. WebSocket Architecture (Unit 3)

### 7.1 Overview

MusicLab uses STOMP over WebSocket so clients can send typed collaboration events to the backend and receive project-scoped broadcasts. STOMP is used instead of raw WebSocket text handling because it gives destination semantics (`/app/...`, `/topic/...`) and clean publish/subscribe flow.

### 7.2 Backend WebSocket Setup

`WebSocketConfig.java` provides the broker and endpoint wiring:

- STOMP broker (`enableSimpleBroker("/topic")`): in-memory broker for subscriber destinations.
- `/topic` prefix: clients subscribe here to receive broadcasts.
- `/app` prefix: client send destinations mapped to `@MessageMapping` handlers.
- `/ws-studio` endpoint: handshake path used by frontend STOMP client.

### 7.3 Backend Message Handler

`LiveStudioController.java` uses:

- `@MessageMapping("/studio.sync")` to handle client sends to `/app/studio.sync`.
- Incoming payload type: `StudioSyncMessage`.
- Broadcast destination pattern: `/topic/project/{projectId}`.
- Broadcast mechanism: `SimpMessagingTemplate.convertAndSend(destination, message)`.

Handler snippet:

```java
@MessageMapping("/studio.sync")
public void syncStudioEvent(StudioSyncMessage message) {
    String destination = "/topic/project/" + message.getProjectId();
    messagingTemplate.convertAndSend(destination, message);
}
```

### 7.4 Frontend WebSocket Client

`socketClient.ts` implements `StudioSocketClient` as singleton:

- `private static instance` + private constructor + `getInstance()`.
- Broker URL construction:
  - `(NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/^http/, "ws") + "/ws-studio"`
- `reconnectDelay: 5000` for auto-reconnect every 5 seconds.
- Subscribes to `/topic/project/${projectId}` in `onConnect` callback.
- `sendSyncEvent()` publishes JSON body to destination `/app/studio.sync`.
- Adds `sourceClientId` to each outgoing payload.

### 7.5 Complete Message Flow

Example: Tab 1 user mutes track -> Tab 2 sees muted track.

1. Tab 1 user clicks mute button in `StudioLayout.tsx` (`onClick={() => toggleTrackMute(track.trackId, false)}`).
2. `useStudioStore.ts` action `toggleTrackMute(trackId, isRemoteEvent=false)` toggles local state.
3. Same action calls `StudioSocketClient.getInstance().sendSyncEvent(currentProjectId, "TRACK_MUTE", trackId)`.
4. `socketClient.ts` publishes payload to STOMP destination `/app/studio.sync`.
5. `LiveStudioController.java` method `syncStudioEvent(...)` receives payload through `@MessageMapping`.
6. Backend computes destination `/topic/project/{projectId}` and broadcasts with `SimpMessagingTemplate`.
7. Tab 2 `socketClient.ts` subscription callback receives broadcast from `/topic/project/{projectId}`.
8. In `StudioLayout.tsx` socket callback, if `msg.actionType === "TRACK_MUTE"`, it calls `useStudioStore.getState().toggleTrackMute(msg.trackId, true)`.
9. Tab 2 store toggles mute locally, but because `isRemoteEvent=true`, it does not re-publish.
10. UI track row in Tab 2 updates mute indicator (`TrackRow.tsx` + sidebar mute state).

### 7.6 Echo Prevention

The `isRemoteEvent` boolean in `useStudioStore.toggleTrackMute(trackId, isRemoteEvent)` solves event echo loops.

How it works:

1. Local user action sets `isRemoteEvent=false`, so state updates and event is broadcast.
2. Remote replay from socket sets `isRemoteEvent=true`, so state updates but **no sendSyncEvent call**.

Additional guard in `socketClient.ts`:

- Each message carries `sourceClientId`.
- Subscription callback ignores messages where `payload.sourceClientId === this.clientId`.

Without these guards:

- Local mute would broadcast, receive own event back, toggle again, and potentially oscillate or spam repeated state changes.

---

## 8. Frontend Architecture

### 8.1 Next.js App Router Pages

| Route | File | Component | What it shows |
|---|---|---|---|
| `/` | `src/app/page.tsx` | `Home` -> `StudioLayout` inside `SidebarLayout` | Primary DAW studio workspace |
| `/marketplace` | `src/app/marketplace/page.tsx` | `MarketplacePage` -> `MarketplaceView` | Marketplace listing, filters, cart/player overlays |
| `/explore` | `src/app/explore/page.tsx` | `ExplorePage` | Genre cards, featured artists, platform stats |
| `/wishlist` | `src/app/wishlist/page.tsx` | `WishlistPage` | User wishlisted tracks with details modal and bottom player |
| `/login` | `src/app/login/page.tsx` | `LoginPage` | Mock login form connected to `useAuthStore.login()` |
| `/signup` | `src/app/signup/page.tsx` | `SignupPage` | Mock signup form with role selection |
| `/hooks-lab` | `src/app/hooks-lab/page.tsx` | `HooksLabPage` | Hook table UI with mock rows and controls |
| `/market/upload` | `src/app/market/upload/page.tsx` | `MarketUploadPage` | Track upload/listing form UI with cover preview |
| `/market/artist/[id]` | `src/app/market/artist/[id]/page.tsx` | `ArtistProfilePage` | Dynamic artist profile, discography cards, track grid |

### 8.2 State Management (Zustand Stores)

#### useStudioStore

State fields:

- `isPlaying: boolean`
- `isRehydrating: boolean`
- `bpm: number`
- `tracks: AudioTrack[]`
- `currentProjectId: string`

Actions:

- `togglePlay()`
- `setPlaying(playing)`
- `setRehydrating(rehydrating)`
- `setBpm(bpm)`
- `setTracks(tracks)`
- `addTrack(track)`
- `updateTrack(trackId, updates)`
- `addRegionToTrack(trackId, region)`
- `removeTrack(trackId)`
- `hydrateProject(bpm, tracks)`
- `setCurrentProjectId(id)`
- `toggleTrackMute(trackId, isRemoteEvent)`

Why `playheadPosition` is not in this store:

- The source contains an explicit critical note: playhead is intentionally excluded from state because it updates ~60 times/second.
- Storing it in Zustand/React state would trigger high-frequency rerenders and degrade DAW performance.

Critical comment theme in code:

- `requestAnimationFrame` + direct DOM mutation is used as performance bridge.
- Quote from source intent: avoid catastrophic rerenders from `setState` loops.

#### useMarketStore

State fields:

- `cart: CartItem[]`
- `isCartOpen: boolean`
- `wishlist: number[]`
- `activePreviewTrack: MarketTrack | null`
- `isPreviewPlaying: boolean`
- `allTracks: MarketTrack[]`
- `purchaseHistory: MarketTrack[]`
- `userRatings: Record<number, number>`

Cart operations:

- `addToCart(item)` (deduplicates by track ID and opens cart)
- `removeFromCart(trackId)`
- `clearCart()`
- `toggleCart()`
- `setCartOpen(open)`

Wishlist operations:

- `toggleWishlist(trackId)`
- `isInWishlist(trackId)`

Audio preview operations:

- `playPreview(track)`
- `pausePreview()`
- `resumePreview()`
- `stopPreview()`
- `playNext()` (cycles through `allTracks`)
- `playPrev()` (cycles backwards)

Rating system:

- `setRating(trackId, rating)` writes to `userRatings`
- `getRating(trackId)` reads stored user rating

#### useAuthStore

State managed:

- `user: User | null`
- `isLoggedIn: boolean`

Login/signup behavior:

- Mock implementation in both `login()` and `signup()`.
- No server auth request is performed.
- `login()` creates user from email prefix with role hardcoded to `producer`.
- `signup()` creates user with selected role and `id: Date.now()`.

Persistence mechanism:

- `persistUser()` saves/removes `musiclab_user` in `localStorage`.
- On module load in browser, store hydrates from `loadPersistedUser()`.

Available roles (`User["role"]`):

- `artist`
- `listener`
- `producer`

### 8.3 Audio Engine (Tone.js)

`AudioEngine.ts` is a singleton wrapper around Tone Transport and per-region players.

Key details:

1. Singleton pattern:
   - private constructor
   - static `instance`
   - static `getInstance()`
2. `initialize()` calls `Tone.start()` and sets `initialized=true`.
3. Browser gesture requirement:
   - The code comment and behavior acknowledge modern browser autoplay restrictions.
   - `initialize()` must be called from click/tap handlers.
4. `loadRegion(regionId, audioUrl, startTime)`:
   - disposes previous player for same region ID
   - creates `new Tone.Player()`
   - `player.toDestination()`
   - `await player.load(audioUrl)`
   - `player.sync().start(startTime)`
   - stores player in `Map<string, Tone.Player>`
5. Transport sync:
   - `play()` -> `Tone.getTransport().start()`
   - `pause()` -> `Tone.getTransport().pause()`
   - `stop()` -> `Tone.getTransport().stop(); position=0`
   - `setBpm(bpm)` -> `Tone.getTransport().bpm.value = bpm`
6. `getCurrentTime()` returns `Tone.getTransport().seconds`.
7. Why time is not React state:
   - `usePlayheadSync` reads this value directly per frame to avoid rerender overhead.
8. Players map lifecycle:
   - `disposeRegion(regionId)` removes one player
   - `disposeAll()` disposes all and clears map
   - `getLoadedRegionCount()` reports map size

Snippet:

```ts
private players: Map<string, Tone.Player> = new Map();

async loadRegion(regionId: string, audioUrl: string, startTime: number): Promise<void> {
  if (this.players.has(regionId)) {
    this.players.get(regionId)!.dispose();
    this.players.delete(regionId);
  }
  const player = new Tone.Player();
  player.toDestination();
  await player.load(audioUrl);
  player.sync().start(startTime);
  this.players.set(regionId, player);
}
```

### 8.4 Playhead Synchronization

`usePlayheadSync.ts` solves the visual playhead performance problem.

What problem it solves:

- Updating playhead position with React state at ~60 FPS would trigger frequent reconciliation and render cost.

How it works:

1. Starts a `requestAnimationFrame` loop in `useEffect`.
2. Each frame reads `AudioEngine.getInstance().getCurrentTime()`.
3. Converts seconds to x-coordinate with `pixelsPerSecond`.
4. Mutates DOM directly: `playheadRef.current.style.transform = ...`.
5. Stores RAF ID in ref and cancels on unmount.

Why this avoids rerenders:

- No Zustand state updates and no React state writes are used in the frame loop.
- Only one DOM element style is mutated.

Cleanup behavior:

- On effect cleanup, `cancelAnimationFrame(rafIdRef.current)` is called.

### 8.5 Studio Components

#### StudioLayout.tsx

What it renders:

- Header transport area (save/load, play/pause/stop/record button).
- Left sidebar track list with mute/solo/delete and track count.
- Main timeline with ruler and `Playhead` + `TrackRow` lanes.
- Optional right mixer panel and optional instruments panel.
- Footer status bar showing track/clip counts, play state, BPM, master volume.

Transport controls:

- Play/Pause: `handlePlayPause()` initializes `AudioEngine` if needed, then `engine.play()` or `engine.pause()`, and toggles store play state.
- Stop: `handleStop()` calls `engine.stop()`, sets playing false, resets elapsed timer.
- Record button: present as decorative UI (no recording workflow implementation in this file).

BPM control:

- +/- buttons call `handleBpmChange(bpm ± 1)`.
- Manual input clamps value between 20 and 300.
- Propagates to both store (`setBpm`) and audio engine (`setBpm`).

Metronome implementation:

- Uses Web Audio API directly, not Tone.
- Creates `AudioContext`, oscillator + gain, periodic ticks by interval `60 / bpm`.
- Active only when both `metronomeOn` and `isPlaying` are true.

Drag-and-drop audio handling:

- `handleTimelineDragOver`, `handleTimelineDragLeave`, `handleTimelineDrop`.
- Accepts first dropped audio file (`type.startsWith("audio/")`).
- Shared file path processing in `processAudioFile(file)`.

Save/Load flow:

- Save button -> `handleSaveProject()` -> `projectClient.saveProject(...)` with mapped track/region shape.
- Load button -> prompt project ID -> `handleLoadProject()`:
  - sets rehydrating
  - initializes/disposes audio engine
  - fetches project via `loadProject(projectId)`
  - calls `hydrateProject(...)`
  - reloads each region into engine via `loadRegion(...)`

Master volume control:

- UI-only `masterVolume` slider state is displayed and rendered.
- In this file, value is not currently routed into Tone destination gain.

Elapsed time timer:

- Uses `setInterval` every 100ms while `isPlaying`.
- Stops and clears interval when playback stops.

#### TrackRow.tsx

What it renders per track:

- One horizontal lane (`h-20`) with alternating background.
- Optional muted badge overlay (`Muted`) when `track.isMuted`.
- `RegionBlock` instances for each `track.regions` entry.
- Empty placeholder text (`Drop audio here`) when no regions.

Mute state display:

- Entire row opacity reduced when muted (`opacity-40`).
- Top-right label appears for muted tracks.

Region rendering:

- `track.regions.map(region => <RegionBlock key={region.sampleId} ... />)`.

#### Playhead.tsx

What it renders:

- Vertical red line element (`w-[2px] h-full`) with top circular handle.

Connection to `usePlayheadSync`:

- Creates `playheadRef` and passes it to `usePlayheadSync(playheadRef, PIXELS_PER_SECOND)`.
- No local state for playhead position.

#### RegionBlock.tsx

Position calculation:

- `left = region.startTime * PIXELS_PER_SECOND`

Width calculation:

- `width = region.duration * PIXELS_PER_SECOND`

Color assignment algorithm:

- Uses deterministic hash of `sampleId`.
- Maps hash modulo palette length to one of 5 predefined color objects.

Snippet:

```ts
function getRegionColor(sampleId: string) {
  let hash = 0;
  for (let i = 0; i < sampleId.length; i++) {
    hash = (hash * 31 + sampleId.charCodeAt(i)) | 0;
  }
  return REGION_COLORS[Math.abs(hash) % REGION_COLORS.length];
}
```

### 8.6 Marketplace Components

#### MarketplaceView.tsx

Backend status badge:

- States: `loading`, `connected`, `offline`.
- Labels:
  - connected -> `Live DB`
  - offline -> `Demo Mode`
  - loading -> `Connecting...`

How `backendStatus` is determined:

- After `getMarketTracks()`, it checks whether any track ID falls outside mock range 101–112.
- If yes -> real backend data assumed (`connected`).
- If all in 101–112 -> fallback mock mode (`offline`).

Search filter logic:

- Case-insensitive query against:
  - `title`
  - `artistName`
  - `tags[]`

Genre filter:

- Builds genre options from loaded tracks (`All` + unique genres).
- Filters where `t.genre === selectedGenre` unless `All`.

Sort options:

- `popular`: sort by rating descending.
- `price_asc`: `basePrice` ascending.
- `price_desc`: `basePrice` descending.
- `newest`: leaves fetched order unchanged.

LoadingSpinner usage:

- Displays `LoadingSpinner text="Loading Premium Tracks..."` while initial fetch pending.

#### MarketTrackCard.tsx

Features implemented:

- Cover image with skeleton until image load completes.
- Per-card preview play/pause toggle using `useMarketStore.playPreview/pausePreview`.
- Wishlist heart toggle with stateful fill style.
- Discount badge when `track.isDiscounted` true.
- Duration pill (`formatDuration(duration)`) overlay.
- Rating display (`rating.toFixed(1)`) with star icon.

#### TrackDetailsModal.tsx

License selection:

- Two options:
  - `standard`
  - `exclusive`

Price calculation:

- `licensePrice = standard ? basePrice : basePrice * 10`

Add to cart flow:

1. `handleAddToCart()` checks `isLoggedIn`.
2. If not logged in: close modal and route to `/login`.
3. If logged in: `addToCart({track, licenseType, price})`.
4. Closes modal.

Star rating component:

- `StarRating` subcomponent uses `userRatings` from store.
- `setRating(trackId, star)` writes selected value.
- Hover preview updates visual fill before click.

#### MarketAudioPlayer.tsx

Fixed bottom player bar:

- Renders at bottom with `fixed` positioning.
- Adjusts left edge to account for sidebar on sidebar routes (`left-[240px]`).

Progress bar click-to-seek:

- Click handler computes ratio from mouse x against bar width.
- Sets `audioRef.current.currentTime = ratio * duration`.

Track navigation:

- Previous button -> `playPrev()`.
- Next button -> `playNext()`.
- Ended event on `<audio>` also calls `playNext`.

Store integration:

- Reads from `useMarketStore`:
  - `activePreviewTrack`
  - `isPreviewPlaying`
  - `pausePreview`, `resumePreview`, `stopPreview`
  - `playNext`, `playPrev`

#### CartDrawer.tsx

3-step checkout flow:

1. `cart` step: item review and totals.
2. `details` step: billing + card input.
3. `confirm` step: order success screen.

GST calculation:

- `gst = Math.round(total * 0.18)`
- `grandTotal = total + gst`

Mock payment form:

- Captures card number, expiry, CVV, name on card.
- Performs frontend-only input formatting and minimal non-empty checks.

Order confirmation:

- On successful purchase loop:
  - generates `orderId = ML-${Date.now().toString(36).toUpperCase()}`
  - marks order complete
  - clears cart
  - shows confirmation panel

### 8.7 API Client Layer

#### marketClient.ts

`getMarketTracks()` with backend fallback:

- Tries `fetch(${API_BASE_URL}/api/v1/market/tracks)`.
- On fetch failure: logs warning and returns `enhanceWithMockData([])`.

Mock data enhancement:

- Enriches tracks with frontend display fields not provided by backend entity:
  - `artistName`, `genre`, `bpm`, `duration`, `coverUrl`, `previewUrl`, `rating`, `reviewCount`, `tags`, `description`, discount fields.
- If backend list empty, uses explicit mock fallback IDs 101–112.

Indian marketplace mock data:

- Artists include names like `Aarav Beats`, `Raga Revival`, `NeonRaga`.
- Genres include `Bollywood`, `Classical Fusion`, `Sufi`, `Lo-Fi`, etc.
- Cover URLs use Unsplash image set.

`purchaseTrack()` request shape:

```ts
await fetch(`${API_BASE_URL}/api/v1/market/buy`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ trackId, licenseType, buyerId }),
});
```

#### audioClient.ts

`uploadAudioFile()` multipart submission:

- Builds `FormData` and appends file under key `file`.
- POSTs to `/api/v1/audio/upload`.
- Throws error when response is not ok.

`getStreamUrl()` URL construction:

- Returns `${API_BASE_URL}${streamPath}`.

#### projectClient.ts

`saveProject()` request shape:

- Sends `MusicProjectPayload` JSON to `/api/v1/studio/save`.
- Includes project metadata + tracks + regions.

`loadProject()` response shape:

- Returns parsed `MusicProjectPayload` JSON from `/api/v1/studio/load/{projectId}`.

#### socketClient.ts

Broker URL construction:

- `(NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/^http/, "ws") + "/ws-studio"`

STOMP Client configuration:

- `brokerURL: wsUrl`
- `reconnectDelay: 5000`
- `onConnect`, `onDisconnect`, `onStompError` handlers

Subscription management:

- Connect method subscribes to `/topic/project/${projectId}`.
- Reconnect/disconnect logic handles project switching and cleanup.

`sendSyncEvent()` publish:

- Publishes JSON payload to `/app/studio.sync` with `sourceClientId` included.

---

## 9. Design Patterns (Unit 8)

### 9.1 Strategy Pattern — License Pricing

`LicensePricingStrategy` interface:

```java
public interface LicensePricingStrategy {
    BigDecimal calculatePrice(BigDecimal basePrice);
}
```

`StandardLeaseStrategy`:

```java
@Override
public BigDecimal calculatePrice(BigDecimal basePrice) {
    return basePrice;
}
```

`ExclusiveRightsStrategy`:

```java
private static final BigDecimal EXCLUSIVE_MULTIPLIER = new BigDecimal("10.0");

@Override
public BigDecimal calculatePrice(BigDecimal basePrice) {
    return basePrice.multiply(EXCLUSIVE_MULTIPLIER);
}
```

Runtime strategy selection in `MarketplaceService`:

```java
return switch (licenseType.toLowerCase()) {
    case "exclusive" -> new ExclusiveRightsStrategy();
    case "standard" -> new StandardLeaseStrategy();
    default -> new StandardLeaseStrategy();
};
```

Why better than chained if-else:

1. Encapsulates pricing rules in separate classes.
2. Easier to add new licenses without touching transaction logic.
3. Keeps service focused on orchestration, not formula branching.

### 9.2 Singleton Pattern — AudioEngine

Pattern elements in `AudioEngine.ts`:

- Private constructor.
- Static instance field.
- Static `getInstance()` accessor.

Code:

```ts
class AudioEngine {
  private static instance: AudioEngine | null = null;
  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }
}
```

Why singleton here:

- Tone Transport should remain a single timing authority.
- Multiple engine instances would create conflicting playback clocks and duplicate audio contexts.

### 9.3 Singleton Pattern — StudioSocketClient

`socketClient.ts` applies same pattern:

```ts
class StudioSocketClient {
  private static instance: StudioSocketClient | null = null;
  private constructor() {}

  static getInstance(): StudioSocketClient {
    if (!StudioSocketClient.instance) {
      StudioSocketClient.instance = new StudioSocketClient();
    }
    return StudioSocketClient.instance;
  }
}
```

Why singleton here:

- Avoids multiple competing STOMP connections from same tab context.
- Centralizes project subscription and connection state.

### 9.4 Facade Pattern — ProjectManagementService

Facade target:

- Hides serialization details + repository upsert + transaction boundary behind simple service methods.

Public method signature example:

```java
@Transactional
public void saveProjectState(MusicProject project, Long userId)
```

Behind the scenes during save:

1. Serializes object graph to bytes.
2. Looks up existing row by business project ID.
3. Creates/updates entity fields.
4. Maintains `createdAt` behavior for new rows only.
5. Persists under transaction.

### 9.5 DAO Pattern — Repository Layer

What DAO means in this project:

- Repository interfaces abstract data access logic from services/controllers.
- Spring Data auto-generates concrete implementations.

Example repository:

```java
@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
    Optional<ProjectEntity> findByProjectId(String projectId);
}
```

JpaRepository methods available for free:

- `save`
- `findById`
- `findAll`
- `delete`
- `count`

Custom method required by project:

- `findByProjectId()` for business-key load path.

---

## 10. AJT Syllabus Coverage

| AJT Unit | Topic | Where Implemented | Files | How to See It |
|---|---|---|---|---|
| Unit 2 | ObjectOutputStream serialization | `ProjectIioService.serializeProject()` | `backend/src/main/java/com/musiclab/backend/service/ProjectIioService.java` | Trigger `POST /api/v1/studio/serialize` or `POST /api/v1/studio/save` |
| Unit 2 | ObjectInputStream deserialization | `ProjectIioService.deserializeProject()` | `backend/src/main/java/com/musiclab/backend/service/ProjectIioService.java` | Trigger `POST /api/v1/studio/deserialize` or `GET /api/v1/studio/load/{id}` |
| Unit 2 | Java NIO file copy | `AudioFileStorageService.storeAudioFile()` uses `Files.copy` | `backend/src/main/java/com/musiclab/backend/service/AudioFileStorageService.java` | Upload an audio file via `/api/v1/audio/upload` |
| Unit 2 | Java NIO resource streaming | `AudioFileStorageService.loadAudioFileAsResource()` uses `UrlResource` | `backend/src/main/java/com/musiclab/backend/service/AudioFileStorageService.java` | Stream with `/api/v1/audio/stream/{filename}` |
| Unit 2 | Serializable domain modeling | `MusicProject`, `AudioTrack`, `AudioRegion` | `backend/src/main/java/com/musiclab/backend/domain/*.java` | Inspect class declarations and `serialVersionUID` |
| Unit 3 | WebSocket STOMP protocol | Broker and endpoint setup | `backend/src/main/java/com/musiclab/backend/config/WebSocketConfig.java` | Connect frontend and inspect WS frames |
| Unit 3 | STOMP endpoint registry | `registerStompEndpoints` | `backend/src/main/java/com/musiclab/backend/config/WebSocketConfig.java` | `/ws-studio` handshake path |
| Unit 3 | Message mapping | `@MessageMapping("/studio.sync")` | `backend/src/main/java/com/musiclab/backend/controller/LiveStudioController.java` | Publish from client to `/app/studio.sync` |
| Unit 3 | Server broadcast | `SimpMessagingTemplate.convertAndSend(...)` | `backend/src/main/java/com/musiclab/backend/controller/LiveStudioController.java` | Observe topic broadcasts to subscribed tabs |
| Unit 3 | JS STOMP client | Singleton client + subscriptions | `frontend/src/lib/api/socketClient.ts` | Open two tabs and mute track |
| Unit 4 | JPA entities | `@Entity` classes for all core tables | `backend/src/main/java/com/musiclab/backend/entity/*.java` | Inspect table/column mappings |
| Unit 4 | Transaction boundary (market) | `@Transactional purchaseTrack()` | `backend/src/main/java/com/musiclab/backend/service/MarketplaceService.java` | Run purchase success/failure scenarios |
| Unit 4 | Transaction boundary (project save) | `@Transactional saveProjectState()` | `backend/src/main/java/com/musiclab/backend/service/ProjectManagementService.java` | Save project and inspect DB row update |
| Unit 4 | Flyway migration ownership | `V1` + `V2` SQL migration files | `backend/src/main/resources/db/migration/*.sql` | Startup logs show migration status |
| Unit 4 | Repository DAO use | `JpaRepository` interfaces | `backend/src/main/java/com/musiclab/backend/repository/*.java` | Services call repositories directly |
| Unit 4 | Supabase PostgreSQL connection | JDBC datasource properties | `backend/src/main/resources/application.properties` | DB URL defaults to Supabase host |
| Unit 6/7 | REST controllers | `@RestController` classes | `backend/src/main/java/com/musiclab/backend/controller/*.java` | Inspect endpoint mappings |
| Unit 6/7 | Method mapping annotations | `@GetMapping`, `@PostMapping` | Controller files above | Trigger requests from `API_TESTS.http` |
| Unit 6/7 | Parameter binding | `@RequestBody`, `@PathVariable`, `@RequestParam` | Controllers | Compare request shapes and method signatures |
| Unit 6/7 | HTTP response control | `ResponseEntity` with explicit statuses | Controllers + exception handler | Observe 200/201/400/402/404/500 responses |
| Unit 6/7 | Centralized error handling | `@RestControllerAdvice` | `backend/src/main/java/com/musiclab/backend/exception/GlobalExceptionHandler.java` | Throw service exceptions and inspect JSON body |
| Unit 6/7 | CORS setup | `CorsConfig.addCorsMappings` | `backend/src/main/java/com/musiclab/backend/config/CorsConfig.java` | Frontend requests from `localhost:3000` |
| Unit 8 | Strategy Pattern | License pricing strategies | `backend/src/main/java/com/musiclab/backend/strategy/*.java`, `MarketplaceService.java` | Purchase standard vs exclusive |
| Unit 8 | Singleton Pattern | `AudioEngine` | `frontend/src/lib/audio/AudioEngine.ts` | `AudioEngine.getInstance()` usage in studio |
| Unit 8 | Singleton Pattern | `StudioSocketClient` | `frontend/src/lib/api/socketClient.ts` | `StudioSocketClient.getInstance()` in studio layout |
| Unit 8 | Facade Pattern | `ProjectManagementService` | `backend/src/main/java/com/musiclab/backend/service/ProjectManagementService.java` | Controller calls one method to do many internal steps |
| Unit 8 | DAO Pattern | Repository interfaces | `backend/src/main/java/com/musiclab/backend/repository/*.java` | Service layer depends on repository contracts |

---

## 11. Data Flow Diagrams

### 11.1 User Purchases a Track

1. User clicks **Add to Cart** in `TrackDetailsModal.tsx` (`handleAddToCart()`).
2. `useMarketStore.addToCart({ track, licenseType, price })` stores cart item and opens drawer.
3. User opens `CartDrawer.tsx` and proceeds from `step="cart"` to `step="details"` via `handleProceedToCheckout()`.
4. User enters payment details; clicks pay button -> `handlePlaceOrder()`.
5. `handlePlaceOrder()` loops cart items and calls `marketClient.purchaseTrack(track.id, licenseType, 1)`.
6. `marketClient.ts` sends POST `/api/v1/market/buy` with JSON body.
7. `MarketplaceController.purchaseTrack()` parses payload and calls `MarketplaceService.purchaseTrack(...)`.
8. `MarketplaceService` fetches buyer and track, selects pricing strategy, validates wallet, deducts balance, saves transaction ledger row.
9. Service returns `TransactionLedgerEntity`; controller returns success JSON.
10. Frontend marks checkout complete, generates order ID (`ML-...`), clears cart, and shows confirmation UI.

### 11.2 User Saves a Studio Project

1. User clicks Save in `StudioLayout.tsx` -> `handleSaveProject()`.
2. Method reads current state from `useStudioStore.getState()`.
3. It builds payload shape expected by backend (`projectId`, `userId`, `projectName`, `bpm`, `tracks`, `regions`).
4. Calls `projectClient.saveProject(payload)`.
5. Client sends POST `/api/v1/studio/save`.
6. `ProjectStudioController.saveProject()` receives JSON as `MusicProject`.
7. Controller delegates to `ProjectManagementService.saveProjectState(project, 1L)`.
8. Service serializes via `ProjectIioService.serializeProject(project)`.
9. Service upserts `ProjectEntity` by `projectId` and writes serialized bytes.
10. Controller returns success response; frontend shows "Project Saved!" alert.

### 11.3 User Loads a Studio Project

1. User clicks Load in `StudioLayout.tsx` -> `handleLoadProject()`.
2. Prompt asks for `projectId`.
3. Method sets rehydration flag (`setRehydrating(true)`), initializes audio engine if needed, and clears existing players (`disposeAll()`).
4. Calls `projectClient.loadProject(projectId)`.
5. Client sends GET `/api/v1/studio/load/{projectId}`.
6. `ProjectStudioController.loadProject()` delegates to `ProjectManagementService.loadProjectState(projectId)`.
7. Service fetches `ProjectEntity` by business ID, deserializes bytes via `ProjectIioService.deserializeProject(...)`.
8. Backend returns reconstructed project JSON.
9. Frontend maps tracks/regions to store shape and calls `hydrateProject(data.bpm, hydratedTracks)`.
10. Frontend iterates all regions and calls `AudioEngine.loadRegion(...)` for each clip, then clears rehydration flag.

### 11.4 Audio File Upload and Playback

1. User drops audio file in timeline (`StudioLayout.tsx` -> `handleTimelineDrop`) or selects via file input (`handleFileUpload`).
2. Both paths call shared `processAudioFile(file)`.
3. Method ensures `AudioEngine.initialize()` has run.
4. Calls `audioClient.uploadAudioFile(file)` with multipart `FormData`.
5. Backend `AudioAssetController.uploadAudioFile()` validates non-empty file and delegates to `AudioFileStorageService.storeAudioFile(file)`.
6. Storage service generates UUID filename, performs path security check, writes file with `Files.copy(...)`.
7. Backend responds with `streamUrl` (`/api/v1/audio/stream/{storedFilename}`).
8. Frontend converts stream path to absolute URL via `getStreamUrl(streamUrl)`.
9. Frontend adds region to track in store (`addRegionToTrack(...)`).
10. Frontend loads clip into Tone engine (`AudioEngine.loadRegion(regionId, streamUrl, 0)`), enabling timeline playback.

### 11.5 Real-Time Track Mute Sync

1. Tab 1 clicks mute (`StudioLayout.tsx` mute button).
2. `useStudioStore.toggleTrackMute(trackId, false)` toggles local mute and calls `sendSyncEvent(...)`.
3. `socketClient.ts` publishes STOMP payload to `/app/studio.sync` with `sourceClientId`.
4. Backend `LiveStudioController.syncStudioEvent()` receives payload.
5. Backend broadcasts to `/topic/project/{projectId}`.
6. Tab 2 subscription in `socketClient.ts` receives payload.
7. Client checks `sourceClientId`; if not self, callback runs.
8. Callback in `StudioLayout.tsx` calls `toggleTrackMute(trackId, true)`.
9. Store toggles mute but does not re-broadcast because `isRemoteEvent=true`.
10. Tab 2 UI reflects mute immediately (track row and sidebar mute state).

---

## 12. How to Run the Project

### 12.1 Prerequisites

- Java 17
- Maven 3.9+
- Node.js 18+
- npm
- Supabase account with a PostgreSQL project
- VS Code (recommended)
- VS Code extension: REST Client (Huachao Mao)

### 12.2 Environment Setup

Backend `.env` template from `backend/.env.example`:

```env
DB_URL=jdbc:postgresql://db.certebkfbrihcmvtzcuw.supabase.co:5432/postgres?sslmode=require
DB_USERNAME=postgres
DB_PASSWORD=YOUR_SUPABASE_DB_PASSWORD
# SERVER_PORT=8080
```

Setup steps:

1. Copy `backend/.env.example` -> `backend/.env`.
2. Set `DB_PASSWORD` to real Supabase DB password.
3. Optionally override `DB_URL`, `DB_USERNAME`, or `SERVER_PORT`.
4. Run `start-supabase.ps1`; script validates non-empty DB vars before launch.

`start-supabase.ps1` behavior highlights:

- Loads key/value lines from `.env`.
- Ignores comments/blank lines.
- Supports quoted values.
- Exits with error if `DB_PASSWORD`, `DB_URL`, or `DB_USERNAME` are missing.
- Runs backend via `./mvnw.cmd spring-boot:run`.

### 12.3 Database Setup

1. Open Supabase dashboard.
2. Open SQL Editor.
3. Run `DATABASE_SCHEMA.sql` from repository root.
4. Verify tables exist: `users`, `projects`, `market_tracks`, `transactions`.
5. Verify seeded tracks exist in `market_tracks`:
   - `Lofi Study Beat`
   - `Cyberpunk Synthwave`
   - `Acoustic Guitar Loop`

### 12.4 Starting the Backend

```powershell
cd D:/Music-Lab/backend
copy .env.example .env
# Edit .env and add your DB_PASSWORD
.\start-supabase.ps1
```

What to look for in startup logs:

1. Script output prints `Starting backend with Supabase datasource...`.
2. Spring Boot app starts with `MusicLabApplication`.
3. Flyway output indicates migration status (`Successfully applied ...` or schema up to date).
4. Server reports Tomcat started on port `8080` (as configured in `application.properties`).

### 12.5 Starting the Frontend

```bash
cd D:/Music-Lab/frontend
npm install
npm run dev
```

Open: http://localhost:3000

### 12.6 Verifying Everything Works

- [ ] Backend starts successfully with no missing env variable errors.
- [ ] Frontend loads root studio page at `http://localhost:3000`.
- [ ] Marketplace page (`/marketplace`) shows cards and status badge.
- [ ] `GET /api/v1/market/tracks` returns `200` in REST Client.
- [ ] Upload endpoint accepts a test audio file and returns `201`.
- [ ] Dropped/uploaded audio appears as region block in Studio timeline.
- [ ] Save button creates a project (`POST /api/v1/studio/save` success).
- [ ] Load button rehydrates a saved project (`GET /api/v1/studio/load/{id}` success).
- [ ] Two browser tabs receive mute sync over WebSocket.
- [ ] Cart checkout flow reaches confirmation and clears cart.

---

## 13. Known Limitations and Honest Notes

| Feature | Status | Reason | Impact on Demo |
|---|---|---|---|
| Authentication | Mock (not JWT) | `useAuthStore` creates user objects locally; no backend auth endpoint or token issuance | Login/signup screens work for demo, not production security |
| Audio upload availability | Requires running backend | Upload path calls `/api/v1/audio/upload` and local storage service | Without backend, upload in Studio fails |
| WebSocket deployment scope | Localhost-oriented by default | Client URL built from `NEXT_PUBLIC_API_URL` default `http://localhost:8080` -> ws | Works in local demo; cross-network deployment needs environment setup |
| MetaMask console noise | External browser extension conflict | Mentioned in `DEMO_GUIDE.md` known limitations | No functional impact on project features |
| User registration persistence | localStorage-only | `musiclab_user` stored in browser via `persistUser()` | Account data not persisted server-side |
| Marketplace data realism | Hybrid with mock fallback | `marketClient.enhanceWithMockData` synthesizes IDs `101-112` and extra fields when backend unavailable | Demo remains usable offline but not fully DB-driven |

---

## 14. Glossary

| Term | Definition |
|---|---|
| STOMP | Simple Text Oriented Messaging Protocol used on top of WebSocket for destination-based messaging (`/app`, `/topic`). |
| ACID | Transaction properties (Atomicity, Consistency, Isolation, Durability) relevant to `@Transactional` purchase/save flows. |
| @Transactional | Spring annotation that wraps method DB operations in a transaction with rollback on failure. |
| Flyway | Migration tool that applies versioned SQL scripts (`V1`, `V2`) in order. |
| Supabase | Hosted PostgreSQL platform used by this project as external DB backend. |
| ORM | Object Relational Mapping; maps Java objects to SQL tables/rows. |
| JPA | Java Persistence API used through Spring Data JPA for entity/repository persistence. |
| Serialization | Converting an object graph to bytes (`MusicProject` -> `byte[]`) for storage/transmission. |
| ObjectOutputStream | Java I/O stream class used to serialize objects into bytes. |
| Tone.js | Web audio library used for transport control and sample playback in frontend. |
| Transport (Tone) | Global Tone timing/playback timeline (`Tone.getTransport()`). |
| requestAnimationFrame | Browser API used for 60fps visual updates (playhead sync) without state rerenders. |
| Zustand | Lightweight state manager used for studio, market, and auth stores. |
| DAW | Digital Audio Workstation; timeline-based music production interface. |
| BYTEA | PostgreSQL binary data type; related concept to storing serialized bytes in project data. |
| OID | PostgreSQL object identifier/large object reference type; `serialized_data` is declared as `oid` in migration. |
| idempotent | Safe to run repeatedly with same result; used by migration SQL (`if not exists`, `where not exists`). |
| Strategy Pattern | Design pattern where interchangeable pricing algorithms implement a shared interface. |
| Singleton Pattern | Pattern ensuring only one shared instance (used by `AudioEngine` and `StudioSocketClient`). |
| Facade Pattern | Pattern that exposes simple methods over complex subsystems (used by `ProjectManagementService`). |
| DAO Pattern | Data Access Object abstraction implemented via repository interfaces over persistence operations. |
| CORS | Cross-Origin Resource Sharing browser policy controlled by backend allowlist settings. |
| REST | HTTP resource API style using verbs (`GET`, `POST`) and status codes. |
| WebSocket | Persistent duplex connection used for realtime studio collaboration. |
| MIME type | Content type metadata for streamed audio (`audio/mpeg`, `audio/wav`, etc.). |
| UUID | Universally unique identifier used to generate collision-resistant stored audio filenames. |
| Base64 | Text encoding for binary bytes used in serialize/deserialize utility endpoints. |
| Hydration | In this project context, restoring UI/audio state from loaded project data into store and engine. |
