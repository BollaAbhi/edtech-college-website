import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/principal/Sidebar';
import Navbar from '../../components/principal/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'Hindi','Computer Science','History','Geography','Economics',
  'Accountancy','Business Studies','Political Science','Physical Education',
];
const EXAM_TYPES = [
  { value: '', label: 'All Exams' },
  { value: 'unit', label: 'Unit Test' },
  { value: 'midterm', label: 'Mid-Term' },
  { value: 'final', label: 'Final Exam' },
];

const examLabel = { unit: 'Unit Test', midterm: 'Mid-Term', final: 'Final Exam' };

const getGradeColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (pct >= 60) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (pct >= 40) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
};

const getGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const PrincipalMarks = () => {
  const [records, setRecords] = useState([]);
  const [topperMap, setTopperMap] = useState({});
  const [summary, setSummary] = useState({ total: 0, avgPercentage: 0, passCount: 0, failCount: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({ class: '', subject: '', examType: '' });
  const [applied, setApplied] = useState({ class: '', subject: '', examType: '' });

  const fetchReport = useCallback(async (page = 1, f = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (f.class) params.append('class', f.class);
      if (f.subject) params.append('subject', f.subject);
      if (f.examType) params.append('examType', f.examType);

      const res = await api.get(`/marks/report?${params}`);
      setRecords(res.data.records);
      setTopperMap(res.data.topperMap || {});
      setSummary(res.data.summary);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { fetchReport(1, applied); }, []);

  const applyFilters = () => {
    setApplied({ ...filters });
    fetchReport(1, filters);
  };

  const clearFilters = () => {
    const empty = { class: '', subject: '', examType: '' };
    setFilters(empty);
    setApplied(empty);
    fetchReport(1, empty);
  };

  // Export to PDF (print-based)
  const exportPDF = () => {
    const printContent = document.getElementById('marks-report-table');
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Marks Report</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        p { color: #64748b; font-size: 13px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; padding: 10px 14px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 14px; border-bottom: 1px solid #e2e8f0; }
        .topper { background: #fefce8; }
        .pass { color: #16a34a; font-weight: 600; }
        .fail { color: #dc2626; font-weight: 600; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <h1>Marks Report</h1>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
      <table>
        <thead><tr>
          <th>Student</th><th>Roll No</th><th>Class</th><th>Subject</th><th>Exam</th><th>Marks</th><th>%</th><th>Grade</th>
        </tr></thead><tbody>
    `);
    records.forEach((r) => {
      const pct = ((r.marksObtained / r.totalMarks) * 100).toFixed(1);
      const key = `${r.class}_${r.subject}_${r.examType}`;
      const isTopper = topperMap[key]?.studentId === r.studentId?._id?.toString();
      win.document.write(`
        <tr class="${isTopper ? 'topper' : ''}">
          <td>${r.studentId?.name || '—'}</td>
          <td>${r.studentId?.rollNo || '—'}</td>
          <td>${r.class}</td>
          <td>${r.subject}</td>
          <td>${examLabel[r.examType] || r.examType}</td>
          <td>${r.marksObtained}/${r.totalMarks}</td>
          <td class="${pct >= 40 ? 'pass' : 'fail'}">${pct}%</td>
          <td>${getGrade(Number(pct))}</td>
        </tr>
      `);
    });
    win.document.write('</tbody></table></body></html>');
    win.document.close();
    win.print();
  };

  const hasFilters = applied.class || applied.subject || applied.examType;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Marks Report</h1>
              <p className="text-sm text-slate-500">Complete results with class toppers</p>
            </div>
            <button onClick={exportPDF}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Entries', value: summary.total, icon: '📊', color: 'violet' },
              { label: 'Avg Percentage', value: `${summary.avgPercentage}%`, icon: '📈', color: 'cyan' },
              { label: 'Passed', value: summary.passCount, icon: '✓', color: 'emerald' },
              { label: 'Failed', value: summary.failCount, icon: '✗', color: 'red' },
            ].map((c) => (
              <div key={c.label} className={`p-5 rounded-2xl border bg-gradient-to-br
                ${c.color === 'violet' ? 'from-violet-500/15 to-violet-600/5 border-violet-500/20' : ''}
                ${c.color === 'cyan' ? 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20' : ''}
                ${c.color === 'emerald' ? 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20' : ''}
                ${c.color === 'red' ? 'from-red-500/15 to-red-600/5 border-red-500/20' : ''}
              `}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{c.label}</p>
                    <p className="text-2xl font-bold text-white">{c.value}</p>
                  </div>
                  <span className="text-xl">{c.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all">
                  <option value="">All classes</option>
                  {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                <select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all">
                  <option value="">All subjects</option>
                  {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Exam Type</label>
                <select value={filters.examType} onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all">
                  {EXAM_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={applyFilters}
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">Apply</button>
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="py-2.5 px-3 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">✕</button>
                )}
              </div>
            </div>
            {hasFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-slate-500">Filters:</span>
                {applied.class && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Class: {applied.class}</span>}
                {applied.subject && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Subject: {applied.subject}</span>}
                {applied.examType && <span className="px-2.5 py-1 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg">Exam: {examLabel[applied.examType]}</span>}
              </div>
            )}
          </div>

          {/* Table */}
          <div id="marks-report-table" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Student','Roll No','Class','Subject','Exam','Marks','%','Grade'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading report...</p>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm text-slate-400 font-medium">No marks records found</p>
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const pct = ((r.marksObtained / r.totalMarks) * 100).toFixed(1);
                      const grade = getGrade(Number(pct));
                      const key = `${r.class}_${r.subject}_${r.examType}`;
                      const isTopper = topperMap[key]?.studentId === r.studentId?._id;

                      return (
                        <tr key={r._id} className={`border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors ${isTopper ? 'bg-amber-500/[0.04]' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-violet-600/20 flex items-center justify-center text-[11px] font-bold text-violet-400">
                                {r.studentId?.name?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm text-white font-medium">{r.studentId?.name || '—'}</span>
                              {isTopper && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                  🏆 TOPPER
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{r.studentId?.rollNo || '—'}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-300">{r.class}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-300">{r.subject}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-300">{examLabel[r.examType] || r.examType}</td>
                          <td className="px-5 py-3.5 text-sm font-mono text-white">{r.marksObtained}<span className="text-slate-500">/{r.totalMarks}</span></td>
                          <td className="px-5 py-3.5">
                            <span className={`text-sm font-bold ${Number(pct) >= 40 ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg border ${getGradeColor(Number(pct))}`}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {((pagination.page - 1) * 15) + 1}–{Math.min(pagination.page * 15, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button disabled={pagination.page <= 1} onClick={() => fetchReport(pagination.page - 1)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => fetchReport(p)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === pagination.page ? 'bg-violet-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800'}`}>{p}</button>
                  ))}
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchReport(pagination.page + 1)}
                    className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalMarks;
