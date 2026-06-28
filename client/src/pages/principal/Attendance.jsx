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

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [showMarkModal, setShowMarkModal] = useState(false);

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

  const handleEdit = (record) => {
    setEditingId(record._id);
    setEditingStatus(record.status);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingStatus('');
  };

  const handleSave = async (id) => {
    try {
      await api.put(`/attendance/${id}`, { status: editingStatus });
      showToast('Attendance record updated successfully.');
      setEditingId(null);
      fetchReport(pagination.page, applied);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update record.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      showToast('Attendance record deleted successfully.');
      fetchReport(pagination.page, applied);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete record.', 'error');
    }
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
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Attendance Report</h1>
              <p className="text-sm text-slate-500">Full institution attendance with filters</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMarkModal(true)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
              >
                <span>+ Mark Attendance</span>
              </button>
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
                  <tr className="border-b border-slate-800 bg-slate-950/20">
                    {['Date','Student','Roll No','Class','Subject','Status','Marked By','Actions'].map((h) => (
                      <th key={h} className={`${h === 'Actions' ? 'text-center' : 'text-left'} px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading report...</p>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
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
                          {editingId === r._id ? (
                            <select
                              value={editingStatus}
                              onChange={(e) => setEditingStatus(e.target.value)}
                              className="px-2 py-1 text-xs bg-slate-850 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg border capitalize ${statusStyle[r.status]}`}>
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm text-slate-300">{r.staffId?.name || '—'}</div>
                          {r.lastEditedByName && (
                            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                              Edited by: {r.lastEditedByName} ({new Date(r.lastEditedAt).toLocaleDateString()})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {editingId === r._id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSave(r._id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEdit(r)}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-300 rounded-lg transition-colors border border-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(r._id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors border border-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
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

      {showMarkModal && (
        <MarkAttendanceModal
          onClose={() => setShowMarkModal(false)}
          onSaveSuccess={() => {
            setShowMarkModal(false);
            fetchReport(1, applied);
          }}
        />
      )}
    </div>
  );
};

// Nested component for marking attendance from principal page
const MarkAttendanceModal = ({ onClose, onSaveSuccess }) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) {
      showToast('Please select class, subject and date.', 'error');
      return;
    }
    setLoadingStudents(true);
    setFetched(false);
    try {
      const res = await api.get(`/attendance/classes?class=${selectedClass}&subject=${encodeURIComponent(selectedSubject)}&date=${selectedDate}`);
      setStudents(res.data.students);
      setFetched(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load students.', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStatus = (id, status) => {
    setStudents((prev) => prev.map((s) => s._id === id ? { ...s, status } : s));
  };

  const markAll = (status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    if (students.length === 0) return;
    setSubmitting(true);
    try {
      const records = students.map(({ _id, status }) => ({ studentId: _id, status }));
      const res = await api.post('/attendance', {
        subject: selectedSubject,
        class: selectedClass,
        date: selectedDate,
        records,
      });
      showToast(res.data.message);
      onSaveSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount  = students.filter((s) => s.status === 'absent').length;
  const lateCount    = students.filter((s) => s.status === 'late').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Mark Attendance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select filters and mark student attendance</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">✕</button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setFetched(false); }}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              >
                <option value="">Select class</option>
                {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setFetched(false); }}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              >
                <option value="">Select subject</option>
                {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setFetched(false); }}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadStudents}
                disabled={loadingStudents}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingStudents
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                }
                Load Students
              </button>
            </div>
          </div>

          {/* Student List */}
          {fetched && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-900/30">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">{students.length} Students</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400">✓ {presentCount} Present</span>
                    <span className="text-red-400">✗ {absentCount} Absent</span>
                    <span className="text-amber-400">◷ {lateCount} Late</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mark all:</span>
                  {['present', 'absent', 'late'].map((s) => (
                    <button
                      key={s}
                      onClick={() => markAll(s)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize transition-all
                        ${s === 'present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                        ${s === 'absent' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                        ${s === 'late' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-950/40">
                      <th className="text-left px-5 py-3">Roll No</th>
                      <th className="text-left px-5 py-3">Name</th>
                      <th className="text-center px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {students.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-400 font-mono">{s.rollNo}</td>
                        <td className="px-5 py-3 text-sm font-medium text-white">{s.name}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {['present', 'absent', 'late'].map((status) => (
                              <button
                                key={status}
                                onClick={() => toggleStatus(s._id, status)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all
                                  ${s.status === status
                                    ? (status === 'present' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                       status === 'absent' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                       'bg-amber-500/15 text-amber-400 border-amber-500/30')
                                    : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
                                  }
                                `}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!fetched && (
            <div className="flex flex-col items-center justify-center h-48 border border-slate-800 border-dashed rounded-xl bg-slate-950/10">
              <span className="text-3xl mb-2">📋</span>
              <p className="text-slate-400 text-sm font-medium">Select class, subject, and date above</p>
              <p className="text-slate-600 text-xs mt-1">Then click "Load Students" to mark attendance</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/20">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || students.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrincipalAttendance;
