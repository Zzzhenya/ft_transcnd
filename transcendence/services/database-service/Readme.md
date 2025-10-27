# Database Service (SQLite)

Zentraler Database API Service für Transcendence - Arbeitet mit SQLite.

## 📍 Übersicht

Dieser Service ist der **einzige Zugangspunkt** zur SQLite-Datenbank. Alle anderen Services kommunizieren über diese HTTP API.

## 🚀 Quick Start

```bash
# Dependencies installieren
npm install

# Service starten
npm start

# Mit Auto-Reload (Development)
npm run dev
```

## 🔌 API Endpoints

### Deine gewünschten Funktionen:

| Funktion | Endpoint | Method | Beschreibung |
|----------|----------|--------|--------------|
| **read** | `/api/read` | GET | Wert aus Spalte lesen |
| **write** | `/api/write` | POST | Wert in Spalte schreiben |
| **check** | `/api/check` | GET | Wert überprüfen |
| **setNewId** | `/api/setNewId` | POST | Neuen Eintrag erstellen |
| **removeId** | `/api/removeId` | DELETE | Eintrag löschen |
| **printIdInput** | `/api/printIdInput` | GET | Alle Werte als String (mit ; getrennt) |

### Bonus Funktionen:

| Funktion | Endpoint | Method | Beschreibung |
|----------|----------|--------|--------------|
| **list** | `/api/list` | GET | Alle Einträge auflisten |
| **query** | `/api/query` | POST | SELECT Query ausführen |
| **health** | `/health` | GET | Service Status |

## 📖 Beispiele

### READ - Wert lesen
```bash
curl "http://localhost:3006/api/read?table=users&id=1&column=username"
```

### WRITE - Wert schreiben
```bash
curl -X POST http://localhost:3006/api/write \
  -H "Content-Type: application/json" \
  -d '{"table":"users","id":1,"column":"status","value":"online"}'
```

### CHECK - Wert prüfen
```bash
curl "http://localhost:3006/api/check?table=users&id=1&column=status&checkvalue=online"
```

### SET NEW ID - Neuen Eintrag erstellen
```bash
curl -X POST http://localhost:3006/api/setNewId \
  -H "Content-Type: application/json" \
  -d '{"table":"users","data":{"username":"test","email":"test@example.com"}}'
```

### REMOVE ID - Eintrag löschen
```bash
curl -X DELETE "http://localhost:3006/api/removeId?table=users&id=5"
```

### PRINT ID INPUT - Alle Werte als String
```bash
curl "http://localhost:3006/api/printIdInput?table=users&id=1"
# Output: "1;testuser;test@example.com;hashed_password;2024-01-01 10:00:00"
```

### LIST - Alle Einträge
```bash
curl "http://localhost:3006/api/list?table=users&limit=10&offset=0"
```

### QUERY - SELECT Query
```bash
curl -X POST http://localhost:3006/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM users WHERE status = ?","params":["online"]}'
```

## 💻 Verwendung in anderen Services

Nutze den DatabaseClient aus `shared/utils/DatabaseClient.js`:

```javascript
const DatabaseClient = require('../../shared/utils/DatabaseClient');
const db = new DatabaseClient();

// Beispiele
async function examples() {
  // Neuen User erstellen
  const userId = await db.setNewId('users', {
    username: 'john',
    email: 'john@example.com',
    password_hash: 'hashed'
  });
  
  // Username lesen
  const username = await db.read('users', userId, 'username');
  
  // Status updaten
  await db.write('users', userId, 'status', 'online');
  
  // Status prüfen
  const isOnline = await db.check('users', userId, 'status', 'online');
  
  // Alle Daten als String
  const allData = await db.printIdInput('users', userId);
  
  // User löschen
  await db.removeId('users', userId);
}
```

## 🔧 Environment Variables

```bash
NODE_ENV=development
DATABASE_URL=sqlite:/app/shared/database/transcendence.db
PORT=3006
```

## 🐳 Docker

Der Service läuft in Docker:
- Port: **3006**
- Internal URL: `http://database-service:3006`
- Database: `/app/shared/database/transcendence.db`

## 📦 Dependencies

- **express** - Web Framework
- **sqlite3** - SQLite Client
- **cors** - Cross-Origin Resource Sharing

## 🧪 Testing

```bash
# Health Check
curl http://localhost:3006/health

# Test erstellen
curl -X POST http://localhost:3006/api/setNewId \
  -H "Content-Type: application/json" \
  -d '{"table":"users","data":{"username":"testuser","email":"test@test.com","password_hash":"test123"}}'
```

## 📊 Monitoring

```bash
# Service Logs
docker-compose logs -f database-service

# Service Status
docker-compose ps database-service

# In Service einloggen
docker-compose exec database-service sh
```

## 🔒 Sicherheit

- Alle Queries verwenden **Parameter Binding** (SQL Injection Schutz)
- Query Endpoint erlaubt nur **SELECT** Queries
- Alle anderen Operationen über sichere APIs

## 🛠️ Troubleshooting

### Service startet nicht
```bash
docker-compose build database-service
docker-compose up database-service
```

### Keine Verbindung zur DB
```bash
# Prüfe ob DB-Datei existiert
docker-compose exec database-service ls -la /app/shared/database/

# Prüfe Permissions
docker-compose exec database-service ls -la /app/shared/database/transcendence.db
```

### Logs anschauen
```bash
docker-compose logs database-service
```

## 📝 Notes

- Port **3006** (nicht 3001-3005, die sind belegt)
- Arbeitet mit **SQLite** (nicht PostgreSQL)
- Datenbank-Datei: `/app/shared/database/transcendence.db`
- Wird initialisiert durch `services/database` Container

## 🔗 Related Files

- `src/index.js` - Haupt-Service
- `package.json` - Dependencies
- `Dockerfile` - Docker Config
- `../../shared/utils/DatabaseClient.js` - Client für andere Services
- `../../shared/database/schema.sql` - Datenbank Schema