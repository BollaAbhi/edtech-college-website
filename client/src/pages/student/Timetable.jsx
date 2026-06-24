import { useState, useEffect } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const subjectColors = {
  'Mathematics': 'bg-violet-500/10 text-violet-400',
  'Physics': 'bg-cyan-500/10 text-cyan-400',
  'Chemistry': 'bg-emerald-500/10 text-emerald-400',
  'Biology': 'bg-green-500/10 text-green-400',
  'English': 'bg-amber-500/10 text-amber-400',
  'Hindi': 'bg-orange-500/10 text-orange-400',
  'Computer Science': 'bg-blue-500/10 text-blue-400',
  'History': 'bg-rose-500/10 text-rose-400',
  'Geography': 'bg-teal-500/10 text-teal-400',
  'Physical Education': 'bg-red-500/10 text-red-400',
  'Lab': 'bg-indigo-500/10 text-indigo-400',
  'Library': 'bg-yellow-500/10 text-yellow-400',
};

const getSubjectColor = (subject) => subjectColors[subject] || 'bg-slate-700/30 text-slate-300';

const StudentTimetable = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/timetable/student/my');
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setData({ class: '—', timetable: {} });
        } else {
          setError(err.response?.data?.message || 'Failed to load timetable.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const tt = data?.timetable || {};

  // Find max periods across all days for table rows
  const maxPeriods = Math.max(0, ...DAYS.map((d) => (tt[d]?.length || 0)));
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">My Timetable</h1>
            <p className="text-sm text-slate-500">Weekly schedule for Class {data?.class}</p>
          </div>

          {maxPeriods === 0 ? (
            <div className="flex items-center justify-center h-48 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-4xl mb-3">🗓️</div>
                <p className="text-slate-400 text-sm font-medium">No timetable set for your class yet</p>
                <p className="text-slate-600 text-xs mt-1">The schedule will appear here once created by the principal</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20 sticky left-0 bg-slate-900 z-10">Period</th>
                      {DAYS.map((d) => (
                        <th key={d} className={`text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider ${
                          d === todayName ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span>{DAY_SHORT[d]}</span>
                          {d === todayName && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">TODAY</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxPeriods }, (_, pi) => (
                      <tr key={pi} className="border-b border-slate-800/50">
                        <td className="px-5 py-3 sticky left-0 bg-slate-900 z-10">
                          <div className="text-xs font-medium text-slate-500">P{pi + 1}</div>
                          <div className="text-[10px] text-slate-600">{tt[DAYS[0]]?.[pi]?.time || ''}</div>
                        </td>
                        {DAYS.map((day) => {
                          const period = tt[day]?.[pi];
                          const isToday = day === todayName;
                          return (
                            <td key={day} className={`px-3 py-2 ${isToday ? 'bg-emerald-500/[0.03]' : ''}`}>
                              {period && period.subject ? (
                                <div className={`px-3 py-2.5 rounded-xl text-center ${getSubjectColor(period.subject)} transition-all`}>
                                  <p className="text-xs font-semibold">{period.subject}</p>
                                  {period.staffName && (
                                    <p className="text-[10px] opacity-70 mt-0.5">{period.staffName}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="px-3 py-2.5 text-center text-slate-700 text-xs">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-6 py-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(subjectColors).map(([subject, color]) => (
                    <span key={subject} className={`px-2.5 py-1 text-[11px] font-medium rounded-lg ${color}`}>
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentTimetable;
