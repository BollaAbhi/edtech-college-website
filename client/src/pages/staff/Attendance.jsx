import { useState, useEffect } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const STATUS_OPTIONS = ['present', 'absent', 'late'];

const statusStyle = {
  present: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/40',
  absent:  'bg-red-500/15 text-red-400 border-red-500/30 ring-red-500/40',
  late:    'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/40',
};

const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'Hindi','Computer Science','History','Geography','Economics',
  'Accountancy','Business Studies','Political Science','Physical Education',
];

const CLASS_OPTIONS = [
  '8-A','8-B','9-A','9-B','10-A','10-B',
  '11-A','11-B','11-C','12-A','12-B','12-C',
];

const StaffAttendance = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) {
      showToast('Please select class, subject and date.', 'error');
      return;
    }
    setLoading(true);
    setFetched(false);
    try {
      const res = await api.get(`/attendance/classes?class=${selectedClass}&subject=${encodeURIComponent(selectedSubject)}&date=${selectedDate}`);
      setStudents(res.data.students);
      setAlreadySubmitted(res.data.alreadySubmitted);
      setFetched(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load students.', 'error');
    } finally {
      setLoading(false);
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
      setAlreadySubmitted(true);
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
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Mark Attendance</h1>
            <p className="text-sm text-slate-500">Select class, subject and date, then mark each student</p>
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setFetched(false); }}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
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
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
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
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadStudents}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  }
                  Load Students
                </button>
              </div>
            </div>
          </div>

          {/* Warning for non-today date */}
          {selectedDate && selectedDate !== new Date().toISOString().split('T')[0] && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>Staff can only mark or edit attendance for today's date. Editing for other days is restricted.</span>
            </div>
          )}

          {/* Student attendance table */}
          {fetched && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">{students.length} Students</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400">✓ {presentCount} Present</span>
                    <span className="text-red-400">✗ {absentCount} Absent</span>
                    <span className="text-amber-400">◷ {lateCount} Late</span>
                  </div>
                  {alreadySubmitted && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                      Already submitted — editing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mark all:</span>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => markAll(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${statusStyle[s]}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-slate-500">{i + 1}</td>
                        <td className="px-6 py-3.5 text-sm text-slate-400 font-mono">{s.rollNo}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                              {s.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-white">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            {STATUS_OPTIONS.map((status) => (
                              <button
                                key={status}
                                onClick={() => toggleStatus(s._id, status)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
                                  s.status === status
                                    ? `${statusStyle[status]} ring-1`
                                    : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
                                }`}
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

              {/* Submit */}
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || students.length === 0 || selectedDate !== new Date().toISOString().split('T')[0]}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {alreadySubmitted ? 'Update Attendance' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          )}

          {!fetched && !loading && (
            <div className="flex items-center justify-center h-64 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-slate-400 font-medium">Select class, subject and date above</p>
                <p className="text-slate-600 text-sm mt-1">Then click "Load Students" to begin marking</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StaffAttendance;
