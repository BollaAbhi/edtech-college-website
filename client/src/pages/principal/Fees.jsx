import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const FEE_TYPES = [
  { value: 'yearly', label: 'Annual Fees (Yearly)' },
  { value: 'term1', label: 'Term 1 (Jun–Sep)' },
  { value: 'term2', label: 'Term 2 (Oct–Jan)' },
  { value: 'term3', label: 'Term 3 (Feb–May)' },
];

const statusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PIE_COLORS = ['#34d399', '#fbbf24', '#f87171'];

const PieTooltipContent = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-medium text-white">{payload[0].name}</p>
        <p className="text-xs text-slate-400">Count: <span className="text-white font-bold">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

const PrincipalFees = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ totalExpected: 0, totalCollected: 0, totalOutstanding: 0, paymentRate: '0.0', termBreakdown: {}, statusCounts: {} });
  const [pendingList, setPendingList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [studentRecords, setStudentRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Form
  const [feeType, setFeeType] = useState('yearly');
  const [amount, setAmount] = useState('25000');
  const [paidAmount, setPaidAmount] = useState('0');
  const [status, setStatus] = useState('pending');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('overview');

  const now = new Date();
  const currentYear = now.getMonth() >= 5 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
  const yearOptions = [currentYear, `${now.getFullYear() - 1}-${now.getFullYear()}`];

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // Fetch students
      const studentParams = new URLSearchParams({ page, limit: 10, search: search.trim(), classFilter });
      const studentsRes = await api.get(`/students?${studentParams}`);
      let filteredStudents = studentsRes.data.students;
      if (statusFilter) {
        filteredStudents = filteredStudents.filter(s => s.feeStatus === statusFilter);
      }
      setStudents(filteredStudents);
      setPagination(studentsRes.data.pagination);

      // Fetch fee stats
      const feesParams = new URLSearchParams();
      if (classFilter) feesParams.append('class', classFilter);
      if (feeTypeFilter) feesParams.append('feeType', feeTypeFilter);
      if (yearFilter) feesParams.append('academicYear', yearFilter);
      feesParams.append('limit', '999');
      const feesRes = await api.get(`/fees?${feesParams}`);
      setStats(feesRes.data.stats);
      setPendingList(feesRes.data.pendingList || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter, feeTypeFilter, yearFilter]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const loadStudentFees = async (studentId) => {
    setRecordsLoading(true);
    try {
      const res = await api.get(`/fees?studentId=${studentId}&limit=50`);
      setStudentRecords(res.data.records);
    } catch {
      showToast('Failed to load student payment records.', 'error');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleOpenModal = (student) => {
    setSelectedStudent(student);
    setFeeType('yearly');
    setAmount('25000');
    setPaidAmount('0');
    setStatus('pending');
    setPaidDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    loadStudentFees(student._id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setStudentRecords([]);
  };

  const handleSelectRecord = (rec) => {
    setFeeType(rec.feeType);
    setAmount(rec.amount.toString());
    setPaidAmount(rec.paidAmount.toString());
    setStatus(rec.status);
    setPaidDate(rec.paidDate || new Date().toISOString().split('T')[0]);
    setRemarks(rec.remarks || '');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return showToast('Enter a valid fee amount.', 'error');

    setSubmitting(true);
    try {
      await api.post('/fees', {
        studentId: selectedStudent._id,
        feeType,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        paidDate: paidAmount > 0 ? paidDate : '',
        status,
        remarks,
      });
      showToast('Fee record saved successfully.');
      loadStudentFees(selectedStudent._id);
      fetchData(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Pie chart data
  const pieData = [
    { name: 'Paid', value: stats.statusCounts?.paid || 0 },
    { name: 'Partial', value: stats.statusCounts?.partial || 0 },
    { name: 'Pending', value: stats.statusCounts?.pending || 0 },
  ].filter(d => d.value > 0);

  const feeTypeLabel = (ft) => FEE_TYPES.find(f => f.value === ft)?.label || ft;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Fee Management</h1>
            <p className="text-sm text-slate-500">Indian junior college fee structure — Track collections, pending dues & term-wise analysis</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20">
              <span className="text-2xl">💰</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Total Expected</p>
              <p className="text-2xl font-bold text-white mt-1">₹{stats.totalExpected.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
              <span className="text-2xl">📈</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">₹{stats.totalCollected.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20">
              <span className="text-2xl">📉</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Outstanding</p>
              <p className="text-2xl font-bold text-red-400 mt-1">₹{stats.totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
              <span className="text-2xl">📊</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">Collection Rate</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.paymentRate}%</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
            {[
              { id: 'overview', label: 'Overview & Charts' },
              { id: 'students', label: 'Student Directory' },
              { id: 'pending', label: 'Pending Dues' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-center">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500">
              <option value="">All Classes</option>
              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={feeTypeFilter} onChange={(e) => setFeeTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500">
              <option value="">All Fee Types</option>
              {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500">
              <option value="">All Years</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {activeTab === 'students' && (
              <>
                <input type="text" placeholder="Search student name..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 min-w-[240px]" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500">
                  <option value="">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </>
            )}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Term-wise Breakdown */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Term-wise Collection Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(stats.termBreakdown || {}).map(([key, term]) => {
                    const pct = term.expected > 0 ? (term.collected / term.expected) * 100 : 0;
                    return (
                      <div key={key} className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{term.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{term.count} records · {term.paidCount} paid · {term.pendingCount} pending</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-400">₹{term.collected.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">of ₹{term.expected.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }}></div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 text-right">{pct.toFixed(1)}% collected</p>
                      </div>
                    );
                  })}
                  {Object.keys(stats.termBreakdown || {}).length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-sm">No fee data available. Add fee records to see breakdown.</div>
                  )}
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Paid vs Pending</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 mt-4">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }}></span>
                          <span className="text-xs text-slate-400 flex-1">{d.name}</span>
                          <span className="text-xs font-bold text-white">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No data to display</div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STUDENTS TAB ═══ */}
          {activeTab === 'students' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Student Directory & Fee Status</h3>
              </div>
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="text-4xl mb-3">🎒</div>
                  <p className="text-slate-400 text-sm font-semibold">No students found</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Roll No</th>
                        <th className="px-6 py-4">Class</th>
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
                          <td className="px-6 py-4 text-sm text-slate-300">{student.class}-{student.division}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize ${statusStyles[student.feeStatus] || statusStyles.pending}`}>
                              {student.feeStatus || 'unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleOpenModal(student)}
                              className="px-3.5 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 text-xs font-semibold rounded-xl transition-all">
                              Record Payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-slate-800">
                      <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
                      <div className="flex gap-2">
                        <button disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors">Previous</button>
                        <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors">Next</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ PENDING TAB ═══ */}
          {activeTab === 'pending' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Pending & Partial Dues</h3>
                <p className="text-xs text-slate-500 mt-0.5">Students with outstanding fee balance</p>
              </div>
              {pendingList.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-slate-400 text-sm font-semibold">No pending dues found</p>
                  <p className="text-slate-600 text-xs mt-1">All recorded fees are up to date</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Fee Type</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Paid</th>
                      <th className="px-6 py-4">Outstanding</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map((rec) => (
                      <tr key={rec._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{rec.studentId?.name || '—'}</p>
                          <p className="text-xs text-slate-500">Roll: {rec.studentId?.rollNo || '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{rec.studentId?.class}-{rec.studentId?.division}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{feeTypeLabel(rec.feeType)}</td>
                        <td className="px-6 py-4 text-sm text-white font-mono">₹{rec.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-emerald-400 font-mono">₹{rec.paidAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-red-400 font-bold font-mono">₹{(rec.amount - rec.paidAmount).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize ${statusStyles[rec.status]}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Record Fee Payment</h3>
                <p className="text-xs text-slate-500">
                  {selectedStudent.name} · Roll: {selectedStudent.rollNo} · Class: {selectedStudent.class}-{selectedStudent.division}
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors text-xl font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">New Transaction</h4>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fee Type</label>
                    <select value={feeType} onChange={(e) => setFeeType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                      {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Amount (₹)</label>
                      <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Paid Amount (₹)</label>
                      <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Status</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Date</label>
                      <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks (optional)</label>
                    <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Cheque No. 12345"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20">
                    {submitting ? 'Saving...' : 'Save Fee Record'}
                  </button>
                </form>
              </div>

              {/* Existing Records */}
              <div className="border-l border-slate-800 pl-8">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Payment History</h4>
                {recordsLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-xs">Loading...</p>
                  </div>
                ) : studentRecords.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-500 text-xs">No payment records found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {studentRecords.map((rec) => (
                      <div key={rec._id} onClick={() => handleSelectRecord(rec)}
                        className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-white">{feeTypeLabel(rec.feeType)}</p>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg tracking-wider ${statusStyles[rec.status] || statusStyles.pending}`}>
                            {rec.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Paid: ₹{rec.paidAmount.toLocaleString()} / ₹{rec.amount.toLocaleString()}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-600">{rec.academicYear}</span>
                          {rec.paidDate && <span className="text-[10px] text-slate-500">Paid: {rec.paidDate}</span>}
                        </div>
                        {rec.remarks && <p className="text-[10px] text-slate-600 mt-1 italic">{rec.remarks}</p>}
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
