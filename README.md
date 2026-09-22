# Purpose

Shared MongoDB 8.3 instance for the Prime Host Stays project. This repository owns only the database container, its first-boot initialisation, and its operational documentation — it contains no application code. The two API services (`primehoststays.com-api`, `primehoststays-admin-api`) authenticate as separate least-privilege Mongo users and share collections per the permission matrix below.

# Topology

- Container: `primehoststays-mongo` (`mongo:8.3.11-noble`, fixed container name for ops).
  - Pinned to the current MongoDB 8.3 stable because the previous 8.0.32 pin tripped MongoDB's upstream TCMalloc/rseq kernel-version graceful-exit (SERVER-125742) on the shared dev target. 8.3.11 carries the workaround from 8.3.9 and the latest CVE fixes. Bump on the next 8.3 patch release that ships additional CVEs.
- Network: `phs-rest-dev` (user-defined external bridge, created by the deployer on the shared target).
- Volume: `phs-mongo-data` (named volume holding `/data/db`).
- Reachability: API containers reach the database as `mongo:27017` over `phs-rest-dev`. The host port publish is loopback-only (`127.0.0.1`).

# Configuration

All configuration comes from the repository's gitignored `.env` at deploy time (see `.env.example` for the exact key set). Required variables — names only, never commit real values:

- `MONGO_INITDB_ROOT_USERNAME`
- `MONGO_INITDB_ROOT_PASSWORD`
- `PHS_COM_API_USERNAME`
- `PHS_COM_API_PASSWORD`
- `PHS_ADMIN_API_USERNAME`
- `PHS_ADMIN_API_PASSWORD`

Compose fails fast (`${VAR:?error}`) if any required variable is missing.

# Runbook

**Reset** (CAUTION: destroys all data):

```
docker compose down -v && docker compose up -d
```

**Shell as app user:**

```
docker exec -it primehoststays-mongo mongosh phs -u phs_admin -p "$PHS_ADMIN_API_PASSWORD"
```

**Shell as root:**

```
docker exec -it primehoststays-mongo mongosh admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD"
```

**Logs:**

```
docker logs -f primehoststays-mongo
```

**Smoke test from host** (expect `1`):

```
docker exec primehoststays-mongo mongosh --quiet --eval 'db.getSiblingDB("phs").runCommand({ping:1}).ok'
```

# Credential rotation

**App user** (`phs_com` as the example; same shape for `phs_admin`):

```
docker exec primehoststays-mongo mongosh phs -u phs_admin -p "$OLD" --eval 'db.changeUserPassword("phs_com","$NEW")'
```

then update the repo `.env`, then redeploy `primehoststays.com-api`. Do **NOT** redeploy mongo — the init scripts do not re-run, and a data-dir reset is not required for password rotation.

**Root** (same shape against the `admin` database):

```
docker exec primehoststays-mongo mongosh admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$OLD" --eval 'db.changeUserPassword("root","$NEW")'
```

then update `MONGO_INITDB_ROOT_PASSWORD` in the repo `.env`. No service redeploy is needed for root rotation unless services authenticate as root (they do not).

# Permission boundaries

All roles are scoped to database `phs`; app users authenticate with `authSource=phs`.

| Collection | phsComApiRole (`phs_com`) | phsAdminApiRole (`phs_admin`) |
|---|---|---|
| `users` | — (no access) | RW (find/insert/update/remove/createIndex) |
| `reservations` | — (no access) | RW |
| `prime_images` | — (no access) | RW |
| `contactForms` | RW | — |
| `propertyManagementForms` | RW | — |
| `guests` | RW | RW |
| `owners` | RW | RW |
| `listings` | RW | RW |
| `property_photos` | RW | RW |
| `calendars` | RW | RW |
| `blog_posts` | RW | RW |
| `bookingRequests` | RW | RW |
| `conversations` | RW | RW |
| `conversationPosts` | RW | RW |
| `guesty_config` | RW | RW |
| (db metadata) | `listCollections` | `listCollections` |

Key boundary: `phs_com` cannot read `users`, `reservations`, or `prime_images`. Neither app user has admin-database access; the root user is reserved for ops.

# Disclaimers

- Development only. This instance serves the shared `phs.rest` dev target; data is disposable per platform policy and does not survive deploys or environment resets.
- No backups are configured at the dev tier; treat any state you care about as ephemeral.
