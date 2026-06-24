import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/student/Sidebar';
import Navbar from '../../components/student/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const priorityColors = {
  normal: 'border-slate-800 bg-slate-900 text-slate-400 border-l-4 border-l-slate-500',
  high: 'border-amber-500/20 bg-amber-500/5 text-amber-400 border-l-4 border-l-amber-500',
  urgent: 'border-red-500/20 bg-red-500/5 text-red-400 border-l-4 border-l-red-500',
};

const StudentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchNotices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/notices?page=${page}&limit=10`);
      setNotices(res.data.notices);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch notices.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices(1);
  }, [fetchNotices]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8 text-slate-100">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Notice Board</h1>
            <p className="text-sm text-slate-500">Read the latest notices and announcements from school administration and staff</p>
          </div>

          <div className="max-w-4xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📢</span> Active Notices
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-sm">Loading active notices...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-slate-400 text-sm font-semibold">No active notices</p>
                <p className="text-slate-600 text-xs mt-1">Check back later for any new notices or announcements.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <div
                      key={notice._id}
                      className={`p-6 rounded-2xl border transition-all duration-200 ${
                        priorityColors[notice.priority] || 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white">{notice.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-400">{notice.authorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase font-medium">
                              {notice.authorRole}
                            </span>
                            <span>•</span>
                            <span>{new Date(notice.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {notice.priority !== 'normal' && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${
                              notice.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {notice.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {notice.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-slate-500">
                      Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} notices total)
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchNotices(pagination.page - 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchNotices(pagination.page + 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentNotices;
