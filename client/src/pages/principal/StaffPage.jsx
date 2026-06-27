import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const EMPTY_FORM = { name: '', email: '', phone: '', subjectsAssigned: [], classesAssigned: [], isActive: true };

const SUBJECT_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'Hindi', 'Computer Science', 'History', 'Geography', 'Economics',
  'Accountancy', 'Business Studies', 'Political Science', 'Physical Education',
];

const CLASS_OPTIONS = [
  '8-A', '8-B', '9-A', '9-B', '10-A', '10-B',
  '11-A', '11-B', '11-C', '12-A', '12-B', '12-C',
];

/* ─── Tag Input ──────────────────────────────────────── */
const TagSelector = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(filter.toLowerCase()) && !selected.includes(o)
  );

  const addTag = (tag) => {
    onChange([...selected, tag]);
    setFilter('');
  };

  const removeTag = (tag) => {
    onChange(selected.filter((t) => t !== tag));
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>

      {/* Selected tags */}
      <div
        className="min-h-[42px] w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl flex flex-wrap gap-1.5 items-center cursor-text transition-all focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent"
        onClick={() => setIsOpen(true)}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 rounded-lg"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-violet-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={selected.length === 0 ? 'Type to search...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
      </div>

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(opt)}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-violet-500/10 hover:text-white transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Modal ──────────────────────────────────────────── */
const StaffModal = ({ isOpen, onClose, onSubmit, form, setForm, isEditing, isLoading }) => {
  if (!isOpen) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Staff' : 'Add New Staff'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
            <input
              name="name" required value={form.name} onChange={handleChange}
              placeholder="Staff member name"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
            <input
              name="email" type="email" required value={form.email} onChange={handleChange}
              placeholder="staff@example.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
            <input
              name="phone" value={form.phone} onChange={handleChange}
              placeholder="Phone number"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <TagSelector
            label="Assign Subjects"
            options={SUBJECT_OPTIONS}
            selected={form.subjectsAssigned}
            onChange={(v) => setForm({ ...form, subjectsAssigned: v })}
          />

          <TagSelector
            label="Assign Classes"
            options={CLASS_OPTIONS}
            selected={form.classesAssigned}
            onChange={(v) => setForm({ ...form, classesAssigned: v })}
          />

          {isEditing && (
            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Status</label>
              <select
                name="isActive" value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              >
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {isEditing ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Delete Confirm ─────────────────────────────────── */
const DeleteModal = ({ isOpen, onClose, onConfirm, staffName, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-4">
          🗑️
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Staff Member</h3>
        <p className="text-sm text-slate-400 mb-6">
          Are you sure you want to delete <span className="text-white font-medium">{staffName}</span>? This will also remove their login account.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={isLoading}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Staff Page ────────────────────────────────── */
const StaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStaff = useCallback(async (page = 1, query = search) => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-members?page=${page}&limit=8&search=${encodeURIComponent(query)}`);
      setStaffList(res.data.staff);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load staff.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchStaff(1, search); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchStaff(1, search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (s) => {
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      subjectsAssigned: s.subjectsAssigned || [],
      classesAssigned: s.classesAssigned || [],
      isActive: s.userId?.isActive !== false,
    });
    setIsEditing(true);
    setEditingId(s._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isEditing) {
        await api.put(`/staff-members/${editingId}`, form);
        showToast('Staff updated successfully.');
      } else {
        const res = await api.post('/staff-members', form);
        showToast(res.data.message);
      }
      setShowModal(false);
      fetchStaff(isEditing ? pagination.page : 1, search);
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/staff-members/${deleteModal.id}`);
      showToast('Staff deleted successfully.');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchStaff(pagination.page, search);
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = async (id, name) => {
    if (window.confirm(`Are you sure you want to reset the password for ${name} to default (Staff@<First4Name>)?`)) {
      try {
        const res = await api.post(`/staff-members/${id}/reset-password`);
        showToast(res.data?.message || 'Password reset successfully.', 'success');
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to reset password.', 'error');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 ml-64">
        <Navbar />

        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Staff</h1>
              <p className="text-sm text-slate-500">Manage teaching and non-teaching staff</p>
            </div>
            <button
              id="add-staff-btn"
              onClick={openAddModal}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Staff
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-staff"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or subject..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
            <span className="text-sm text-slate-500">
              {pagination.total} staff member{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Member</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-slate-500">Loading staff...</p>
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="text-4xl mb-3">👨‍🏫</div>
                        <p className="text-sm text-slate-400 font-medium">No staff members found</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {search ? 'Try a different search term' : 'Add your first staff member to get started'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    staffList.map((s) => (
                      <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-cyan-600/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                                {s.name}
                                {s.userId?.isActive === false && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-550/10 text-red-400 border border-red-500/20">
                                    Deactivated
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{s.phone || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {s.subjectsAssigned.length > 0 ? (
                              s.subjectsAssigned.map((subj) => (
                                <span key={subj} className="px-2 py-0.5 text-[11px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-md">
                                  {subj}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                            {s.classesAssigned.length > 0 ? (
                              s.classesAssigned.map((cls) => (
                                <span key={cls} className="px-2 py-0.5 text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
                                  {cls}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(s._id, s.name)}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                              title="Reset Password"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-5 4a5 5 0 01-5-5 5 5 0 015-5 5 5 0 015 5 5 5 0 01-5 5zm0 0v8m0 0l-3-3m3 3l3-3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, id: s._id, name: s.name })}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {((pagination.page - 1) * 8) + 1}–{Math.min(pagination.page * 8, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchStaff(pagination.page - 1, search)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchStaff(p, search)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                        p === pagination.page
                          ? 'bg-violet-600 text-white font-semibold'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchStaff(pagination.page + 1, search)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <StaffModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        isEditing={isEditing}
        isLoading={formLoading}
      />
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        onConfirm={handleDelete}
        staffName={deleteModal.name}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default StaffPage;
