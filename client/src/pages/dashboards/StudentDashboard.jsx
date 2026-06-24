import { useState, useEffect } from 'react';
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

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/student/my-info');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
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

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatCard
              title="Overall Attendance"
              value={`${data.overallAttendance}%`}
              subtitle={data.overallAttendance >= 75 ? 'Above minimum requirement' : 'Below 75% — attend more classes'}
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
