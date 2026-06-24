import { useState, useEffect } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import api from '../../utils/api';

const StatusBadge = ({ status }) => {
  const styles = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    ongoing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    upcoming: 'bg-slate-700/40 text-slate-400 border-slate-600/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${styles[status]}`}>
      {status === 'ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PriorityDot = ({ priority }) => (
  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priority === 'high' ? 'bg-red-400' : 'bg-slate-600'}`}></span>
);

const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
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

const StaffDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/staff/my-info');
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
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  const completedCount = data.todaySchedule.filter((s) => s.status === 'completed').length;
  const totalPeriods = data.todaySchedule.length;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 ml-64">
        <Navbar />

        <main className="p-8">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Staff Dashboard</h1>
            <p className="text-sm text-slate-500">
              Today's overview &middot; {completedCount}/{totalPeriods} periods completed
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatCard
              title="My Classes"
              value={data.assignedClasses.length}
              subtitle={`${data.assignedClasses.reduce((a, c) => a + c.students, 0)} total students`}
              icon="📖"
              color="cyan"
            />
            <StatCard
              title="My Subjects"
              value={data.assignedSubjects.length}
              subtitle={data.assignedSubjects.map((s) => s.code).join(', ')}
              icon="📚"
              color="violet"
            />
            <StatCard
              title="Leave Status"
              value={data.pendingLeave.pending}
              subtitle={`${data.pendingLeave.approved} approved · ${data.pendingLeave.rejected} rejected`}
              icon="✉️"
              color="amber"
            />
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's schedule table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Today's Schedule</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                  {totalPeriods} Periods
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.todaySchedule.map((slot) => (
                      <tr
                        key={slot.id}
                        className={`border-b border-slate-800/50 transition-colors ${
                          slot.status === 'ongoing' ? 'bg-amber-500/[0.03]' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                            {slot.period}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 font-mono">{slot.time}</td>
                        <td className="px-6 py-4 text-sm text-white font-medium">{slot.subject}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{slot.class}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{slot.room}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={slot.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Announcements panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Recent Announcements</h3>
                <p className="text-xs text-slate-500 mt-0.5">Latest notices from administration</p>
              </div>

              <div className="divide-y divide-slate-800/60">
                {data.announcements.map((notice) => (
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
                <button className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  View all notices →
                </button>
              </div>
            </div>
          </div>

          {/* Assigned classes quick view */}
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="px-6 py-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">My Classes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Classes assigned to you this semester</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
              {data.assignedClasses.map((cls) => (
                <div key={cls.id} className="px-6 py-5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-lg">
                      🏫
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{cls.name}</p>
                      <p className="text-xs text-slate-500">{cls.students} students</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
