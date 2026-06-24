import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const priorityColors = {
  normal: 'border-slate-800 bg-slate-900 text-slate-400 border-l-4 border-l-slate-500',
  high: 'border-amber-500/20 bg-amber-500/5 text-amber-400 border-l-4 border-l-amber-500',
  urgent: 'border-red-500/20 bg-red-500/5 text-red-400 border-l-4 border-l-red-500',
};

const targetBadges = {
  all: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  staff: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  student: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const StaffNotices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // For delete confirmation

  // Compose State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');

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

  const handlePost = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      return showToast('Title and content are required.', 'error');
    }

    setSubmitting(true);
    try {
      await api.post('/notices', {
        title: title.trim(),
        content: content.trim(),
        priority,
      });
      showToast('Notice posted to students successfully!');
      setTitle('');
      setContent('');
      setPriority('normal');
      fetchNotices(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to post notice.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notices/${id}`);
      showToast('Notice deleted successfully.');
      setDeletingId(null);
      const isLastItem = notices.length === 1 && pagination.page > 1;
      fetchNotices(isLastItem ? pagination.page - 1 : pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete notice.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Notice Board</h1>
            <p className="text-sm text-slate-500">Post announcements to students, and view notices from administration</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Compose Form */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📝</span> Compose Notice
              </h2>

              <form onSubmit={handlePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter notice title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Content</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Write notice message..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Audience</label>
                    <input
                      type="text"
                      readOnly
                      value="Students Only"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400 select-none outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? 'Posting notice...' : 'Post to Students'}
                </button>
              </form>
            </div>

            {/* Notices Feed */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📢</span> Active Board
              </h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-400 text-sm">Loading active notices...</p>
                </div>
              ) : notices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-400 text-sm font-semibold">No notices available</p>
                  <p className="text-slate-600 text-xs mt-1">Announcements from the principal and staff will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {notices.map((notice) => {
                      const isAuthor = notice.authorId === user?.id;
                      return (
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
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${targetBadges[notice.targetRole] || 'bg-slate-800 text-slate-400'}`}>
                                To: {notice.targetRole}
                              </span>
                              {notice.priority !== 'normal' && (
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${
                                  notice.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {notice.priority}
                                </span>
                              )}

                              {/* Only show delete button for own notices */}
                              {isAuthor && (
                                <>
                                  {deletingId === notice._id ? (
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <button
                                        onClick={() => handleDelete(notice._id)}
                                        className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setDeletingId(null)}
                                        className="px-2 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeletingId(notice._id)}
                                      className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                      title="Delete notice"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                            {notice.content}
                          </p>
                        </div>
                      );
                    })}
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffNotices;
