# Tournament Flow (frontend + backend interation overview)

## 1) User Flow

```
Lobby
→ /tournaments
  → /tournaments/:id  (Detail: which tournament to join + AliasGate)
    → [ status subscription ]
      → unregistered  → (Save alias)                  → pending
      → pending       → (Backend assigns match)       → ready
      → ready         → (Backend sends start signal)  → playing → /game/:matchId
      → playing       → (Game ends & result reported) → done    → /tournament-next?id=:id
```

### * Quick Notes
1. unregistered → pending : User enters alias and joins the tournament.
2. pending → ready : Server assigns matchId & opponent.
3. ready → playing : Tournament host (or server) starts the match.
	→ Frontend auto-navigates to /game/:matchId.
4. playing → done : After result report, goes to “Next Round” page.
	```
	Buttons “Assign / Set Ready / Set Playing” are mock tools for simulation only.
	real service will replace them with backend signals (polling or websocket).
	```

<br>
<br>

## 2) Diagram

```
[Tournaments List]
    ↓
[Tournament Detail]
    ├─ AliasGate (enter alias)
    ├─ My Match Panel (status: pending → ready → playing → done)
    └─ Queue / Bracket Summary
        ↓ (status change)
[Game Page] (/game/:matchId)
        ↓ (report result)
[Tournament Next Round]
```

<br>
<br>

## 3) Page-by-Page design Overview for Emily


### 1. /tournaments - Tournament List
- Purpose: User chooses which tournament to enter.
	```
	UI                        Description
	-------------------------------------------------------------------------
  	1. Tournament Cards       e.g. Summer Open, Autumn Cup, Demo Tournament
  	2. Enter Button           Navigates to /tournaments/:id (Detail page)
	```

### 2. /tournaments/:id - Tournament Detail Page
- Purpose:
	- User registers alias
	- Checks match status
	- Sees bracket/queue info.
- Example:
	```
	┌────────────────────────────────────────────┐
	│ Tournament Header (name, alias, status)    │
	│--------------------------------------------│
	│ A. [AliasGate Section]                     │
	│ B. [My Match Panel]                        │
	│ C. [Queue / Bracket Summary]               │
	└────────────────────────────────────────────┘
	```

	### (A) AliasGate
    - Initial state: unregistered
    - When user enters alias → Save → session.alias stored → myMatch.status = "pending"
    - Tournament participation must include alias registration.

	### (B) My Match Panel
    
	```
	Status        UI (User clicks, message pops-up?)  Button
    -----------------------------------------------------------------
    pending       "Waiting for match assignment"      O
    Ready         "Starting soon"                     "Go to my game"
    playing       "Match in progress"                 O
    done          "Match finished"                    "Back to Detail"
	```

	### (C) Queue / Bracket Summary (simplified)
    - Shows minimal bracket info for clarity and requirement compliance:
	- Only top 2–3 upcoming matches are enough
    - shows order & participants.
	- ex)
    	- Now Playing: A vs B
    	- Up Next: C vs D
    	- Later: E vs F    

### 3. /game/:matchId — Game Page
- Purpose: Play match & show result.
	- Uses existing 2D canvas game renderer
	- When the match ends → ResultDialog appears

- ResultDialog Flow
   1. [You Win!]
   2. [Report Result]

### 4. /tournament-next
- Purpose: Waiting area after submitting result.

	```
	UI                                      Description
	--------------------------------------------------------------------
	"Result submitted successfully"      Confirmation message
	"Waiting for next round"             Loader message
	"Back to Tournament Detail"          Returns to /tournaments/:id
	```

<br>
<br>

## 4) Backend Integration (Not sure)

	Endpoint					Method	    Purpose
	--------------------------------------------------------------------
	/api/tournaments            GET         Tournament list
	/api/tournaments/:id        GET         Detail info
	/api/tournaments/:id/alias	POST        Save alias
	/api/matches/:id/report     POST        Submit game result

<br>
<br>

## 5) Note for Backend
 - The “Assign / Set Ready / Set Playing” buttons are demo simulators on the frontend.
 - They mimic backend events for development:
    - Assign → creates fake match assignment (pending → ready)
    - Set Ready → toggles “about to start” (ready still)
    - Set Playing → triggers match start (ready → playing)
    - On “Set Playing”, frontend auto-navigates to /game/:matchId