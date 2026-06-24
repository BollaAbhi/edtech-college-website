import { useState, useEffect } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const DEFAULT_PERIODS = [
  { time: '09:00 - 09:45', subject: '', staffName: '', staffId: '' },
  { time: '09:45 - 10:30', subject: '', staffName: '', staffId: '' },
  { time: '10:45 - 11:30', subject: '', staffName: '', staffId: '' },
  { time: '11:30 - 12:15', subject: '', staffName: '', staffId: '' },
  { time: '01:00 - 01:45', subject: '', staffName: '', staffId: '' },
  { time: '01:45 - 02:30', subject: '', staffName: '', staffId: '' },
  { time: '02:45 - 03:30', subject: '', staffName: '', staffId: '' },
];
const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English','Hindi','Computer Science',
  'History','Geography','Economics','Accountancy','Business Studies','Political Science',
  'Physical Education','Library','Lab','—',
];

const PrincipalTimetable = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [grid, setGrid] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Load staff list for dropdown
  useEffect(() => {
    api.get('/timetable/staff-list')
      .then((res) => setStaffList(res.data.staff))
      .catch(() => {});
  }, []);

  const loadTimetable = async () => {
    if (!selectedClass) { showToast('Select a class first.', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/timetable/class/${selectedClass}`);
      const tt = res.data.timetable;
      const newGrid = {};
      DAYS.forEach((day) => {
        if (tt[day] && tt[day].length > 0) {
          newGrid[day] = tt[day].map((p) => ({
            time: p.time,
            subject: p.subject || '',
            staffName: p.staffName || '',
            staffId: p.staffId || '',
          }));
        } else {
          newGrid[day] = DEFAULT_PERIODS.map((p) => ({ ...p }));
        }
      });
      setGrid(newGrid);
      setFetched(true);
    } catch (err) {
      showToast('Failed to load timetable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (day, periodIdx, field, value) => {
    setGrid((prev) => {
      const newGrid = { ...prev };
      newGrid[day] = [...newGrid[day]];
      newGrid[day][periodIdx] = { ...newGrid[day][periodIdx], [field]: value };

      // Auto-fill staff name when staffId selected
      if (field === 'staffId') {
        const staff = staffList.find((s) => s._id === value);
        newGrid[day][periodIdx].staffName = staff?.name || '';
      }

      return newGrid;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/timetable', { class: selectedClass, timetable: grid });
      showToast(`Timetable saved for ${selectedClass}.`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Timetable Builder</h1>
            <p className="text-sm text-slate-500">Create or edit weekly schedule for each class</p>
          </div>

          {/* Class selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setFetched(false); }}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all">
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={loadTimetable} disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Load Timetable
              </button>
            </div>
          </div>

          {/* Grid editor */}
          {fetched && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 sticky left-0 bg-slate-900 z-10">Period</th>
                      {DAYS.map((d) => (
                        <th key={d} className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{DAY_SHORT[d]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_PERIODS.map((_, pi) => (
                      <tr key={pi} className="border-b border-slate-800/50">
                        <td className="px-4 py-3 sticky left-0 bg-slate-900 z-10">
                          <div className="text-xs font-medium text-slate-500">P{pi + 1}</div>
                          <div className="text-[11px] text-slate-600">{grid[DAYS[0]]?.[pi]?.time || DEFAULT_PERIODS[pi].time}</div>
                        </td>
                        {DAYS.map((day) => {
                          const cell = grid[day]?.[pi] || { subject: '', staffId: '' };
                          return (
                            <td key={day} className="px-2 py-2">
                              <div className="space-y-1.5">
                                <select
                                  value={cell.subject}
                                  onChange={(e) => updateCell(day, pi, 'subject', e.target.value)}
                                  className={`w-full px-2 py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                                    cell.subject ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  <option value="">Subject</option>
                                  {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                <select
                                  value={cell.staffId || ''}
                                  onChange={(e) => updateCell(day, pi, 'staffId', e.target.value)}
                                  className={`w-full px-2 py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                                    cell.staffId ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  <option value="">Teacher</option>
                                  {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save */}
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Editing timetable for <span className="text-white font-medium">{selectedClass}</span> · {DEFAULT_PERIODS.length} periods × {DAYS.length} days
                </p>
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Timetable
                </button>
              </div>
            </div>
          )}

          {!fetched && !loading && (
            <div className="flex items-center justify-center h-64 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">🗓️</div>
                <p className="text-slate-400 font-medium">Select a class above</p>
                <p className="text-slate-600 text-sm mt-1">Then click "Load Timetable" to create or edit the schedule</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PrincipalTimetable;
