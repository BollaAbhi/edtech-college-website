import { useState, useEffect } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import api from '../../utils/api';

const statusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const overallStyles = {
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  partial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  unpaid: 'text-red-400 bg-red-500/10 border-red-500/20',
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
          setData({ records: [], summary: { totalDue: 0, totalPaid: 0, totalOutstanding: 0, overallStatus: 'unpaid' } });
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

  const { summary, records } = data;

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
              <p className="text-sm text-slate-500">View your billing, receipts, and outstanding fee balance</p>
            </div>
            <span className={`inline-flex px-3 py-1.5 text-xs font-bold uppercase rounded-lg border capitalize tracking-wider ${overallStyles[summary.overallStatus] || overallStyles.unpaid}`}>
              Status: {summary.overallStatus}
            </span>
          </div>

          {/* Overall Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Amount Billed</p>
              <p className="text-3xl font-bold text-white">₹{summary.totalDue.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Total Amount Paid</p>
              <p className="text-3xl font-bold text-emerald-400">₹{summary.totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Outstanding Balance</p>
              <p className="text-3xl font-bold text-red-400">₹{summary.totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Breakdown & Receipts Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Semester-wise breakdown */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Semester Invoices</h3>

              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-400 text-sm font-semibold">No fee records found</p>
                  <p className="text-slate-600 text-xs mt-1">You have no invoices listed for this academic year.</p>
                </div>
              ) : (
                records.map((rec) => {
                  const pct = rec.amount > 0 ? (rec.paidAmount / rec.amount) * 100 : 0;
                  return (
                    <div key={rec._id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h4 className="text-base font-bold text-white">{rec.semester}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Billed Amount: ₹{rec.amount.toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg tracking-wider ${statusStyles[rec.status] || statusStyles.pending}`}>
                          {rec.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Paid: ₹{rec.paidAmount.toLocaleString()}</span>
                          <span className="font-semibold text-white">{pct.toFixed(0)}% Completed</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div
                            className={`h-full rounded-full transition-all duration-750 ${getBarColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Payment history ledger */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold text-white mb-4">Recent Receipts</h3>

              {records.filter(r => r.paidAmount > 0).length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-600 text-xs">No transaction records found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {records
                    .filter((rec) => rec.paidAmount > 0)
                    .map((rec) => (
                      <div key={rec._id} className="pb-4 border-b border-slate-800 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400 font-medium">{rec.semester}</span>
                          <span className="text-xs font-bold text-emerald-400">₹{rec.paidAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-slate-500">Transaction Date</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{rec.paidDate || '—'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentFeeStatus;
