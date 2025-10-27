/**
 * Database Service Client
 * Verwende diesen Client in allen Services (user-service, game-service, etc.)
 * 
 * Beispiel:
 * const DatabaseClient = require('../../shared/utils/DatabaseClient');
 * const db = new DatabaseClient();
 * 
 * const userId = await db.setNewId('users', { username: 'test', email: 'test@test.com' });
 * const username = await db.read('users', userId, 'username');
 */

class DatabaseClient {
  constructor(baseUrl = null) {
    // Automatisch die richtige URL verwenden
    this.baseUrl = baseUrl || process.env.DB_SERVICE_URL || 'http://database-service:3006';
  }

  /**
   * READ - Liest einen Wert aus einer Spalte
   * @param {string} table - Tabellenname
   * @param {number|string} id - ID des Eintrags
   * @param {string} column - Spaltenname
   * @returns {Promise<any>} - Wert der Spalte
   */
  async read(table, id, column) {
    try {
      const url = `${this.baseUrl}/api/read?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}&column=${encodeURIComponent(column)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Read operation failed');
      }
      
      return data.value;
    } catch (error) {
      console.error('❌ Database read error:', error.message);
      throw error;
    }
  }

  /**
   * WRITE - Schreibt einen Wert in eine Spalte
   * @param {string} table - Tabellenname
   * @param {number|string} id - ID des Eintrags
   * @param {string} column - Spaltenname
   * @param {any} value - Zu schreibender Wert
   */
  async write(table, id, column, value) {
    try {
      const response = await fetch(`${this.baseUrl}/api/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, column, value })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Write operation failed');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Database write error:', error.message);
      throw error;
    }
  }

  /**
   * CHECK - Prüft ob ein Wert mit dem checkvalue übereinstimmt
   * @param {string} table - Tabellenname
   * @param {number|string} id - ID des Eintrags
   * @param {string} column - Spaltenname
   * @param {any} checkvalue - Zu prüfender Wert
   * @returns {Promise<boolean>} - true wenn Werte übereinstimmen
   */
  async check(table, id, column, checkvalue) {
    try {
      const url = `${this.baseUrl}/api/check?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}&column=${encodeURIComponent(column)}&checkvalue=${encodeURIComponent(checkvalue)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Check operation failed');
      }
      
      return data.match;
    } catch (error) {
      console.error('❌ Database check error:', error.message);
      throw error;
    }
  }

  /**
   * SET NEW ID - Erstellt einen neuen Eintrag und gibt die ID zurück
   * @param {string} table - Tabellenname
   * @param {Object} data - Daten für den neuen Eintrag (key-value Paare)
   * @returns {Promise<number>} - ID des neuen Eintrags
   */
  async setNewId(table, data) {
    try {
      const response = await fetch(`${this.baseUrl}/api/setNewId`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, data })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'SetNewId operation failed');
      }
      
      return result.id;
    } catch (error) {
      console.error('❌ Database setNewId error:', error.message);
      throw error;
    }
  }

  /**
   * REMOVE ID - Löscht einen Eintrag mit der gegebenen ID
   * @param {string} table - Tabellenname
   * @param {number|string} id - ID des zu löschenden Eintrags
   */
  async removeId(table, id) {
    try {
      const url = `${this.baseUrl}/api/removeId?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
      const response = await fetch(url, { method: 'DELETE' });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'RemoveId operation failed');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Database removeId error:', error.message);
      throw error;
    }
  }

  /**
   * PRINT ID INPUT - Gibt alle Spaltenwerte einer ID als String zurück (mit ; getrennt)
   * @param {string} table - Tabellenname
   * @param {number|string} id - ID des Eintrags
   * @returns {Promise<string>} - String mit allen Werten getrennt durch ;
   */
  async printIdInput(table, id) {
    try {
      const url = `${this.baseUrl}/api/printIdInput?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'PrintIdInput operation failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ Database printIdInput error:', error.message);
      throw error;
    }
  }

  /**
   * LIST - Listet alle Einträge einer Tabelle (BONUS Funktion)
   * @param {string} table - Tabellenname
   * @param {number} limit - Maximale Anzahl der Ergebnisse
   * @param {number} offset - Offset für Pagination
   * @returns {Promise<Array>} - Array mit allen Einträgen
   */
  async list(table, limit = 100, offset = 0) {
    try {
      const url = `${this.baseUrl}/api/list?table=${encodeURIComponent(table)}&limit=${limit}&offset=${offset}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'List operation failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ Database list error:', error.message);
      throw error;
    }
  }

  /**
   * QUERY - Führt eine SELECT Query aus (BONUS Funktion)
   * @param {string} sql - SQL Query (nur SELECT erlaubt)
   * @param {Array} params - Parameter für die Query
   * @returns {Promise<Array>} - Array mit Ergebnissen
   */
  async query(sql, params = []) {
    try {
      const response = await fetch(`${this.baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Query operation failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  }

  /**
   * HEALTH CHECK - Prüft ob der Service erreichbar ist
   * @returns {Promise<boolean>} - true wenn Service läuft
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ Database service health check failed:', error.message);
      return false;
    }
  }
}

module.exports = DatabaseClient;