import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const statusStyle = {
  present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  absent:  'bg-red-500/10 text-red-400 border-red-500/20',
  late:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const CLASS_OPTIONS = [
  '8-A','8-B','9-A','9-B','10-A','10-B',
  '11-A','11-B','11-C','12-A','12-B','12-C',
];

const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'Hindi','Computer Science','History','Geography','Economics',
  'Accountancy','Business Studies','Political Science','Physical Education',
];

const downloadCSV = (records) => {
  if (!records.length) return;
  const headers = ['Date','Student Name','Roll No','Class','Subject','Status','Marked By'];
  const rows = records.map((r) => [
    r.date,
    r.studentId?.name || '—',
    r.studentId?.rollNo || '—',
    r.class,
    r.subject,
    r.status,
    r.staffId?.name || '—',
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const PrincipalAttendance = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [allRecords, setAllRecords] = useState([]);

  const [filters, setFilters] = useState({ class: '', date: '', subject: '' });
  const [applied, setApplied] = useState({ class: '', date: '', subject: '' });

  const fetchReport = useCallback(async (page = 1, f = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (f.class) params.append('class', f.class);
      if (f.date) params.append('date', f.date);
      if (f.subject) params.append('subject', f.subject);

      const res = await api.get(`/attendance/report?${params}`);
      setRecords(res.data.records);
      setSummary(res.data.summary);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  // Fetch all records (no pagination) for CSV download
  const fetchAllForCSV = async () => {
    try {
      const params = new URLSearchParams({ page: 1, limit: 10000 });
      if (applied.class) params.append('class', applied.class);
      if (applied.date) params.append('date', applied.date);
      if (applied.subject) params.append('subject', applied.subject);
      const res = await api.get(`/attendance/report?${params}`);
      downloadCSV(res.data.records);
      showToast(`Downloaded ${res.data.records.length} records as CSV.`);
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    }
  };

  useEffect(() => { fetchReport(1, applied); }, []);

  const applyFilters = () => {
    setApplied({ ...filters });
    fetchReport(1, filters);
  };

  const clearFilters = () => {
    const empty = { class: '', date: '', subject: '' };
    setFilters(empty);
    setApplied(empty);
    fetchReport(1, empty);
  };

  const hasFilters = applied.class || applied.date || applied.subject;
  const attendancePct = summary.total > 0 ? ((summary.totalPresent / summary.total) * 100).toFixed(1) : 0;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Attendance Report</h1>
              <p className="text-sm text-slate-500">Full institution attendance with filters</p>
            </div>
            <button
              onClick={fetchAllForCSV}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Records', value: summary.total, color: 'violet', icon: '📊' },
              { label: 'Present', value: summary.totalPresent, color: 'emerald', icon: '✓' },
              { label: 'Absent', value: summary.totalAbsent, color: 'red', icon: '✗' },
              { label: 'Late', value: summary.totalLate, color: 'amber', icon: '◷' },
            ].map((card) => (
              <div key={card.label} className={`p-5 rounded-2xl border bg-gradient-to-br
                ${card.color === 'violet' ? 'from-violet-500/15 to-violet-600/5 border-violet-500/20' : ''}
                ${card.color === 'emerald' ? 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20' : ''}
                ${card.color === 'red' ? 'from-red-500/15 to-red-600/5 border-red-500/20' : ''}
                ${card.color === 'amber' ? 'from-amber-500/15 to-amber-600/5 border-amber-500/20' : ''}
              `}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                  </div>
                  <span className="text-xl">{card.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <select
                  value={filters.class}
                  onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                >
                  <option value="">All classes</option>
                  {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                >
                  <option value="">All subjects</option>
                  {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Apply
                </button>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="py-2.5 px-3 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {hasFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-slate-500">Filters:</span>
                {applied.class && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Class: {applied.class}</span>}
                {applied.subject && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Subject: {applied.subject}</span>}
                {applied.date && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Date: {applied.date}</span>}
              </div>
            )}
          </div>

          {/* Records table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Date','Student','Roll No','Class','Subject','Status','Marked By'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading report...</p>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm text-slate-400 font-medium">No attendance records found</p>
                        <p className="text-xs text-slate-600 mt-1">Adjust your filters or wait for staff to mark attendance</p>
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-slate-300 font-mono whitespace-nowrap">{r.date}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-violet-600/20 flex items-center justify-center text-[11px] font-bold text-violet-400">
                              {r.studentId?.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm text-white font-medium">{r.studentId?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{r.studentId?.rollNo || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-300">{r.class}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-300">{r.subject}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg border capitalize ${statusStyle[r.status]}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-400">{r.staffId?.name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {((pagination.page - 1) * 15) + 1}–{Math.min(pagination.page * 15, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchReport(pagination.page - 1)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >← Prev</button>
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchReport(p)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === pagination.page ? 'bg-violet-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800'}`}
                    >{p}</button>
                  ))}
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchReport(pagination.page + 1)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalAttendance;
