import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const ACTION_OPTIONS = [
  { value: 'LOGIN_SUCCESS', label: 'Login Success' },
  { value: 'LOGIN_FAILED', label: 'Login Failure' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'ACCOUNT_LOCKOUT', label: 'Account Lockout' },
  { value: 'ACCOUNT_UNLOCK', label: 'Account Unlock' },
  { value: 'SESSION_INVALIDATION', label: 'Session Invalidation' },
];

const badgeStyles = {
  LOGIN_SUCCESS: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  LOGIN_FAILED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  PASSWORD_RESET: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  ACCOUNT_LOCKOUT: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  ACCOUNT_UNLOCK: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  SESSION_INVALIDATION: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 15,
        action: actionFilter,
        startDate,
        endDate,
        search: searchQuery.trim(),
      });

      const res = await api.get(`/api/audit/logs?${params}`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      // Fetch all records for export (ignore pagination limits)
      const params = new URLSearchParams({
        limit: 9999,
        action: actionFilter,
        startDate,
        endDate,
        search: searchQuery.trim(),
      });
      const res = await api.get(`/api/audit/logs?${params}`);
      const allLogs = res.data.logs;

      if (allLogs.length === 0) {
        return showToast('No log records available to export.', 'error');
      }

      // Build CSV headers
      const csvHeaders = ['Timestamp', 'Email', 'Role', 'Action', 'IP Address', 'Status', 'Details'];
      
      // Build CSV rows
      const csvRows = allLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(),
        `"${log.userEmail}"`,
        `"${log.userRole || 'system'}"`,
        log.action,
        log.ipAddress,
        log.success ? 'Success' : 'Failure',
        `"${log.details.replace(/"/g, '""')}"`
      ]);

      // Join CSV contents
      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exported audit logs to CSV successfully!');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">System Audit Logs</h1>
              <p className="text-sm text-slate-500">Monitor access attempts, lockout events, and security status</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
            >
              📥 Export to CSV
            </button>
          </div>

          {/* Filters Block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search email, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {(searchQuery || actionFilter || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Fetching system logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 text-center">
                <div className="text-4xl mb-3">🛡️</div>
                <p className="text-slate-400 text-sm font-semibold">No audit logs found</p>
                <p className="text-slate-600 text-xs mt-1">Adjust filters or check back later</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-white">{log.userEmail}</p>
                            {log.userRole && (
                              <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">{log.userRole}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg border capitalize tracking-wider ${badgeStyles[log.action] || 'bg-slate-700/10 text-slate-400 border-slate-750'}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                            {log.ipAddress || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${log.success ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                              {log.success ? 'Success' : 'Failure'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                            {log.details || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-slate-800">
                    <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchLogs(pagination.page - 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchLogs(pagination.page + 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuditLogs;
