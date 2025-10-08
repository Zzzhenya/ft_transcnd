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
./								[ Description ]
├── index.html					Entry HTML file, root container for the APP.
│
├── vite.config.ts				Vite, is Build tool, config.
├── tailwind.config.js			TailwindCSS Customization config.
├── postcss.config.js			PostCss config.
│
├── tsconfig.json				Typescript compiler options.
├── package.json				Project metadata & dependencies.
│
├── docker-compose.yml			Docker multi-server setup.
├── Dockerfile					Docker build config.
│
├── public/
│   └── favicon.svg				App icon.
│
└──	/src
	├── main.ts					App entry point (router, store, DOM mount).
	│
	├── style.css				Global styles based on TailwindCSS.
	│
	├── /app					[ Core logic ]
	│   ├── router/router.ts	Set navigations between pages.
	│   ├── store/store.ts		Temporary storage while the frontend app is running.
	│   └── shell/guards.ts		Access control rules for pages. (ex: No Id -> No game)
	│
	├── /pages					[ Each page view ]
	│   ├── lobby.ts			Lobby for matchmaking with other players.
	│   ├── local.ts			Local play screen. (Same computer)
	│   ├── tournaments.ts		Tournament list.
	│   ├── tournament-id.ts	Detail description of tournament.
	│   ├── game.ts				Game rendering page.
	│   └── not-found.ts		404 error page.
	│
	├── /game
	│   ├── state.ts			GameState & physics parameters.
	│   ├── systems.ts			updatePhysics, scoring, reset logic.
	│   └── input.ts			keyboard input mapping.
	│
	├── /renderers
	│   ├── canvas2d.ts			# Phase 1: renderer using Canvas2D
	│   └── babylon.ts			# Phase 3: renderer using Babylon.js
	│
	├── /ui
	│   ├── HUD/				Heads-up display components.
	│   ├── ResultModal/		Game result modal window.
	│   └── buttons/			Reusable button components.
	│
	└── /services
		├── tournament.ts		Tournament data handloing.
		└── matchmaking.ts		Mock data for matchmaking.
```

## ✅ To-Do List (by priority)

### Phase 0: Scaffolding / Core
1. **Scaffolding**  
	- [✅] Init project: Vite + TypeScript + Tailwind
	- [✅] ESLint / Prettier (strict TypeScript)
	- [✅] `public/index.html`: `<main id="app" tabindex="-1">` (a11y focus target)
	- [✅] Firefox & chrome : Smoke test // Compatibility (호환성)
	- [✅] Tailwind breakpoints (sm / md / lg / xl / 2xl), supported on all devices
		- "Accessibility, Support on all devices" -> breakpoins.
		- "Must use the TailwindCSS"
		- pixel size 
			- sm: 640px >=
			- md: 768px >=
			- lg: 1024px >=
			- xl: 1280px >=
			- 2xl: 1536px >=

2. **Routing (History API)**  
	- [✅] Intercept
		- [✅] `a[href]`
   		- [✅] `pushState`
		- [✅] `replaceState`
		- [✅] `popState`
	- [✅] Focus `#app` on navigation (a11y)
	- [✅] Router: Smoke test
	- [✅] Scroll restoration
	- [✅] Client 404 error page view (not-found.ts)
	- [🔺] 404 Server history fallback
		```
		(Not fixed alone, must be with Backend side)
		The router handles 404 views on the client side,
		but for direct access or refresh at deep URLs
		(ex: /game/123)
			
		the server currently returns a server 404.
		To fix this, the server needs to always return index.html for unknown routes,
		so the client-side router can take over.
		```

3. **Core Infra (Store / Guard)**  
	- [✅] Global store
		- [✅] alias (session.alias, setAlias)
		- [✅] tournament (tournament.currentId, setTournamentId)
		- [✅] match/myMatch (assignMyTournamentMatch, setMyMatchStatus)
		- [✅] Save session (sessionStorage)
	- [✅]Guards
		- [✅]`/game/:matchId`: 
		- [✅] Local → Only matchIds issued from `/local` (based on last local)
		- [✅] Tournament → Allowed only if `MyMatch.status === "ready || playing"`

4. **AppShell + Page Stubs (6 routes + 404)**
	- [✅] `/`: Lobby with 2 buttons (Local / Tournament)  
	- [✅] `/local`: GameStartButton → `Start Local Match` → `local-<timestamp>` → `/game/:id`  
	- [✅] `/tournaments`: Dummy cards with “Enter”  + Demo link
	- [✅] `/tournaments/:id`: Header + AliasGate + MyMatch + BracketView + Announcements stub
	- [✅] `/game/:matchId`: Placeholder (Canvas + HUD slots)
		- Canvas: Digital paper, to render game graphic.
		- HUD: Heads-Up Display = UI Windows to overlay over canvas for score, time, ...
	- [✅] `/*`: 404 Page with “Back to Lobby”

5. **Auth (Mock for current process, real auth after Phase 1)**
	- [✅] Add **mock auth** (login / logout) to unblock guarded routes
	- [✅] Add **protected route** `profile` (redirects to `auth?next=...` when not signed it)
	- [✅] **Adapter swap point** `src/app./auth.ts`
		- For now it re-exports mock
		- Later replace with real API ('real-auth.ts`) **after Phase 1**

### Definition of Done (DoD)
- [✅] Forward / back navigation works  
- [✅] Focus moves to `#app` on route change  
- [✅] Local flow: `/local → /game/:id` works with generated matchId  
- [✅] Tournament flow: `/tournaments/:id → AliasGate` visible correctly
	- assignPending, setReady, setPlaying
- [🔺] 404 works with redirect // waiting backend side

---

### Phase 1: 2D Canvas MVP Renderer
1. Attach **2D Canvas renderer** to `/game/:matchId` 
	- [✅] Call 'mountGame(root)' in test.ts.
	- [✅] Create canvas & set size

2. Implement **Game Rules**: physics, scoring, reset, keyboard input
	- [✅] Type/State: GameConfig, GameState, Paddle, Ball, Score
	- [✅] Logic to init factories: createPaddle, createBall, createState
	- [✅] Logit to Serve / reset: serveBall (random angle 15-45 + dir), resetRound
	- [✅] Validation: assertValidConfig runs once in [f]createState()
	- [✅] keyboard input: createInput (W/S, A-Up/A-DN, P, R)
	- [✅] Physics: wall/paddle collisions with dt; frame-independent movement
	- [✅] Scoring/Rounds: goal detection(stepPhysics, onScore) updates score
	- [✅] Round reset / pause / end: handled in the update loop
	
3. Add **HUD / ResultModal** with minimal info + exit button
	- [✅] ResultDialog (backdrop + modal), winner text, button, ESC close.

4. Cleanup on unmount
	- [✅] cancelAnimationFrame(raf), dialog.destory()
	- [✅] detach(): remove key listener
	- [✅] remove canvas

5. Tournament flow (stubbed)
	- [ ] AliasGate → MyMatch → Game → Next round 
	- [ ] Pending route wiring and page transitions

### Definition of Done (DoD)
- [✅] Local flow:
	- [✅] Lobby → Local → Game → ResultModal → Lobby
	- [✅] Needs route navigation hooks and ResultModal button targets.
- [ ] Tournament flow:
	- Lobby → Tournament list → Detail → AliasGate → Game → ResultModal → Next round
- [ ] No resource leaks (FPS / memory stable) 
	- rAF canceled, listeners/DOM cleaned up, dialog listeners removed.
- [✅] `#app` focus actually moves on navigation  
	- Router focuses `root` post-render.

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