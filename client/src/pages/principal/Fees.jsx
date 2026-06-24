import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const DIV_OPTIONS = ['A', 'B', 'C'];
const STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'partial', label: 'Partial', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'unpaid', label: 'Unpaid', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const feeStatusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  unpaid: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const recordStatusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const SEMESTERS = ['Semester 1', 'Semester 2', 'Fall 2026', 'Spring 2026'];

const PrincipalFees = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ totalExpected: 0, totalCollected: 0, totalOutstanding: 0, paymentRate: '0.0' });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [studentRecords, setStudentRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Form State
  const [semester, setSemester] = useState('Semester 1');
  const [amount, setAmount] = useState('5000');
  const [paidAmount, setPaidAmount] = useState('0');
  const [status, setStatus] = useState('pending');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Load students & general collection stats
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // 1. Fetch Students matching filters
      const studentParams = new URLSearchParams({
        page,
        limit: 10,
        search: search.trim(),
        classFilter: classFilter,
      });
      // We can filter by feeStatus (which is feeStatus in Student model)
      // but the backend GET /api/students takes search, page, limit, classFilter.
      // So we will filter student status locally or query all and filter, or just rely on search.
      // Let's call the students API
      const studentsRes = await api.get(`/students?${studentParams}`);
      
      let filteredStudents = studentsRes.data.students;
      if (statusFilter) {
        filteredStudents = filteredStudents.filter(s => s.feeStatus === statusFilter);
      }
      setStudents(filteredStudents);
      setPagination(studentsRes.data.pagination);

      // 2. Fetch overall Stats from /api/fees
      const feesParams = new URLSearchParams();
      if (classFilter) feesParams.append('class', classFilter);
      if (semesterFilter) feesParams.append('semester', semesterFilter);
      const feesRes = await api.get(`/fees?${feesParams}`);
      setStats(feesRes.data.stats);

    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter, semesterFilter]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Load fee records for modal student
  const loadStudentFees = async (studentId) => {
    setRecordsLoading(true);
    try {
      const res = await api.get(`/fees?studentId=${studentId}`);
      setStudentRecords(res.data.records);
    } catch (err) {
      showToast('Failed to load student payment records.', 'error');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleOpenModal = (student) => {
    setSelectedStudent(student);
    setSemester('Semester 1');
    setAmount('5000');
    setPaidAmount('0');
    setStatus('pending');
    setPaidDate(new Date().toISOString().split('T')[0]);
    loadStudentFees(student._id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setStudentRecords([]);
  };

  const handleSelectRecord = (rec) => {
    setSemester(rec.semester);
    setAmount(rec.amount.toString());
    setPaidAmount(rec.paidAmount.toString());
    setStatus(rec.status);
    setPaidDate(rec.paidDate || new Date().toISOString().split('T')[0]);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      return showToast('Please enter a valid total fee amount.', 'error');
    }

    setSubmitting(true);
    try {
      await api.post('/fees', {
        studentId: selectedStudent._id,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        semester,
        paidDate: paidAmount > 0 ? paidDate : '',
        status,
      });

      showToast('Fee payment recorded successfully.');
      loadStudentFees(selectedStudent._id);
      fetchData(pagination.page); // Refresh main view & stats
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment.', 'error');
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
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Fee Management</h1>
            <p className="text-sm text-slate-500">Track student payment status, record transactions, and analyze collections</p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-2xl">💰</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Expected Collection</p>
              <p className="text-2xl font-bold text-white mt-1">₹{stats.totalExpected.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-2xl">📈</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">₹{stats.totalCollected.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-2xl">📉</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-400 mt-1">₹{stats.totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-2xl">📊</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Collection Rate</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.paymentRate}%</p>
            </div>
          </div>

          {/* Filters Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <input
                type="text"
                placeholder="Search student name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 min-w-[240px]"
              />

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">All Classes</option>
                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>

              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">All Semesters</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Student Directory & Fee Status</h3>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Loading students directory...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-20 text-center border-b border-slate-800">
                <div className="text-4xl mb-3">🎒</div>
                <p className="text-slate-400 text-sm font-semibold">No students found</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Roll No</th>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Division</th>
                      <th className="px-6 py-4">Fee Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{student.rollNo}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{student.class}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{student.division}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize ${feeStatusStyles[student.feeStatus] || feeStatusStyles.unpaid}`}>
                            {student.feeStatus || 'unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenModal(student)}
                            className="px-3.5 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 text-xs font-semibold rounded-xl transition-all"
                          >
                            Update Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} students total)
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchData(pagination.page - 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchData(pagination.page + 1)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
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

      {/* Payment Update Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Record Fee Payment</h3>
                <p className="text-xs text-slate-500">
                  {selectedStudent.name} (Roll: {selectedStudent.rollNo}, Class: {selectedStudent.class}-{selectedStudent.division})
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors text-xl font-bold">
                ✕
              </button>
            </div>

            {/* Content grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Post Transaction</h4>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                    >
                      {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Paid Amount (₹)</label>
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Date</label>
                      <input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-violet-500/20"
                  >
                    {submitting ? 'Recording transaction...' : 'Save Fee Record'}
                  </button>
                </form>
              </div>

              {/* Records History Section */}
              <div className="border-l border-slate-800 pl-8">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Payment Ledger</h4>

                {recordsLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-xs">Loading ledger...</p>
                  </div>
                ) : studentRecords.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-500 text-xs">No payment records found for this student.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {studentRecords.map((rec) => (
                      <div
                        key={rec._id}
                        onClick={() => handleSelectRecord(rec)}
                        className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{rec.semester}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Paid: ₹{rec.paidAmount} / ₹{rec.amount}
                          </p>
                          {rec.paidDate && (
                            <p className="text-[10px] text-slate-500 mt-0.5">Paid on: {rec.paidDate}</p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${recordStatusStyles[rec.status] || recordStatusStyles.pending}`}>
                          {rec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalFees;
