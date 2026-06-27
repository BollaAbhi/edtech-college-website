import { useState, useEffect } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const statusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending: 'bg-red-500/10 text-red-400 border border-red-500/20',
  not_set: 'bg-slate-700/30 text-slate-400 border border-slate-600/30',
};

const overallStyles = {
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  partial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  unpaid: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const termIcons = {
  yearly: '📅',
  term1: '☀️',
  term2: '🍂',
  term3: '❄️',
};

const getBarColor = (pct) => {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-slate-800';
};

const StudentFeeStatus = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await api.get('/fees/my');
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setData({
            records: [],
            summary: { totalDue: 0, totalPaid: 0, totalOutstanding: 0, overallStatus: 'unpaid' },
            termStatus: {},
            currentYear: '',
          });
        } else {
          setError(err.response?.data?.message || 'Failed to load fee information.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading fee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center text-slate-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { summary, records, termStatus, currentYear } = data;

  // Calculate overall progress
  const overallPct = summary.totalDue > 0 ? (summary.totalPaid / summary.totalDue) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">My Fee Status</h1>
              <p className="text-sm text-slate-500">
                Academic Year {currentYear || '—'} · View your billing & payment history
              </p>
            </div>
            <span className={`inline-flex px-3 py-1.5 text-xs font-bold uppercase rounded-lg border capitalize tracking-wider ${overallStyles[summary.overallStatus] || overallStyles.unpaid}`}>
              {summary.overallStatus === 'unpaid' ? 'Pending' : summary.overallStatus}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Fee</p>
              <p className="text-3xl font-bold text-white">₹{summary.totalDue.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Total Paid</p>
              <p className="text-3xl font-bold text-emerald-400">₹{summary.totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Outstanding</p>
              <p className="text-3xl font-bold text-red-400">₹{summary.totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Overall Payment Progress</p>
              <p className="text-sm font-bold text-emerald-400">{overallPct.toFixed(0)}%</p>
            </div>
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(overallPct)}`} style={{ width: `${overallPct}%` }}></div>
            </div>
          </div>

          {/* Term-wise Status Cards */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Term-wise Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Object.entries(termStatus || {}).map(([key, term]) => {
                const pct = term.amount > 0 ? (term.paidAmount / term.amount) * 100 : 0;
                const outstanding = term.amount - term.paidAmount;
                return (
                  <div key={key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{termIcons[key] || '📋'}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{term.label}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{key}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${statusStyles[term.status]}`}>
                        {term.status === 'not_set' ? 'N/A' : term.status}
                      </span>
                    </div>

                    {term.status === 'not_set' ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-slate-600">Not yet assigned</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Fee Amount</span>
                            <span className="text-white font-medium">₹{term.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Paid</span>
                            <span className="text-emerald-400 font-medium">₹{term.paidAmount.toLocaleString()}</span>
                          </div>
                          {outstanding > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Pending</span>
                              <span className="text-red-400 font-bold">₹{outstanding.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1.5 text-right">{pct.toFixed(0)}% paid</p>

                        {term.paidDate && (
                          <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                            <span>📅</span> Paid on {term.paidDate}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {Object.keys(termStatus || {}).length === 0 && (
                <div className="col-span-full text-center py-12 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-400 text-sm font-semibold">No term fees assigned yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Payment History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Complete record of all fee transactions</p>
            </div>

            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-slate-400 text-sm font-semibold">No payment records found</p>
                <p className="text-slate-600 text-xs mt-1">Records will appear here once fees are assigned by the principal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Fee Type</th>
                      <th className="px-6 py-3">Academic Year</th>
                      <th className="px-6 py-3">Total</th>
                      <th className="px-6 py-3">Paid</th>
                      <th className="px-6 py-3">Balance</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const balance = rec.amount - rec.paidAmount;
                      return (
                        <tr key={rec._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="text-sm font-medium text-white">{rec.feeTypeLabel}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-400">{rec.academicYear}</td>
                          <td className="px-6 py-3.5 text-sm text-white font-mono">₹{rec.amount.toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-sm text-emerald-400 font-mono">₹{rec.paidAmount.toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-sm font-mono">
                            <span className={balance > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                              ₹{balance.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-400">{rec.paidDate || '—'}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg tracking-wider ${statusStyles[rec.status]}`}>
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentFeeStatus;
