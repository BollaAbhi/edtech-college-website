import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
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

const PrincipalLeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leave/all');
      setRequests(res.data.leaves);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch leave requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecision = async (id, decision) => {
    setActioningId(id);
    try {
      await api.put(`/leave/${id}`, { status: decision });
      showToast(`Leave request ${decision} successfully.`);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update leave request.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastDecisions = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Leave Requests</h1>
            <p className="text-sm text-slate-500">Review staff leave applications and manage approvals</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            {/* Pending Requests Column */}
            <div className="xl:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>⏳</span> Pending Approvals ({pendingRequests.length})
              </h2>

              {loading ? (
                <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Loading leave applications...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                  <div className="text-4xl mb-3">✓</div>
                  <p className="text-slate-400 text-sm font-semibold">Inbox Cleared</p>
                  <p className="text-slate-600 text-xs mt-1">No pending leave requests to review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => {
                    const duration = getDuration(req.fromDate, req.toDate);
                    return (
                      <div key={req._id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:border-slate-700 transition-colors">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-white">{req.staffId?.name || 'Unknown Staff'}</h3>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded uppercase">
                              Staff
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">📅 {req.fromDate} to {req.toDate}</span>
                            <span className="font-semibold text-violet-400">· {duration} Days</span>
                          </div>

                          <p className="text-sm text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 mt-3 italic">
                            "{req.reason}"
                          </p>

                          {req.staffId?.subjectsAssigned?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase mr-1">Subjects:</span>
                              {req.staffId.subjectsAssigned.map((s, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-500/10 rounded">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            disabled={actioningId === req._id}
                            onClick={() => handleDecision(req._id, 'approved')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId === req._id}
                            onClick={() => handleDecision(req._id, 'rejected')}
                            className="px-4 py-2 bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-500/10"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Decisions History Column */}
            <div className="xl:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📜</span> Decision History
              </h2>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-h-[640px] overflow-y-auto pr-2 space-y-4">
                {loading ? (
                  <div className="py-10 text-center">
                    <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-xs">Loading logs...</p>
                  </div>
                ) : pastDecisions.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-slate-600 text-xs">No reviewed leaves logged.</p>
                  </div>
                ) : (
                  pastDecisions.map((dec) => (
                    <div key={dec._id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{dec.staffId?.name || 'Unknown Staff'}</h4>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg tracking-wider ${statusStyles[dec.status] || statusStyles.pending}`}>
                          {dec.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-500">
                        <p>Dates: {dec.fromDate} to {dec.toDate}</p>
                        <p className="mt-1 truncate">Reason: "{dec.reason}"</p>
                      </div>

                      {dec.reviewedBy && (
                        <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between">
                          <span>Evaluated by:</span>
                          <span className="font-semibold text-slate-400">{dec.reviewedBy.name}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalLeaveRequests;
