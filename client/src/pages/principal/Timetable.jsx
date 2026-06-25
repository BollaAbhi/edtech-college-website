import { useState, useEffect } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const DEFAULT_PERIODS = [
  { startTime: '09:00', endTime: '09:45', subject: '', staffName: '', staffId: '' },
  { startTime: '09:45', endTime: '10:30', subject: '', staffName: '', staffId: '' },
  { startTime: '10:45', endTime: '11:30', subject: '', staffName: '', staffId: '' },
  { startTime: '11:30', endTime: '12:15', subject: '', staffName: '', staffId: '' },
  { startTime: '13:00', endTime: '13:45', subject: '', staffName: '', staffId: '' },
  { startTime: '13:45', endTime: '14:30', subject: '', staffName: '', staffId: '' },
  { startTime: '14:45', endTime: '15:30', subject: '', staffName: '', staffId: '' },
];
const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English','Hindi','Computer Science',
  'History','Geography','Economics','Accountancy','Business Studies','Political Science',
  'Physical Education','Library','Lab','—',
];

// Helper: parse "HH:MM - HH:MM" into { startTime, endTime }
const parseTimeStr = (timeStr) => {
  const parts = timeStr.split(/[\-\u2013\u2014]/).map((t) => t.trim());
  return { startTime: parts[0] || '09:00', endTime: parts[1] || '09:45' };
};

// Helper: build "HH:MM - HH:MM" from startTime, endTime
const formatTimeStr = (startTime, endTime) => `${startTime} - ${endTime}`;

const PrincipalTimetable = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [grid, setGrid] = useState({});
  const [timeSlots, setTimeSlots] = useState(DEFAULT_PERIODS.map((p) => ({ startTime: p.startTime, endTime: p.endTime })));
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

      // Detect time slots from first non-empty day
      let detectedSlots = null;
      for (const day of DAYS) {
        if (tt[day] && tt[day].length > 0) {
          detectedSlots = tt[day].map((p) => parseTimeStr(p.time));
          break;
        }
      }

      const slots = detectedSlots || DEFAULT_PERIODS.map((p) => ({ startTime: p.startTime, endTime: p.endTime }));
      setTimeSlots(slots);

      const periodCount = slots.length;

      DAYS.forEach((day) => {
        if (tt[day] && tt[day].length > 0) {
          newGrid[day] = tt[day].map((p, idx) => {
            const parsed = parseTimeStr(p.time);
            return {
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              subject: p.subject || '',
              staffName: p.staffName || '',
              staffId: p.staffId || '',
            };
          });
          // Pad to match slot count
          while (newGrid[day].length < periodCount) {
            newGrid[day].push({
              startTime: slots[newGrid[day].length]?.startTime || '09:00',
              endTime: slots[newGrid[day].length]?.endTime || '09:45',
              subject: '', staffName: '', staffId: '',
            });
          }
        } else {
          newGrid[day] = slots.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            subject: '', staffName: '', staffId: '',
          }));
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

  // Update time slot (applied uniformly across all days for that row)
  const updateTimeSlot = (periodIdx, field, value) => {
    setTimeSlots((prev) => {
      const newSlots = [...prev];
      newSlots[periodIdx] = { ...newSlots[periodIdx], [field]: value };
      return newSlots;
    });
    // Sync the time into every day's period
    setGrid((prev) => {
      const newGrid = { ...prev };
      for (const day of DAYS) {
        if (newGrid[day]) {
          newGrid[day] = [...newGrid[day]];
          newGrid[day][periodIdx] = { ...newGrid[day][periodIdx], [field]: value };
        }
      }
      return newGrid;
    });
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

  // Add a new period row
  const addPeriod = () => {
    const last = timeSlots[timeSlots.length - 1];
    const newStart = last?.endTime || '15:30';
    // Calculate a default end time 45 min after start
    const [h, m] = newStart.split(':').map(Number);
    const endDate = new Date(2000, 0, 1, h, m + 45);
    const newEnd = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    setTimeSlots((prev) => [...prev, { startTime: newStart, endTime: newEnd }]);
    setGrid((prev) => {
      const newGrid = { ...prev };
      for (const day of DAYS) {
        if (newGrid[day]) {
          newGrid[day] = [...newGrid[day], { startTime: newStart, endTime: newEnd, subject: '', staffName: '', staffId: '' }];
        }
      }
      return newGrid;
    });
  };

  // Remove the last period row
  const removePeriod = () => {
    if (timeSlots.length <= 1) return;
    setTimeSlots((prev) => prev.slice(0, -1));
    setGrid((prev) => {
      const newGrid = { ...prev };
      for (const day of DAYS) {
        if (newGrid[day]) {
          newGrid[day] = newGrid[day].slice(0, -1);
        }
      }
      return newGrid;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build the timetable payload with formatted time strings
      const payload = {};
      for (const day of DAYS) {
        if (grid[day]) {
          payload[day] = grid[day].map((p, idx) => ({
            time: formatTimeStr(timeSlots[idx]?.startTime || p.startTime, timeSlots[idx]?.endTime || p.endTime),
            subject: p.subject,
            staffName: p.staffName,
            staffId: p.staffId || '',
          }));
        }
      }
      await api.post('/timetable', { class: selectedClass, timetable: payload });
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
              {/* Period controls */}
              <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  <span className="text-violet-400 font-semibold">{timeSlots.length}</span> periods configured
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={removePeriod} disabled={timeSlots.length <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    − Remove Period
                  </button>
                  <button onClick={addPeriod}
                    className="px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg transition-all">
                    + Add Period
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-56 sticky left-0 bg-slate-900 z-10">
                        Period / Time
                      </th>
                      {DAYS.map((d) => (
                        <th key={d} className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{DAY_SHORT[d]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot, pi) => (
                      <tr key={pi} className="border-b border-slate-800/50">
                        <td className="px-3 py-3 sticky left-0 bg-slate-900 z-10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg min-w-[32px] text-center">
                              P{pi + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlot(pi, 'startTime', e.target.value)}
                                className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all w-[100px]"
                              />
                              <span className="text-slate-600 text-xs">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateTimeSlot(pi, 'endTime', e.target.value)}
                                className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all w-[100px]"
                              />
                            </div>
                          </div>
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
                  Editing timetable for <span className="text-white font-medium">{selectedClass}</span> · {timeSlots.length} periods × {DAYS.length} days
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
