import { useState, useEffect } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const statusStyle = {
  present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  absent:  'bg-red-500/10 text-red-400 border-red-500/20',
  late:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const getBarColor = (pct) => {
  if (pct >= 85) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-red-500';
};

const getTextColor = (pct) => {
  if (pct >= 85) return 'text-emerald-400';
  if (pct >= 75) return 'text-amber-400';
  return 'text-red-400';
};

const StudentAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/attendance/my');
        setData(res.data);
      } catch (err) {
        // If no records yet, show empty state gracefully
        if (err.response?.status === 404) {
          setData({ subjects: [], overallPercentage: "No attendance recorded yet", totalClasses: 0 });
        } else {
          setError(err.response?.data?.message || 'Failed to load attendance.');
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
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading attendance...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center"><p className="text-slate-400">{error}</p></div>
        </div>
      </div>
    );
  }

  const overallColor = typeof data.overallPercentage === 'number' ? getTextColor(data.overallPercentage) : 'text-slate-400';
  const overallBar = typeof data.overallPercentage === 'number' ? getBarColor(data.overallPercentage) : 'bg-slate-800';
  const overallWidth = typeof data.overallPercentage === 'number' ? `${data.overallPercentage}%` : '0%';

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">My Attendance</h1>
            <p className="text-sm text-slate-500">Subject-wise attendance breakdown</p>
          </div>

          {/* Overall card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="sm:col-span-1 p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5">
              <p className="text-sm text-slate-400 mb-1">Overall Attendance</p>
              <p className={`text-4xl font-bold tracking-tight ${overallColor}`}>
                {typeof data.overallPercentage === 'number' ? `${data.overallPercentage}%` : data.overallPercentage}
              </p>
              <p className="text-xs text-slate-500 mt-2">{data.totalClasses} total classes recorded</p>
              <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${overallBar}`} style={{ width: overallWidth }} />
              </div>
              <p className="text-xs mt-2">
                {typeof data.overallPercentage === 'number' ? (
                  data.overallPercentage >= 75
                    ? <span className="text-emerald-400">✓ Above minimum requirement</span>
                    : <span className="text-red-400">⚠ Below 75% — attend more classes</span>
                ) : (
                  <span className="text-slate-500">No attendance marked yet</span>
                )}
              </p>
            </div>

            <div className="sm:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Subject Summary</p>
              <div className="space-y-3">
                {data.subjects.length === 0 ? (
                  <p className="text-slate-500 text-sm">No attendance recorded yet.</p>
                ) : (
                  data.subjects.map((s) => (
                    <div key={s.subject} className="flex items-center gap-4">
                      <span className="text-sm text-slate-300 w-36 truncate">{s.subject}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getBarColor(s.percentage)}`}
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-14 text-right ${getTextColor(s.percentage)}`}>{s.percentage}%</span>
                      <span className="text-xs text-slate-600 w-20 text-right">{s.present+s.late}/{s.total} classes</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Subject-wise detail table */}
          {data.subjects.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Subject-wise Detail</h3>
                <p className="text-xs text-slate-500 mt-0.5">Click a subject row to view session history</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Subject','Total Classes','Present','Absent','Late','Attendance %'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.subjects.map((s) => (
                    <>
                      <tr
                        key={s.subject}
                        onClick={() => setExpanded(expanded === s.subject ? null : s.subject)}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{s.subject}</span>
                            <span className="text-slate-600 text-xs">{expanded === s.subject ? '▲' : '▼'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{s.total}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">{s.present}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">{s.absent}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">{s.late}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full max-w-[80px]">
                              <div className={`h-full rounded-full ${getBarColor(s.percentage)}`} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${getTextColor(s.percentage)}`}>{s.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                      {expanded === s.subject && (
                        <tr key={`${s.subject}-expanded`} className="border-b border-slate-800/50 bg-slate-950/60">
                          <td colSpan={6} className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Session History</p>
                            <div className="flex flex-wrap gap-2">
                              {s.records.sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${statusStyle[r.status]}`}>
                                  <span>{r.date}</span>
                                  <span className="capitalize font-medium">· {r.status}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.subjects.length === 0 && (
            <div className="flex items-center justify-center h-48 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-400 text-sm font-medium">No attendance records yet</p>
                <p className="text-slate-600 text-xs mt-1">Your attendance will appear here once recorded by your teacher</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentAttendance;
