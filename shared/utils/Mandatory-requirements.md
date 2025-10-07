# Mandatory Requirements
## Division of responsibilities (Frontend & Backend)
### 1. Directly related with Frontend (UI-focused)
| Core | Backend Responsibility | Frontend Responsibility |
|------|-------------------------|-------------------------|
| **Core 01: Gameplay UI** | *(if server-side Pong is implemented later)* provide game state updates (ball, paddle, scores). | Render and update the game in the web-browser (WebGL/Babylon.js), handle keyboard input from backend-logic, update visuals in real time. |
| **Core 03: Alias input UI** | Store and validate alias if persistence is needed. | Display alias input form, handle typing, prevent duplicates at UI level, send alias to backend if required. |
| **Core 04: Tournament detail UI** | Generate tournament structure (matchups, order of games). | Render tournament brackets visually, update matchup and order of games on screen. |
| **Core 06: Matchmaking alarm UI** | Decide who plays next, send “next match” info. | Announce the next match to players via UI (pop-up, banner, etc). |
---
<br>

### 2. Indirectly related with Frontend
= The logic itself is backend/system-driven, but must be reflected in the UI
| Core | Backend Responsibility | Frontend Responsibility |
|------|-------------------------|-------------------------|
| **Core 02: Tournament system logic** | Manage tournament flow: multiple players must be able to participate sequentially. | Display results in UI (who plays next, updated order/bracket). |
| **Core 05: Alias reset logic** | Reset/clear stored aliases at the end of tournament. | Reset input fields, update UI so users see aliases are cleared. |
| **Core 07: Equal paddle speed** | Ensure identical paddle speed is enforced | Implement consistent paddle movement speed in rendering |
| **Core 08: Original Pong rules** | Apply original Pong mechanics (ball bounce, scoring, resets) according to 1972 rules. | Render these mechanics, so players see authentic Pong behavior in the gameplay UI. |
---
<br>

### 3. Summary
- **Directly related with Frontend (UI-focused):**<br>
  These are primarily handled on the frontend side and cannot exist without UI implementation.

- **Indirectly related with Frontend (Backend-driven but reflected in UI):**<br>
  These are driven by backend/system logic, but their correctness and effects must be clearly reflected and visible through the frontend UI.

- In short, <br>
the **Frontend is responsible for implementing and rendering the user experience**, while the **Backend provides and enforces the underlying logic**.
