import { useState, useEffect } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const gradeColor = {
  'A+': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'A':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'B+': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'B':  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'C':  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'D':  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'F':  'bg-red-500/10 text-red-400 border-red-500/20',
};

const examLabel = { unit: 'Unit Test', midterm: 'Mid-Term', final: 'Final Exam' };

const getBarColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-cyan-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};

const getTextColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 60) return 'text-cyan-400';
  if (pct >= 40) return 'text-amber-400';
  return 'text-red-400';
};

const StudentMarks = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/marks/my');
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setData({ subjects: [], overallPercentage: 0, totalObtained: 0, totalMax: 0, grade: 'N/A' });
        } else {
          setError(err.response?.data?.message || 'Failed to load marks.');
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
            <p className="text-slate-400 text-sm">Loading marksheet...</p>
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
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">My Marksheet</h1>
            <p className="text-sm text-slate-500">Subject-wise performance with grades</p>
          </div>

          {/* Overall summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
            <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5">
              <p className="text-xs text-slate-400 mb-1">Overall Percentage</p>
              <p className={`text-3xl font-bold tracking-tight ${getTextColor(data.overallPercentage)}`}>{data.overallPercentage}%</p>
            </div>
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-violet-600/5">
              <p className="text-xs text-slate-400 mb-1">Overall Grade</p>
              <p className="text-3xl font-bold tracking-tight text-violet-400">{data.grade}</p>
            </div>
            <div className="p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-cyan-600/5">
              <p className="text-xs text-slate-400 mb-1">Total Marks</p>
              <p className="text-3xl font-bold tracking-tight text-cyan-400">{data.totalObtained}<span className="text-lg text-slate-500">/{data.totalMax}</span></p>
            </div>
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-600/5">
              <p className="text-xs text-slate-400 mb-1">Subjects</p>
              <p className="text-3xl font-bold tracking-tight text-amber-400">{data.subjects.length}</p>
            </div>
          </div>

          {/* Subject cards */}
          {data.subjects.length > 0 ? (
            <div className="space-y-4">
              {data.subjects.map((s) => (
                <div key={s.subject} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  {/* Subject header */}
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-semibold text-white">{s.subject}</h3>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${gradeColor[s.grade] || gradeColor['F']}`}>
                        {s.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(s.overallPercentage)}`} style={{ width: `${s.overallPercentage}%` }} />
                      </div>
                      <span className={`text-sm font-bold ${getTextColor(s.overallPercentage)}`}>{s.overallPercentage}%</span>
                    </div>
                  </div>

                  {/* Exam rows */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/60">
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                        <th className="text-center px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                        <th className="text-center px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.exams.map((e) => (
                        <tr key={e.examType} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-sm font-medium text-slate-300">{examLabel[e.examType] || e.examType}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-sm font-mono text-white">{e.marksObtained}<span className="text-slate-500">/{e.totalMarks}</span></span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`text-sm font-bold ${getTextColor(e.percentage)}`}>{e.percentage}%</span>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-400">{e.date}</td>
                          <td className="px-6 py-3 text-sm text-slate-400">{e.staffName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Subject total */}
                  <div className="px-6 py-3 bg-slate-800/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Subject Total</span>
                    <span className="text-sm font-bold text-white">{s.totalObtained} / {s.totalMax}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-slate-400 text-sm font-medium">No marks recorded yet</p>
                <p className="text-slate-600 text-xs mt-1">Your marks will appear here once entered by your teachers</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentMarks;
