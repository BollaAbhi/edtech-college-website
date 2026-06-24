import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const EMPTY_FORM = { name: '', email: '', phone: '', class: '', division: '', rollNo: '', feeStatus: 'unpaid' };

const FeeStatusBadge = ({ status }) => {
  const styles = {
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg border capitalize ${styles[status]}`}>
      {status}
    </span>
  );
};

/* ─── Modal ──────────────────────────────────────────── */
const StudentModal = ({ isOpen, onClose, onSubmit, form, setForm, isEditing, isLoading }) => {
  if (!isOpen) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
              <input
                name="name" required value={form.name} onChange={handleChange}
                placeholder="Student name"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
              <input
                name="email" type="email" required value={form.email} onChange={handleChange}
                placeholder="student@example.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
              <input
                name="phone" value={form.phone} onChange={handleChange}
                placeholder="Phone number"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Class *</label>
              <input
                name="class" required value={form.class} onChange={handleChange}
                placeholder="e.g. 10"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Division *</label>
              <input
                name="division" required value={form.division} onChange={handleChange}
                placeholder="e.g. A"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Roll No *</label>
              <input
                name="rollNo" required value={form.rollNo} onChange={handleChange}
                placeholder="e.g. 01"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Fee Status</label>
              <select
                name="feeStatus" value={form.feeStatus} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

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
              {isEditing ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Delete Confirm Modal ───────────────────────────── */
const DeleteModal = ({ isOpen, onClose, onConfirm, studentName, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-4">
          🗑️
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Student</h3>
        <p className="text-sm text-slate-400 mb-6">
          Are you sure you want to delete <span className="text-white font-medium">{studentName}</span>? This will also remove their login account. This action cannot be undone.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
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

/* ─── Main Students Page ─────────────────────────────── */
const Students = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Delete state
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStudents = useCallback(async (page = 1, query = search) => {
    setLoading(true);
    try {
      const res = await api.get(`/students?page=${page}&limit=8&search=${encodeURIComponent(query)}`);
      setStudents(res.data.students);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load students.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStudents(1, search);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchStudents(1, search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setForm({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      class: student.class,
      division: student.division,
      rollNo: student.rollNo,
      feeStatus: student.feeStatus,
    });
    setIsEditing(true);
    setEditingId(student._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (isEditing) {
        await api.put(`/students/${editingId}`, form);
        showToast('Student updated successfully.');
      } else {
        const res = await api.post('/students', form);
        showToast(res.data.message);
      }
      setShowModal(false);
      fetchStudents(isEditing ? pagination.page : 1, search);
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/students/${deleteModal.id}`);
      showToast('Student deleted successfully.');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchStudents(pagination.page, search);
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <div className="flex-1 ml-64">
        <Navbar />

        <main className="p-8">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Students</h1>
              <p className="text-sm text-slate-500">Manage all students in your institution</p>
            </div>
            <button
              id="add-student-btn"
              onClick={openAddModal}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          {/* Search bar + info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-students"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or roll no..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
            <span className="text-sm text-slate-500">
              {pagination.total} student{pagination.total !== 1 ? 's' : ''} total
            </span>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-slate-500">Loading students...</p>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm text-slate-400 font-medium">No students found</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {search ? 'Try a different search term' : 'Add your first student to get started'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-violet-600/20 flex items-center justify-center text-sm font-bold text-violet-400">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{s.class}-{s.division}</td>
                        <td className="px-6 py-4 text-sm text-slate-300 font-mono">{s.rollNo}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{s.phone || '—'}</td>
                        <td className="px-6 py-4"><FeeStatusBadge status={s.feeStatus} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
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
                    onClick={() => fetchStudents(pagination.page - 1, search)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchStudents(p, search)}
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
                    onClick={() => fetchStudents(pagination.page + 1, search)}
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
      <StudentModal
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
        studentName={deleteModal.name}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default Students;
