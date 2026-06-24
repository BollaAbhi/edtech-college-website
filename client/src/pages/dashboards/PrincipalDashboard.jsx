import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import api from '../../utils/api';

const CHART_COLORS = ['#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon, trend, color }) => {
  const colorMap = {
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br ${colorMap[color]} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      {/* Decorative circle */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/[0.03]"></div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs text-slate-400">
            {entry.name}: <span className="text-white font-medium">{entry.value}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-white">
          {payload[0].name}: <span className="text-violet-400">₹{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const PrincipalDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/principal/stats');
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 ml-64">
        <Navbar />

        <main className="p-8">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
            <p className="text-sm text-slate-500">Welcome back. Here's what's happening at your institution.</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon="🎒"
              trend={12}
              color="violet"
            />
            <StatCard
              title="Total Staff"
              value={stats.totalStaff}
              icon="👨‍🏫"
              trend={4}
              color="cyan"
            />
            <StatCard
              title="Fee Collected"
              value={`₹${stats.totalFeeCollected.toLocaleString()}`}
              icon="💰"
              trend={8}
              color="pink"
            />
            <StatCard
              title="Avg Attendance"
              value={`${stats.avgAttendance}%`}
              icon="📊"
              trend={-2}
              color="amber"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart — attendance trend */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Monthly Attendance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Attendance percentage trend over the year</p>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
                  2025-26
                </span>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyAttendance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar
                    dataKey="attendance"
                    name="Attendance"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart — fee breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">Fee Status</h3>
                <p className="text-xs text-slate-500 mt-0.5">Collected vs pending breakdown</p>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.feeBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.feeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-sm text-slate-400 ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Fee summary */}
              <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                    Collected
                  </span>
                  <span className="text-sm font-medium text-white">₹{stats.totalFeeCollected.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                    Pending
                  </span>
                  <span className="text-sm font-medium text-white">₹{stats.totalFeePending.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalDashboard;
