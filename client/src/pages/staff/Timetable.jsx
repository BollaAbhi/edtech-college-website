import { useState, useEffect } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const dayColors = [
  'from-violet-500/10 border-violet-500/15',
  'from-cyan-500/10 border-cyan-500/15',
  'from-emerald-500/10 border-emerald-500/15',
  'from-amber-500/10 border-amber-500/15',
  'from-rose-500/10 border-rose-500/15',
  'from-indigo-500/10 border-indigo-500/15',
];

const StaffTimetable = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/timetable/staff/my');
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setData({ staffName: '', timetable: {} });
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
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
  const totalPeriods = DAYS.reduce((a, d) => a + (tt[d]?.length || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">My Schedule</h1>
            <p className="text-sm text-slate-500">Your weekly teaching timetable — {totalPeriods} periods this week</p>
          </div>

          {totalPeriods === 0 ? (
            <div className="flex items-center justify-center h-48 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-4xl mb-3">🗓️</div>
                <p className="text-slate-400 text-sm font-medium">No schedule assigned yet</p>
                <p className="text-slate-600 text-xs mt-1">Contact the principal to set up your timetable</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {DAYS.map((day, di) => {
                const periods = tt[day] || [];
                if (periods.length === 0) return null;

                return (
                  <div key={day} className={`bg-gradient-to-br ${dayColors[di]} to-transparent border rounded-2xl overflow-hidden bg-slate-900`}>
                    <div className="px-5 py-4 border-b border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">{day}</h3>
                        <span className="px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 rounded-lg">
                          {periods.length} period{periods.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-800/40">
                      {periods.map((p, pi) => (
                        <div key={pi} className="px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{p.subject}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Class {p.class}</p>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">{p.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StaffTimetable;
