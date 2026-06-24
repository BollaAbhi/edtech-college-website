import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const getDuration = (fromStr, toStr) => {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const diffTime = to - from;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return isNaN(diffDays) || diffDays <= 0 ? 0 : diffDays;
};

const StaffLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leave/my');
      setLeaves(res.data.leaves);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch leave history.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      return showToast('All fields are required.', 'error');
    }

    const duration = getDuration(fromDate, toDate);
    if (duration <= 0) {
      return showToast('End date must be greater than or equal to start date.', 'error');
    }

    setSubmitting(true);
    try {
      await api.post('/leave', { fromDate, toDate, reason: reason.trim() });
      showToast('Leave request submitted successfully.');
      setFromDate('');
      setToDate('');
      setReason('');
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit leave request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Leave Management</h1>
            <p className="text-sm text-slate-500">Apply for leaves and track your approval status</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Apply Leave Form */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>✉️</span> Apply for Leave
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">From Date</label>
                    <input
                      type="date"
                      required
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">To Date</label>
                    <input
                      type="date"
                      required
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                {fromDate && toDate && (
                  <div className="text-xs text-slate-400 bg-slate-950 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between">
                    <span>Selected Duration:</span>
                    <span className="font-semibold text-cyan-400">{getDuration(fromDate, toDate)} Days</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reason</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a detailed reason for leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? 'Submitting request...' : 'Apply for Leave'}
                </button>
              </form>
            </div>

            {/* History Table */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🗓️</span> My Leave History
              </h2>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="py-16 text-center">
                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Loading leave history...</p>
                  </div>
                ) : leaves.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-slate-400 text-sm font-semibold">No leaves requested yet</p>
                    <p className="text-slate-600 text-xs mt-1">Your submitted leave requests will appear here.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Dates</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Reviewed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((leave) => {
                        const duration = getDuration(leave.fromDate, leave.toDate);
                        return (
                          <tr key={leave._id} className="border-b border-slate-800/50 hover:bg-slate-800/10 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-white">{leave.fromDate}</p>
                              <p className="text-xs text-slate-500">to {leave.toDate}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">{duration} Days</td>
                            <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px] truncate" title={leave.reason}>
                              {leave.reason}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${statusStyles[leave.status] || statusStyles.pending}`}>
                                {leave.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {leave.reviewedBy ? leave.reviewedBy.name : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffLeave;
