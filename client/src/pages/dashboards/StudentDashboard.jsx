import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  };

  return (
    <div className={`relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br ${colorMap[color]} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/[0.03]"></div>
    </div>
  );
};

const AttendanceTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-white mb-1">{d.subject}</p>
        <p className="text-xs text-slate-400">
          Attended: <span className="text-white font-medium">{d.attended}/{d.total}</span>
        </p>
        <p className="text-xs text-slate-400">
          Percentage: <span className="text-emerald-400 font-medium">{d.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const getBarColor = (percentage) => {
  if (percentage >= 85) return '#34d399';
  if (percentage >= 75) return '#fbbf24';
  return '#f87171';
};

const ScoreBadge = ({ score }) => {
  let color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (score < 60) color = 'bg-red-500/10 text-red-400 border-red-500/20';
  else if (score < 75) color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg border ${color}`}>
      {score}%
    </span>
  );
};

const PriorityDot = ({ priority }) => (
  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priority === 'high' ? 'bg-red-400' : 'bg-slate-600'}`}></span>
);

// ── Helpers for the ongoing class widget ─────────────────────────────────────
function parseTime(timeStr) {
  const parts = timeStr.split(/[\-\u2013\u2014]/).map(t => t.trim());
  if (parts.length < 2) return null;
  const [sh, sm] = parts[0].split(':').map(Number);
  const [eh, em] = parts[1].split(':').map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return null;
  return { startH: sh, startM: sm, endH: eh, endM: em };
}

function getTimeRemaining(endH, endM) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);
  const diffMs = end - now;
  if (diffMs <= 0) return null;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return { mins, secs, total: diffMs };
}

// ── Ongoing Class Widget Component ───────────────────────────────────────────
const OngoingClassWidget = ({ schedule }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!schedule || schedule.length === 0) {
    return (
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">📚</div>
          <div>
            <h3 className="text-base font-semibold text-white">Current Class</h3>
            <p className="text-xs text-slate-500">No schedule data available for today</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
          <p className="text-slate-400 text-sm">No timetable has been set for your class yet.</p>
          <p className="text-slate-600 text-xs mt-1">Check back after your principal configures the schedule.</p>
        </div>
      </div>
    );
  }

  // Determine ongoing and next class
  let ongoingClass = null;
  let nextClass = null;

  for (const slot of schedule) {
    const parsed = parseTime(slot.time);
    if (!parsed) continue;

    const startDate = new Date(now);
    startDate.setHours(parsed.startH, parsed.startM, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(parsed.endH, parsed.endM, 0, 0);

    if (now >= startDate && now <= endDate) {
      ongoingClass = { ...slot, parsed };
    } else if (now < startDate && !nextClass) {
      nextClass = { ...slot, parsed };
    }
  }

  // If no ongoing and no next, all classes are done
  const allDone = !ongoingClass && !nextClass;

  // Time remaining for ongoing class
  let remaining = null;
  if (ongoingClass) {
    remaining = getTimeRemaining(ongoingClass.parsed.endH, ongoingClass.parsed.endM);
  }

  // Progress bar percentage for ongoing class
  let progressPct = 0;
  if (ongoingClass && remaining) {
    const { startH, startM, endH, endM } = ongoingClass.parsed;
    const totalDuration = (endH * 60 + endM) - (startH * 60 + startM);
    const elapsed = totalDuration - remaining.mins;
    progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  return (
    <div className="mb-6">
      <div className={`relative overflow-hidden rounded-2xl border ${
        ongoingClass
          ? 'bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 border-emerald-500/20'
          : allDone
            ? 'bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 border-violet-500/20'
            : 'bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/20'
      }`}>
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/5 blur-2xl pointer-events-none"></div>

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                ongoingClass ? 'bg-emerald-500/15 border border-emerald-500/25' : allDone ? 'bg-violet-500/15 border border-violet-500/25' : 'bg-amber-500/15 border border-amber-500/25'
              }`}>
                {ongoingClass ? '🎓' : allDone ? '✅' : '⏳'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {ongoingClass ? 'Class In Progress' : allDone ? 'All Classes Completed' : 'No Class Right Now'}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ongoingClass ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-xs text-slate-500 font-mono">
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
          </div>

          {/* Ongoing Class */}
          {ongoingClass && (
            <div className="bg-slate-800/40 backdrop-blur-sm border border-emerald-500/10 rounded-xl p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-white mb-1">{ongoingClass.subject}</p>
                  {ongoingClass.staffName && (
                    <p className="text-sm text-slate-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">👤</span>
                      {ongoingClass.staffName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time Left</p>
                  {remaining && (
                    <p className="text-xl font-bold text-emerald-400 font-mono tracking-wide">
                      {String(remaining.mins).padStart(2, '0')}:{String(remaining.secs).padStart(2, '0')}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500 font-mono">{ongoingClass.time}</span>
                  <span className="text-[11px] text-slate-500">Period {ongoingClass.period}</span>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* No ongoing class message */}
          {!ongoingClass && !allDone && nextClass && (
            <div className="bg-slate-800/40 backdrop-blur-sm border border-amber-500/10 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                  📖
                </div>
                <div>
                  <p className="text-white font-semibold">No class currently</p>
                  <p className="text-sm text-slate-400">
                    Next class is <span className="text-amber-400 font-semibold">{nextClass.subject}</span> at{' '}
                    <span className="text-white font-mono">{nextClass.time.split(/[\-\u2013\u2014]/)[0].trim()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* All done message */}
          {allDone && (
            <div className="bg-slate-800/40 backdrop-blur-sm border border-violet-500/10 rounded-xl p-5 mb-4 text-center">
              <p className="text-lg font-semibold text-white mb-1">🎉 You're done for the day!</p>
              <p className="text-sm text-slate-400">All scheduled classes have been completed.</p>
            </div>
          )}

          {/* Next class preview (when ongoing) */}
          {ongoingClass && nextClass && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold min-w-[44px]">Next</span>
              <div className="w-px h-8 bg-slate-700/50"></div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{nextClass.subject}</p>
                  {nextClass.staffName && <p className="text-xs text-slate-500">{nextClass.staffName}</p>}
                </div>
                <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded-lg">
                  {nextClass.time.split(/[\-\u2013\u2014]/)[0].trim()}
                </span>
              </div>
            </div>
          )}

          {/* Mini schedule timeline */}
          {schedule.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <p className="text-[11px] text-slate-600 uppercase tracking-wider font-semibold mb-2.5">Today's Timeline</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {schedule.map((slot) => {
                  const isOngoing = ongoingClass && slot.id === ongoingClass.id;
                  const isCompleted = slot.status === 'completed';
                  return (
                    <div
                      key={slot.id}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-center min-w-[72px] border transition-all ${
                        isOngoing
                          ? 'bg-emerald-500/15 border-emerald-500/30 ring-1 ring-emerald-500/20'
                          : isCompleted
                            ? 'bg-slate-800/40 border-slate-700/30 opacity-50'
                            : 'bg-slate-800/30 border-slate-700/20'
                      }`}
                    >
                      <p className={`text-[10px] font-bold ${isOngoing ? 'text-emerald-400' : 'text-slate-500'}`}>P{slot.period}</p>
                      <p className={`text-xs font-medium truncate ${isOngoing ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
                        {slot.subject === '—' ? '—' : slot.subject.length > 6 ? slot.subject.substring(0, 6) + '..' : slot.subject}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/student/my-info');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh schedule data every 60 seconds
    const interval = setInterval(() => {
      api.get('/student/my-info')
        .then((res) => setData(res.data))
        .catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm">Loading dashboard...</p>
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
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-lg text-white font-medium mb-2">Unable to load data</p>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const lastExam = data.recentMarks[0];
  const feeLabel =
    data.feeStatus.status === 'paid' ? 'Paid' : data.feeStatus.status === 'partial' ? 'Partial' : 'Unpaid';

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 ml-64">
        <Navbar />

        <main className="p-8">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Student Dashboard</h1>
            <p className="text-sm text-slate-500">Your academic overview at a glance</p>
          </div>

          {/* Ongoing Class Widget */}
          <OngoingClassWidget schedule={data.todaySchedule || []} />

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatCard
              title="Overall Attendance"
              value={typeof data.overallAttendance === 'number' ? `${data.overallAttendance}%` : data.overallAttendance}
              subtitle={typeof data.overallAttendance === 'number' ? (data.overallAttendance >= 75 ? 'Above minimum requirement' : 'Below 75% — attend more classes') : 'No attendance marked yet'}
              icon="📋"
              color="emerald"
            />
            <StatCard
              title="Last Exam Score"
              value={`${lastExam.score}/${lastExam.total}`}
              subtitle={`${lastExam.subject} · ${lastExam.exam}`}
              icon="🏆"
              color="violet"
            />
            <StatCard
              title="Fee Status"
              value={feeLabel}
              subtitle={`₹${data.feeStatus.pending.toLocaleString()} pending · Due ${new Date(data.feeStatus.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              icon="💰"
              color="amber"
            />
          </div>

          {/* Charts + Notices row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Subject-wise attendance bar chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Subject-wise Attendance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your attendance breakdown per subject</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>≥85%
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>75–84%
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400"></span>&lt;75%
                  </span>
                </div>
              </div>

              {!data.subjectAttendance || data.subjectAttendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-slate-400 text-sm font-medium">No attendance recorded yet</p>
                  <p className="text-slate-600 text-xs mt-1">Your attendance will appear here once recorded by your teacher</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.subjectAttendance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="subject"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {data.subjectAttendance.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(entry.percentage)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Notices panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Recent Notices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Announcements from your institution</p>
              </div>

              <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
                {data.notices.map((notice) => (
                  <div key={notice.id} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <PriorityDot priority={notice.priority} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white truncate">{notice.title}</h4>
                          {notice.priority === 'high' && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-400 rounded border border-red-500/20 uppercase">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-2">{notice.body}</p>
                        <p className="text-[11px] text-slate-600">
                          {new Date(notice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-slate-800">
                <button className="w-full text-center text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  View all notices →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: Recent marks + Upcoming exams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent marks */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Recent Marks</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your latest exam results</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMarks.map((mark) => (
                      <tr key={mark.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-white font-medium">{mark.subject}</td>
                        <td className="px-6 py-3.5 text-sm text-slate-400">{mark.exam}</td>
                        <td className="px-6 py-3.5 text-sm text-slate-300 font-mono">{mark.score}/{mark.total}</td>
                        <td className="px-6 py-3.5"><ScoreBadge score={mark.score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming exams */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Upcoming Exams</h3>
                <p className="text-xs text-slate-500 mt-0.5">Prepare ahead for these dates</p>
              </div>

              <div className="divide-y divide-slate-800/60">
                {data.upcomingExams.map((exam) => {
                  const examDate = new Date(exam.date);
                  const daysLeft = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={exam.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase leading-none">
                            {examDate.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-white leading-tight">
                            {examDate.getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{exam.subject}</p>
                          <p className="text-xs text-slate-500">{exam.type}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                        daysLeft <= 7
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Today'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
