Perfekt! Hier ist alles **grafisch dargestellt** - ideal zum Nachzeichnen! 📊

## 🎨 KOMPLETTER TOURNAMENT FLOW - Grafische Darstellung

---

## 1️⃣ GESAMTÜBERSICHT - Der große Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏆 TOURNAMENT SYSTEM                              │
└─────────────────────────────────────────────────────────────────────┘

    👤 ALICE                                                    
     │                                                          
     ├─── 1. Erstellt Tournament "Winter Championship"         
     │    ┌──────────────────────────────┐                     
     │    │ 📋 TOURNAMENTS               │                     
     │    │ - Name: Winter Championship  │                     
     │    │ - Status: registration       │                     
     │    │ - Players: 0/4               │                     
     │    └──────────────────────────────┘                     
     │                                                          
     ├─── 2. Sendet Einladungen                                
     │    ┌──────────────────────────────────────────┐         
     │    │ 📧 GAME_INVITATIONS                      │         
     │    ├──────────────────────────────────────────┤         
     │    │ Alice → Bob     [pending] ⏳              │         
     │    │ Alice → Charlie [pending] ⏳              │         
     │    │ Alice → David   [pending] ⏳              │         
     │    └──────────────────────────────────────────┘         
     │                                                          
     │                                                          
     ▼                                                          
                                                                
┌────────┐  ┌─────────┐  ┌────────┐                           
│  Bob   │  │ Charlie │  │ David  │                           
└───┬────┘  └────┬────┘  └───┬────┘                           
    │            │           │                                 
    │ Accept ✓   │ Accept ✓  │ Accept ✓                       
    │            │           │                                 
    ▼            ▼           ▼                                 
                                                                
    ┌────────────────────────────────┐                         
    │ 🎮 TOURNAMENT_PARTICIPANTS     │                         
    ├────────────────────────────────┤                         
    │ 1. Alice   - AliceTheGreat     │                         
    │ 2. Bob     - BobbyGamer        │                         
    │ 3. Charlie - CharlieChamp      │                         
    │ 4. David   - DavidDestroyer    │                         
    └────────────────────────────────┘                         
                    │                                           
                    │ Tournament VOLL (4/4)                     
                    │ Status → in_progress                      
                    ▼                                           
                                                                
        ┌──────────────────────────┐                           
        │ 🎲 MATCHES GENERIEREN    │                           
        ├──────────────────────────┤                           
        │ Runde 1:                 │                           
        │ • Match 1: Alice vs Bob  │                           
        │ • Match 2: Charlie vs David                          
        └──────────────────────────┘                           
                    │                                           
                    ▼                                           
                                                                
            🏁 SPIELEN!                                         
```

---

## 2️⃣ DETAILLIERTER TIMELINE - Schritt für Schritt

```
ZEIT ─────────────────────────────────────────────────────────────────→

T0: Alice erstellt Tournament
    ════════════════════════════════════════════════
    📋 Tournaments                 👥 Participants
    ┌──────────────────┐          ┌────────────┐
    │ ID: 1            │          │ 1. Alice   │
    │ Status: registration        └────────────┘
    │ Players: 1/4     │
    └──────────────────┘


T1: Alice sendet Einladungen (3 Stück)
    ════════════════════════════════════════════════
    📧 Invitations
    ┌─────────────────────────────────────┐
    │ Alice → Bob     [pending ⏳]        │
    │ Alice → Charlie [pending ⏳]        │
    │ Alice → David   [pending ⏳]        │
    └─────────────────────────────────────┘
    
    🔔 Notifications (Bob, Charlie, David bekommen je eine)


T2: Bob akzeptiert (5 Minuten später)
    ════════════════════════════════════════════════
    📧 Invitations                 👥 Participants
    ┌─────────────────────────┐   ┌────────────┐
    │ Alice → Bob [accepted ✓]│   │ 1. Alice   │
    │ Alice → Charlie [pending]   │ 2. Bob     │
    │ Alice → David [pending]     └────────────┘
    └─────────────────────────┘
    
    📋 Tournament: Players 2/4


T3: Charlie akzeptiert (2 Minuten später)
    ════════════════════════════════════════════════
    📧 Invitations                 👥 Participants
    ┌─────────────────────────┐   ┌────────────┐
    │ Alice → Bob [accepted ✓]│   │ 1. Alice   │
    │ Alice → Charlie [accept ✓]  │ 2. Bob     │
    │ Alice → David [pending]     │ 3. Charlie │
    └─────────────────────────┘   └────────────┘
    
    📋 Tournament: Players 3/4


T4: David akzeptiert → 🚨 TOURNAMENT STARTET!
    ════════════════════════════════════════════════
    📧 Invitations                 👥 Participants
    ┌─────────────────────────┐   ┌────────────────┐
    │ Alice → Bob [accepted ✓]│   │ 1. Alice       │
    │ Alice → Charlie [accept ✓]  │ 2. Bob         │
    │ Alice → David [accepted ✓]  │ 3. Charlie     │
    └─────────────────────────┘   │ 4. David       │
                                   └────────────────┘
    
    📋 Tournament: Players 4/4
    Status: registration → in_progress ✓
    
    🎲 AUTO: Matches werden erstellt!


T5: Matches sind bereit
    ════════════════════════════════════════════════
    🎮 MATCHES (Runde 1)
    ┌─────────────────────────────────────┐
    │ Match 1: Alice vs Bob    [waiting]  │
    │ Match 2: Charlie vs David [waiting] │
    └─────────────────────────────────────┘
    
    🔔 Alle bekommen "Your match is ready!"


T6-T10: Matches werden gespielt...
    (siehe nächste Grafik für Details)
```

---

## 3️⃣ SPIELABLAUF - Das Tournament Bracket

```
┌─────────────────────────────────────────────────────────────────┐
│           TOURNAMENT BRACKET - 4 SPIELER                        │
└─────────────────────────────────────────────────────────────────┘


RUNDE 1: HALBFINALE
════════════════════════════════════════════════

    ┌─────────────────────────┐
    │   📍 MATCH 1            │
    │   ────────────           │
    │   Alice  🆚  Bob        │
    │                          │
    │   Status: waiting        │
    │   ⏳ Warten auf Start    │
    └─────────────────────────┘
             │
             │ Spielen...
             ▼
    ┌─────────────────────────┐
    │   📍 MATCH 1 RESULT     │
    │   ────────────           │
    │   Alice  11 : 7  Bob    │
    │                          │
    │   Winner: Alice ✓        │
    │   Loser:  Bob           │
    └─────────────────────────┘
             │
             │ Alice geht weiter
             │ Bob geht zu Loser-Bracket
             ▼


    ┌─────────────────────────┐
    │   📍 MATCH 2            │
    │   ────────────           │
    │   Charlie 🆚 David      │
    │                          │
    │   Status: waiting        │
    │   ⏳ Warten auf Start    │
    └─────────────────────────┘
             │
             │ Spielen...
             ▼
    ┌─────────────────────────┐
    │   📍 MATCH 2 RESULT     │
    │   ────────────           │
    │   Charlie 11 : 9 David  │
    │                          │
    │   Winner: Charlie ✓      │
    │   Loser:  David         │
    └─────────────────────────┘
             │
             │ Charlie geht weiter
             │ David geht zu Loser-Bracket
             ▼


═══════════════════════════════════════════════════════
ZWISCHENSTAND nach Runde 1:

    Winner-Bracket          Loser-Bracket
    ──────────────          ─────────────
    ✓ Alice                 ✗ Bob
    ✓ Charlie               ✗ David
═══════════════════════════════════════════════════════


RUNDE 2: FINALE + 3rd/4th PLACE
════════════════════════════════════════════════


    🏆 WINNER-BRACKET (für 1st/2nd)
    ┌──────────────────────────────┐
    │   📍 MATCH 3 (FINALE)        │
    │   ─────────────────           │
    │   Alice  🆚  Charlie         │
    │                               │
    │   Kampf um Platz 1 & 2!      │
    └──────────────────────────────┘
                │
                │ Spielen...
                ▼
    ┌──────────────────────────────┐
    │   🏆 FINALE RESULT           │
    │   ─────────────────           │
    │   Alice  11 : 8  Charlie     │
    │                               │
    │   🥇 1st: Alice              │
    │   🥈 2nd: Charlie            │
    └──────────────────────────────┘


    🥉 LOSER-BRACKET (für 3rd/4th)
    ┌──────────────────────────────┐
    │   📍 MATCH 4 (3rd PLACE)     │
    │   ─────────────────           │
    │   Bob  🆚  David             │
    │                               │
    │   Kampf um Platz 3 & 4!      │
    └──────────────────────────────┘
                │
                │ Spielen...
                ▼
    ┌──────────────────────────────┐
    │   🥉 3rd PLACE RESULT        │
    │   ─────────────────           │
    │   Bob  6 : 11  David         │
    │                               │
    │   🥉 3rd: David              │
    │      4th: Bob                │
    └──────────────────────────────┘


═══════════════════════════════════════════════════════
FINALE PLATZIERUNGEN:

    ┌──────────────────────────┐
    │  🏆 ENDERGEBNIS          │
    ├──────────────────────────┤
    │  🥇 1st Place: Alice     │
    │  🥈 2nd Place: Charlie   │
    │  🥉 3rd Place: David     │
    │     4th Place: Bob       │
    └──────────────────────────┘

    Tournament Status: finished ✓
═══════════════════════════════════════════════════════
```

---

## 4️⃣ TABELLENBEZIEHUNGEN - Wie hängt alles zusammen?

```
┌─────────────────────────────────────────────────────────────────┐
│                  DATENBANK STRUKTUR                             │
└─────────────────────────────────────────────────────────────────┘


         ┌────────────┐
         │   USERS    │
         │            │
         │ • Alice    │
         │ • Bob      │
         │ • Charlie  │
         │ • David    │
         └─────┬──────┘
               │
               │ (erstellt/joined)
               │
    ┌──────────┼──────────────────────────────┐
    │          │                              │
    ▼          ▼                              ▼
┌─────────┐  ┌──────────────┐          ┌──────────────┐
│ GAME_   │  │ TOURNAMENTS  │          │ TOURNAMENT_  │
│ INVIT.  │  │              │◀─────────│ PARTICIPANTS │
│         │  │ ID: 1        │          │              │
│ Alice→Bob  │ Name: Winter │          │ Alice        │
│ Alice→Char │ Status: ...  │          │ Bob          │
│ Alice→David│ Players: 4/4 │          │ Charlie      │
└─────────┘  └──────┬───────┘          │ David        │
                    │                   └──────────────┘
                    │
                    │ (hat)
                    │
                    ▼
             ┌──────────────┐
             │   MATCHES    │
             │              │
             │ Match 1:     │
             │ Alice vs Bob │
             │              │
             │ Match 2:     │
             │ Charlie vs D │
             │              │
             │ Match 3:     │
             │ Alice vs C   │
             │              │
             │ Match 4:     │
             │ Bob vs David │
             └──────────────┘


LEGENDE:
────────
│  →  │  = Foreign Key Beziehung
▼  ▼  ▼  = "hat viele" (1:n)
◀──────  = "gehört zu" (n:1)
```

---

## 5️⃣ ZUSTANDSDIAGRAMM - Tournament Status

```
┌─────────────────────────────────────────────────────────────┐
│           TOURNAMENT STATUS FLOW                            │
└─────────────────────────────────────────────────────────────┘


    ┌──────────────┐
    │  START       │
    └──────┬───────┘
           │
           │ Alice erstellt Tournament
           ▼
    ┌──────────────────┐
    │  REGISTRATION    │◀───┐
    │                  │    │
    │  Players: 1/4    │    │ Mehr Spieler
    └──────┬───────────┘    │ akzeptieren
           │                │
           │ Einladungen    │
           │ senden ────────┘
           │
           │ Alle 4 akzeptiert?
           │
           ▼ JA
    ┌──────────────────┐
    │  IN_PROGRESS     │
    │                  │
    │  🎮 Matches      │
    │     laufen...    │
    └──────┬───────────┘
           │
           │ Alle Matches
           │ beendet?
           │
           ▼ JA
    ┌──────────────────┐
    │   FINISHED       │
    │                  │
    │  🏆 Gewinner:    │
    │     Alice        │
    └──────────────────┘


MÖGLICHE ABBRÜCHE:
─────────────────

REGISTRATION ──[Zu wenig Spieler]──→ CANCELLED
REGISTRATION ──[Timeout]───────────→ CANCELLED
IN_PROGRESS ──[Admin-Action]──────→ CANCELLED
```

---

## 6️⃣ MATCH STATUS FLOW

```
┌─────────────────────────────────────────────────────────────┐
│              EINZELNES MATCH - STATUS FLOW                  │
└─────────────────────────────────────────────────────────────┘


         ┌─────────────┐
         │   waiting   │
         │             │
         │ ⏳ Wartet   │
         │    auf      │
         │   Spieler   │
         └──────┬──────┘
                │
                │ Beide Spieler bereit
                ▼
         ┌──────────────┐
         │ in_progress  │
         │              │
         │ 🎮 Spiel     │
         │    läuft!    │
         │              │
         │ Score:       │
         │ Alice: 8     │
         │ Bob:   5     │
         └──────┬───────┘
                │
                │ Einer erreicht 11
                ▼
         ┌──────────────┐
         │   finished   │
         │              │
         │ ✓ Winner:    │
         │   Alice      │
         │              │
         │ Final Score: │
         │ Alice: 11    │
         │ Bob:   7     │
         └──────────────┘
```

---

## 7️⃣ NOTIFICATION FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                  NOTIFICATIONS TIMELINE                     │
└─────────────────────────────────────────────────────────────┘


ALICE                BOB                CHARLIE            DAVID
  │                   │                    │                 │
  │ Erstellt          │                    │                 │
  │ Tournament        │                    │                 │
  │                   │                    │                 │
  │─────────────────> 🔔 Invitation!      │                 │
  │──────────────────────────────────────> 🔔 Invitation!   │
  │──────────────────────────────────────────────────────────> 🔔 Invitation!
  │                   │                    │                 │
  │                   │ Accept             │                 │
  │<─────────────────🔔 Bob joined!       │                 │
  │                   │                    │ Accept          │
  │<──────────────────────────────────────🔔 Charlie joined!│
  │                   │                    │                 │ Accept
  │<──────────────────────────────────────────────────────────🔔 David joined!
  │                   │                    │                 │
  🔔 Tournament       🔔 Tournament        🔔 Tournament     🔔 Tournament
     starting!            starting!           starting!        starting!
  │                   │                    │                 │
  🔔 Your match       🔔 Your match        🔔 Your match     🔔 Your match
     ready!               ready!              ready!           ready!
  │                   │                    │                 │
  │                   │                    │                 │
  │  ... Matches werden gespielt ...       │                 │
  │                   │                    │                 │
  🔔 Tournament       🔔 Tournament        🔔 Tournament     🔔 Tournament
     finished!            finished!           finished!        finished!
     You won! 🥇         4th place          2nd place 🥈     3rd place 🥉
```

---

## 8️⃣ MATCH GENERATION LOGIK

```
┌─────────────────────────────────────────────────────────────┐
│         WIE WERDEN MATCHES ERSTELLT?                        │
└─────────────────────────────────────────────────────────────┘


SCHRITT 1: Alle Participants holen
═══════════════════════════════════════════════════════

    Tournament_Participants (tournament_id = 1)
    ┌──────┬──────────┬──────────────────┐
    │ ID 1 │ Alice    │ AliceTheGreat    │
    │ ID 2 │ Bob      │ BobbyGamer       │
    │ ID 3 │ Charlie  │ CharlieChamp     │
    │ ID 4 │ David    │ DavidDestroyer   │
    └──────┴──────────┴──────────────────┘


SCHRITT 2: Paarungen erstellen (Runde 1)
═══════════════════════════════════════════════════════

    Algorithmus:
    ┌─────────────────────────────────────┐
    │ Player 1 vs Player 2  → Match 1     │
    │ Player 3 vs Player 4  → Match 2     │
    └─────────────────────────────────────┘

    Erstellt:
    ┌────────────────────────────────────────┐
    │ Match 1:                               │
    │   Round: 1                             │
    │   Match_number: 1                      │
    │   Bracket_type: winner                 │
    │   Player1: Alice (ID 1)                │
    │   Player2: Bob   (ID 2)                │
    └────────────────────────────────────────┘

    ┌────────────────────────────────────────┐
    │ Match 2:                               │
    │   Round: 1                             │
    │   Match_number: 2                      │
    │   Bracket_type: winner                 │
    │   Player1: Charlie (ID 3)              │
    │   Player2: David   (ID 4)              │
    └────────────────────────────────────────┘


SCHRITT 3: Warten auf Ergebnisse
═══════════════════════════════════════════════════════

    ⏳ Match 1 spielen... → Alice wins
    ⏳ Match 2 spielen... → Charlie wins


SCHRITT 4: Runde 2 erstellen (dynamisch)
═══════════════════════════════════════════════════════

    Algorithmus:
    ┌─────────────────────────────────────────┐
    │ Winner Match1 vs Winner Match2          │
    │   → Match 3 (Finals)                    │
    │                                         │
    │ Loser Match1 vs Loser Match2            │
    │   → Match 4 (3rd place)                 │
    └─────────────────────────────────────────┘

    Erstellt:
    ┌────────────────────────────────────────┐
    │ Match 3:                               │
    │   Round: 2                             │
    │   Match_number: 1                      │
    │   Bracket_type: winner                 │
    │   Player1: Alice   (Winner M1)         │
    │   Player2: Charlie (Winner M2)         │
    └────────────────────────────────────────┘

    ┌────────────────────────────────────────┐
    │ Match 4:                               │
    │   Round: 2                             │
    │   Match_number: 2                      │
    │   Bracket_type: loser                  │
    │   Player1: Bob   (Loser M1)            │
    │   Player2: David (Loser M2)            │
    └────────────────────────────────────────┘
```

---

## 9️⃣ STATISTIKEN UPDATE

```
┌─────────────────────────────────────────────────────────────┐
│          WAS PASSIERT MIT DEN STATISTIKEN?                  │
└─────────────────────────────────────────────────────────────┘


VORHER (alle bei 0):
════════════════════════════════════════════════════════

    Statistics Tabelle:
    ┌───────┬────────────────┬────────────────┬───────────────┐
    │ User  │ 1v1 Wins/Loses │ Tourn. 1st     │ Tourn. 2nd    │
    ├───────┼────────────────┼────────────────┼───────────────┤
    │ Alice │ 0 / 0          │ 0              │ 0             │
    │ Bob   │ 0 / 0          │ 0              │ 0             │
    │ Charlie│ 0 / 0         │ 0              │ 0             │
    │ David │ 0 / 0          │ 0              │ 0             │
    └───────┴────────────────┴────────────────┴───────────────┘


NACHHER (nach Tournament):
════════════════════════════════════════════════════════

    Statistics Tabelle:
    ┌───────┬────────────────┬────────────────┬───────────────┐
    │ User  │ 1v1 Wins/Loses │ Tourn. 1st     │ Tourn. 2nd    │
    ├───────┼────────────────┼────────────────┼───────────────┤
    │ Alice │ 0 / 0          │ 1 🥇           │ 0             │
    │ Bob   │ 0 / 0          │ 0              │ 0             │
    │ Charlie│ 0 / 0         │ 0              │ 1 🥈          │
    │ David │ 0 / 0          │ 0              │ 0             │
    └───────┴────────────────┴────────────────┴───────────────┘

    (Fortsetzung →)
    ┌───────┬───────────────┬────────────────┐
    │ User  │ Tourn. 3rd    │ Tourn. 4th     │
    ├───────┼───────────────┼────────────────┤
    │ Alice │ 0             │ 0              │
    │ Bob   │ 0             │ 1              │
    │ Charlie│ 0            │ 0              │
    │ David │ 1 🥉          │ 0              │
    └───────┴───────────────┴────────────────┘


UPDATE LOGIK:
════════════════════════════════════════════════════════

    Placement 1 → tournament_first++
    Placement 2 → tournament_second++
    Placement 3 → tournament_third++
    Placement 4 → tournament_fourth++
```

---

Jetzt hast du alles **grafisch**! Perfekt zum Nachzeichnen mit Stift und Papier! 📝✨

Was möchtest du als nächstes sehen? 🎯