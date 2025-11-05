/sgoinfre/goinfre/Perso/rkost/ft_transcnd/frontend_jason/src/pages/profile.ts --> front end page  page  

--- 
# 05.11.2025 
## Good to know 


docker exec sqlite-web ls -lah /app/shared/database/ | grep -E "(transcendence|wal|shm)"
-rw-rw-rw-    1 root     root      188.0K Nov  5 08:19 transcendence.db
-rw-rw-rw-    1 root     root       32.0K Nov  5 09:34 transcendence.db-shm
-rw-rw-rw-    1 root     root        1.8M Nov  5 09:34 transcendence.db-wal

## Modified Updates 
        modified:   frontend/src/app/real-auth.ts
        modified:   frontend/src/pages/profile.ts
        modified:   services/user-service/src/controllers/authController.js
        modified:   services/user-service/src/models/User.js

## Final Message to Group 
In meiner Branch rene_db_test_UM sind unter scripts/database 3 testscripte hinzugekommen. 
- 1 zum schreiben von testdaten 
- 1 zum loeschen aller daten 
- 1 zum herausziehen und kopieren der datenbank -- das kann dann mit dbvever angeschaut werden. 

es gibt in den Container 3 db files eines altes `*db` eines `*.db-wal` aktuelle daten `*db-shm` Memory fuer schnellen zugriff. 
Es ist wichtig zu versthen das in `db-wal` die aktuellen daten sind. Normalerweise muessten wir uns gedanken machen wann dies update gemacht wird also wenn `*.db` mit den daten von `*.db-wal` geupdatet wird. Jedoch denke ich das es kaum so gross werden wird das es hier fuer wichtig sein wird. Jedoch sollten wir dies mit im Hinterkopf behalten falls es mal Problem gibt. 

Ansonsten kann dann mit Programm `DBever` das ganz gut betrachtet werden? 

--> Udate und bereinigen Bereinigen des 



