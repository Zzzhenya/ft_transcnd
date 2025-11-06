import { getToken } from "./real-auth";
import { API_BASE } from "./config";

// Generische Funktion zum Schreiben in die Datenbank
export async function writeDB(
    table: string, 
    id: number | string, 
    column: string, 
    value: any
): Promise<{ success: boolean; error?: string }> {
    try {
        const token = getToken();
        
        const response = await fetch(`${API_BASE}/database/write`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                table,
                id,
                column,
                value
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return { success: true };
        } else {
            const error = await response.json();
            return { success: false, error: error.message || 'Database write failed' };
        }
    } catch (error) {
        console.error('Database write error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Network error' 
        };
    }
}

// Generische Funktion zum Lesen aus der Datenbank
export async function readDB(
    table: string, 
    id: number | string, 
    columns: string | string[] = '*'
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const token = getToken();
        const columnString = Array.isArray(columns) ? columns.join(',') : columns;
        
        const response = await fetch(`${API_BASE}/database/read?table=${table}&id=${id}&columns=${columnString}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return { success: true, data: data.data };
        } else {
            const error = await response.json();
            return { success: false, error: error.message || 'Database read failed' };
        }
    } catch (error) {
        console.error('Database read error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Network error' 
        };
    }
}

// Generische Query-Funktion für komplexere Abfragen
export async function queryDB(
    table: string,
    filters: Record<string, any> = {},
    columns: string[] = ['*'],
    limit: number = 100
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const token = getToken();
        
        const response = await fetch(`${API_BASE}/database/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                table,
                columns,
                filters,
                limit
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            return { success: true, data: result.data };
        } else {
            const error = await response.json();
            return { success: false, error: error.message || 'Database query failed' };
        }
    } catch (error) {
        console.error('Database query error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Network error' 
        };
    }
}