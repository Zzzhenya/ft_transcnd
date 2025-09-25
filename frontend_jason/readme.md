# Frontend Specification

## ✅ What it is
- Single File Components? Nope.
- React/Vue? Nope.
- This is a minimal, production-leaning Vanilla TypeScript SPA with History API routing, a11y focus management, simple store/guards, 2D Canvas renderer stub, and Tailwind CSS — matching your spec.

## ✅ Architecture
- **Run-time**: SPA (Single Page Application): Responsive Design
- **Language**: TypeScript  
- **Framework**: None (custom router / store implementation)  
- **UI**: Tailwind CSS  
- **3D**: Babylon.js

## ✅ UI Page Structure (Essential)

### (0) Common
- **AppShell**  
	- Header (Logo / Current User / Setting)  
	- Main container  
	- Toast (Announcement / Error)

- **A11y/Device Support**
	- Tailwind: responsive design (desktop / tablet / mobile)
	- Input device std support: mouse / keyboard / touch
		- pointer events API (pointerdown, pointermove, pointerup)
		- ex): mousedown, touchstart

- **Browser Compatibility**
	- Firefox(Must) + Chrome(Additional) // Optimazation

- **Routing**  
	- History API: Forward / Back (pushState / popstate)
	- Accessibility: Move focus on navigation

---

### (1) Init Page  
- **Path**: `/init`  
- **AliasForm**  
	- User ID registration form with validation  
		- Empty → “Please enter your ID”  
		- Duplicate → “This ID already exists”  
		- Length → “Maximum 16 characters allowed”  
		- Forbidden word → “This ID contains restricted words”  
		- Submit button enabled only when valid  

- **On success** → Navigate to Lobby (`/`)  

- **Note**:<br>
	Tournament alias is requested separately when entering a tournament (`AliasGate`).  

---

### (2) Lobby (Main Hub)  
- **Path**: `/`
- **LocalMatchButton** → `/local`  
- **TournamentButton** → `/tournaments`  

---

### (3) Game (Common Renderer)  
- **Path**: `/game/:matchId`  
- **GameCanvas** (Babylon.js)
  - Create / dispose scene
  - Keyboard input  
  - Consistent physics rules  

- **HUD (Head-up Display)**  
  - Score (Left / Right)  
  - Timer  
  - Set status  
  - Player aliases  

- **ResultModal (Match result)**  
  - Local:  
    - “Player A wins with score 5:1”  
    - CTA: “Back to Lobby”  
  - Tournament:  
    - “Advance / eliminated!”  
    - CTA: “Next Round” or “Back to Lobby”  

- **Unmount (Cleanup)**  
  - Stop render loop (`scene.dispose()`, `engine.dispose()`)  
  - Remove event listeners (keyboard / resize, etc.)  

---

### (4) Local Match Page  
- **Path**: `/local`  
- **GameStartButton** → Generate `matchId` → `/game/:matchId`  
- **Lobby button** → `/`  

---

### (5) Tournament List Page  
- **Path**: `/tournaments`  
- **TournamentList** (cards for ongoing / pending tournaments)  
  - Show “Enter” button if joinable  

- **On Enter click** → `/tournaments/:id`  

- **Lobby button** → `/`  

---

### (6) Tournament Detail Page  
- **Path**: `/tournaments/:id`  
- **Header**: Tournament title / round / status  
- **BracketView**: Visualized bracket (auto-update on match completion)  
- **AliasGate**: Input form if user has no alias for this tournament  
- **MyMatch**: My assigned match (opponent ID / start time / enter button)  
- **Announcements**: Toast (“Next match: A vs B”)  
- **QueueStatus**: Show “Waiting in queue…” with cancel option → switch to MyMatch when assigned  
- **GameStartButton**: Enabled only if `MyMatch.status === "ready"`  

---

## ✅ Page Routing Summary
| Page                | Path             |
|----------------------|------------------|
| Init (Alias)         | `/init`          |
| Lobby                | `/`              |
| Local Match          | `/local`         |
| Tournament List      | `/tournaments`   |
| Tournament Detail    | `/tournaments/:id` |
| Game Screen          | `/game/:matchId` |
| 404 Not Found        | `/*`             |

---

## ✅ Folder Structure

```
./
├── index.html
│
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
│
├── tsconfig.json
├── package.json
│
├── docker-compose.yml
├── Dockerfile
│
├── public/
│   └── favicon.svg
│
└──	/src
	├── style.css
	├── main.ts
	│
	├── /app
	│   ├── router/router.ts
	│   ├── store/store.ts
	│   └── shell/guards.ts
	│
	├── /pages
	│   ├── lobby.ts
	│   ├── local.ts
	│   ├── tournaments.ts
	│   ├── tournament-id.ts
	│   ├── game.ts
	│   └── not-found.ts
	│
	├── /game
	│   ├── state.ts        # GameState, physics params
	│   ├── systems.ts      # updatePhysics, score, reset
	│   └── input.ts        # keyboard mapping
	│
	├── /renderers
	│   ├── canvas2d.ts     # Phase 1
	│   └── babylon.ts      # Phase 3
	│
	├── /ui
	│   ├── HUD/
	│   ├── ResultModal/
	│   └── buttons/
	│
	└── /services
		├── tournament.ts   # tournament data
		└── matchmaking.ts  # matchmaking mock
```

## ✅ To-Do List (by priority)

### Phase 0: Scaffolding / Core
1. **Scaffolding**  
   - [✅] Init project: Vite + TypeScript + Tailwind
   - [ ] ESLint / Prettier (strict TypeScript)  
   - [✅] `public/index.html`: `<main id="app" tabindex="-1">` (a11y focus target)
   - [⏳] Tailwind breakpoints (sm / md / lg), supported on all devices
   - [⏳] Firefox + chrome // Compatibility

2. **Routing (History API)**  
	- [✅] Intercept `a[href]` +
   		- [✅]`pushState`
		- [✅]`replaceState`
		- [✅]`popState`
	- [✅] Focus `#app` on navigation (a11y)
	- [✅] Router smoke test
	- [✅] Scroll restoration
	- [⏳] 404 handling
   		- [✅] View page of 404 client (not-found.ts)
		- [ ] History fallback server config

3. **Core Infra (Store / Guard)**  
   - Global store (observer pattern):  
     - auth / alias, tournament, match  
   - Guards:  
     - `/game/:matchId`:  
       - Local → Only matchIds issued from `/local`  
       - Tournament → Allowed only if `MyMatch.status === "ready"`  

4. **AppShell + Page Stubs** (6 routes + 404)  
   - `/`: Lobby with 2 buttons (Local / Tournament)  
   - `/local`: GameStartButton → `local-<timestamp>` → `/game/:id`  
   - `/tournaments`: Dummy cards with “Enter”  
   - `/tournaments/:id`: Header + BracketView + MyMatch + Announcements + AliasGate  
   - `/game/:matchId`: Placeholder (Canvas + HUD slots)  
   - `/*`: 404 Page with “Back to Lobby”  

### Definition of Done (DoD)
- [ ] Forward / back navigation works  
- [ ] Focus moves to `#app` on route change  
- [ ] Local flow: `/local → /game/:id` works with generated matchId  
- [ ] Tournament flow: `/tournaments/:id → AliasGate` visible correctly  
- [ ] 404 works with redirect  

---

### Phase 1: 2D Canvas MVP Renderer
1. Attach **2D Canvas renderer** to `/game/:matchId`  
2. Implement **Game Rules**: physics, scoring, reset, keyboard input  
3. Add **HUD / ResultModal** with minimal info + exit button  
4. Cleanup on unmount (timers / listeners)  
5. Tournament flow: AliasGate → MyMatch → Game → Next round  

### Definition of Done (DoD)
- [ ] Local flow from Lobby → Local → Game → ResultModal → Lobby  
- [ ] Tournament flow from Lobby → Tournament list → Detail → AliasGate → Game → ResultModal → Next round  
- [ ] No resource leaks (FPS / memory stable)  
- [ ] `#app` focus actually moves on navigation  

---

### Phase 2: Tournament Expansion
1. **BracketView auto-update** after each match result  
2. **Announcements / QueueStatus** finalized transitions  

### Definition of Done (DoD)
- [ ] Bracket updates correctly per match end  
- [ ] User state consistent across toast / cards  

---

### Phase 3: Renderer Switch (2D → 3D)
1. Add **Babylon 3D Renderer** (keep 2D as fallback)  
2. Feature flag toggle: `?renderer=3d` or via settings  
3. Ensure cleanup + Firefox compatibility  

---

## ✅ Major Module: Graphics (Babylon.js)
- **MVP**: Implement in 2D first  
- **Extension**: Swap renderer layer only (no backend impact)  
- **Principle**: Game state modeled in (x, y, z?) to support both 2D & 3D  
- **Conclusion**: Minimal refactor required for 3D upgrade  

---

## ✅ Minor Module: Frontend Framework (Tailwind CSS)
- **MVP**: Tailwind CSS from start, minimal raw CSS  
- **Extension**: Consistent design & utility classes even with more components  
- **Principle**:  
  - No mixed plain CSS  
  - Reusable UI → Componentized for maintainability & collaboration  

---

## ⚠️ Notes & Cautions
1. **Docker Compose**:<br>
	`docker compose up` must spin up all services<br>
	(backend, frontend, DB, auth, monitoring, etc.)  
2. **Frontend frameworks:**<br>
	React, Vue, Next.js → `Not allowed`

---

## 📒 Glossary
- **SPA (Single Page Application)**:<br>
	Single initial load, updates via data → smooth UX (e.g., Gmail, Notion)  
- **Routing**:<br>
	Determine what to render based on URL path (e.g., `/init`, `/`, `/local`, …)  
- **Scaffolding**:<br>
	Setup base project skeleton at the start

---

## 📝 Final Check-list
- [ ] Page transitions work without full refresh
- [ ] Browser forward / back navigation functions correctly  
- [ ] Compatible with the latest Firefox and chrome (tested & polished) 
- [ ] Responsive layout (Desktop / Tablet / Mobile)
- [ ] One-line execution with Docker (`docker compose up`)