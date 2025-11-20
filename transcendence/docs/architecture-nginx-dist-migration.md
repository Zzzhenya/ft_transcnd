# Frontend Static Delivery Architecture: Before vs Now

This document explains how the frontend was served before (leading to MIME/hash mismatches), what changed, and how the current architecture works. It also includes rationale, tradeoffs, and operational guidance.

## Summary
- Before: Nginx served static files from a host-mounted `dist` directory while a separate frontend container also produced newer builds. Deployments often mixed `index.html` from one build with `assets/*.js` from another. Browsers requested old hashed filenames → Nginx returned `index.html` (text/html) → MIME type errors.
- Now: A multi-stage Docker build bakes the frontend `dist` into the Nginx image. Nginx serves a single, consistent build copied to `/usr/share/nginx/html`. `index.html` is set to `no-store` caching, and `/assets` are `immutable` long-cached. This prevents hash mismatches.

---

## Previous Architecture (Problematic)

- Components:
  - `frontend` container: built artifacts (sometimes via `vite preview` or local `npm run build`).
  - `nginx` container: served static files from `/usr/share/nginx/html`.
  - docker-compose mounted: `./transcendence/frontend/dist:/usr/share/nginx/html:ro`.

- How it worked:
  - The frontend was built in one place (host or container) and mounted into Nginx at runtime.
  - Nginx served `index.html` and `/assets/*` from the mounted `dist`.
  - Nginx also proxied `/api` and `/ws` paths to the gateway.

- Issues encountered:
  1) Artifact mismatch between `index.html` and `/assets/*`:
     - Multiple builds existed simultaneously (e.g., older dist in Nginx vs newer dist in frontend container).
     - `index.html` referenced hashed filenames (e.g., `index-ABC.js`) that did not exist in Nginx’s mounted directory, or vice versa.
     - Result: Browser requested a missing `*.js` → Nginx fell back to SPA `index.html` → Content-Type `text/html` served for `.js` → “disallowed MIME type (text/html)”.
  2) Cache-related problems:
     - `index.html` was cached by browsers/CDNs, so users kept an old `index.html` that referenced old hashes after a new deploy.
     - Even if assets were present, stale `index.html` kept pointing to old filenames.
  3) Non-atomic deploys:
     - Copying or rebuilding only parts of `dist` led to mixed artifacts.
     - Different team members rebuilt at different times causing inconsistent mount contents.

- Consequence: Intermittent 404s, MIME errors, and inconsistent experiences across machines/branches.

---

## Current Architecture (Fixed)

- Components:
  - Single Nginx image built via a multi-stage Dockerfile: `transcendence/nginx/Dockerfile`.
  - Stage 1 (`node:18-alpine`): performs `npm ci && npm run build` for the frontend.
  - Stage 2 (`nginx:1.25-alpine`): copies `/app/frontend/dist` into `/usr/share/nginx/html` and runs Nginx.
  - No runtime mount for `dist`.

- Key Nginx config improvements:
  - `include /etc/nginx/mime.types;` ensures `.js` served as `application/javascript`.
  - Explicit cache policy:
    - `location = /index.html { Cache-Control: no-store, must-revalidate }` → browsers always fetch fresh `index.html` to get the newest hash references.
    - `location /assets/ { expires 1y; Cache-Control: public, immutable }` → hashed assets are long-cached.
  - SPA fallback remains:
    - `location / { try_files $uri $uri/ /index.html; }`.
  - API/WebSocket proxy rules preserved (e.g., `/api`, `/ws`).

- Vite env at build time:
  - Dockerfile sets:
    - `VITE_API_BASE=/api`
    - `VITE_GATEWAY_BASE=/api`
    - `VITE_WS_BASE=/ws`
  - These are inlined into the production bundle at build time, eliminating runtime env file dependency.

- Result:
  - Nginx ships with one coherent `dist`. No local mounts.
  - `index.html` always refreshes, ensuring asset hashes are consistent.
  - Hash mismatch and MIME errors are eliminated by construction.

---

## How Requests Flow Now

1) Browser requests `https://<host>:8443/` → Nginx serves `/usr/share/nginx/html/index.html` with `no-store` caching.
2) Browser requests hashed assets referenced by that index (e.g., `/assets/index-XYZ.js`) → Nginx serves file with correct MIME type and long cache.
3) API calls (e.g., `/api/...`) → Nginx rewrites and proxies to `gateway:3000`.
4) WebSockets (e.g., `/ws/...`) → proxied to `gateway:3000` with upgrade headers.

---

## Why the Previous Setup Broke and This Works

- Before:
  - Two sources of truth for artifacts (host builds vs container builds) + runtime mounts → non-deterministic dist contents.
  - Cached `index.html` pointing to old hashes → missing files.
  - No explicit `no-store` for `index.html` → staleness persisted across deployments.

- Now:
  - Single baked artifact in the Nginx image → atomic and consistent.
  - `index.html` no-store → clients immediately pick up the latest file list.
  - Hashed assets immutable → optimal caching with zero risk of stale references.

---

## Operational Guidance

- Build and Deploy
  - `docker compose build nginx`
  - `docker compose up -d nginx`
  - This rebuilds frontend in the image and ships a coherent `dist` to Nginx.

- Verification
  - Inside Nginx: `ls -1 /usr/share/nginx/html/assets | sort -u`
  - Compare with the assets referenced by the served index:
    - `curl -s https://<host>:8443/index.html | grep -Eo 'assets/[^" ]+\.js' | sort -u`
  - They must match exactly.

- Cache Behavior
  - Instruct users to hard-reload on release if needed (Ctrl+F5). With `no-store` on `index.html`, clients should get updates automatically.
  - If a service worker was used previously, ensure it’s current or unregistered to avoid stale caches.

- Routing Consistency
  - Frontend bundle is built with `VITE_API_BASE=/api`, `VITE_GATEWAY_BASE=/api`, `VITE_WS_BASE=/ws`.
  - Ensure Nginx and gateway routes support these base paths (e.g., `/api/user-service/...`). Adjust gateway or Nginx rewrites if service paths differ.

---

## Pros and Cons

- Pros:
  - Deterministic, atomic deployments.
  - Eliminates MIME/hash mismatch errors.
  - Simpler runtime (no dependency on host-mounted `dist`).
  - Better caching policy (fresh `index.html`, long-lived assets).

- Cons:
  - Any frontend change requires rebuilding the Nginx image.
  - If you want to live-edit `nginx.conf` or SSL without rebuilds, keep mounts for those files (current compose still mounts them).

---

## Migration Checklist (Recap)

- [x] Move to multi-stage Docker build that embeds `dist` into Nginx image.
- [x] Remove `dist` volume mount from Nginx in docker-compose.
- [x] Set Vite env vars in Dockerfile build stage.
- [x] Update Nginx config: `no-store` for `index.html`, `immutable` for `/assets/`.
- [x] Verify Nginx serves files from `/usr/share/nginx/html` with correct MIME types.
- [x] Align gateway/Nginx routes with frontend `VITE_*` bases.

---

## Appendix: Key Files

- `transcendence/nginx/Dockerfile` – multi-stage build (build frontend → copy dist into Nginx image)
- `transcendence/nginx/nginx.conf` – Nginx config with caching and API proxy rules
- `transcendence/docker-compose.yml` – Nginx service builds from Dockerfile (no dist mount)
