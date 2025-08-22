// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axiosConfig from '../../utils/axiosConfig';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState({});
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });

  // Check if user is admin (you should implement proper admin role checking)
  const isAdmin = user && (user.username === 'admin' || user.role === 'admin');

  useEffect(() => {
    if (isAdmin) {
      fetchTables();
    }
  }, [isAdmin]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axiosConfig.get('/api/admin/tables');
      setTables(response.data.tables);
      setError('');
    } catch (err) {
      setError('Failed to fetch tables: ' + err.message);
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName, offset = 0) => {
    try {
      setLoading(true);
      const response = await axiosConfig.get(`/api/admin/tables/${tableName}`, {
        params: { limit: pagination.limit, offset }
      });
      setTableData(response.data.data);
      setPagination(prev => ({
        ...prev,
        offset,
        total: response.data.total
      }));
      setSelectedTable(tableName);
      setError('');
    } catch (err) {
      setError('Failed to fetch table data: ' + err.message);
      console.error('Error fetching table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName) => {
    fetchTableData(tableName, 0);
  };

  const handlePreviousPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchTableData(selectedTable, newOffset);
  };

  const handleNextPage = () => {
    const newOffset = pagination.offset + pagination.limit;
    if (newOffset < pagination.total) {
      fetchTableData(selectedTable, newOffset);
    }
  };

  const formatValue = (value) => {
    if (value === null) return 'NULL';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value.toString();
  };

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={fetchTables} className="refresh-btn">
          Refresh Tables
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-content">
        <div className="tables-sidebar">
          <h3>Database Tables</h3>
          {loading && <div className="loading">Loading...</div>}
          
          <div className="tables-list">
            {Object.entries(tables).map(([tableName, tableInfo]) => (
              <div
                key={tableName}
                className={`table-item ${selectedTable === tableName ? 'active' : ''}`}
                onClick={() => handleTableSelect(tableName)}
              >
                <div className="table-name">{tableName}</div>
                <div className="table-info">
                  {tableInfo.row_count} rows, {tableInfo.columns.length} columns
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="table-content">
          {selectedTable ? (
            <>
              <div className="table-header">
                <h3>{selectedTable}</h3>
                <div className="pagination-info">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} records
                </div>
              </div>

              {tableData.length > 0 ? (
                <>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {Object.keys(tableData[0]).map(column => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} title={formatValue(value)}>
                                {formatValue(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination">
                    <button 
                      onClick={handlePreviousPage} 
                      disabled={pagination.offset === 0}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button 
                      onClick={handleNextPage} 
                      disabled={pagination.offset + pagination.limit >= pagination.total}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-data">No data found in {selectedTable}</div>
              )}
            </>
          ) : (
            <div className="select-table">
              <h3>Select a table to view its data</h3>
              <p>Choose a table from the sidebar to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;