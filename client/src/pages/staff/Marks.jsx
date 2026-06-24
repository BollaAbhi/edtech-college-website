import { useState } from 'react';
import Sidebar from '../../components/staff/Sidebar';
import Navbar from '../../components/staff/Navbar';
import { showToast } from '../../components/Toast';
import api from '../../utils/api';

const SUBJECT_OPTIONS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'Hindi','Computer Science','History','Geography','Economics',
  'Accountancy','Business Studies','Political Science','Physical Education',
];
const CLASS_OPTIONS = ['8-A','8-B','9-A','9-B','10-A','10-B','11-A','11-B','11-C','12-A','12-B','12-C'];
const EXAM_TYPES = [
  { value: 'unit', label: 'Unit Test' },
  { value: 'midterm', label: 'Mid-Term' },
  { value: 'final', label: 'Final Exam' },
];

const StaffMarks = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);

  const loadStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedExam) {
      showToast('Please select class, subject and exam type.', 'error');
      return;
    }
    setLoading(true);
    setFetched(false);
    try {
      const res = await api.get(`/marks/students?class=${selectedClass}&subject=${encodeURIComponent(selectedSubject)}&examType=${selectedExam}`);
      const list = res.data.students.map((s) => ({
        ...s,
        marksObtained: s.marksObtained !== '' ? s.marksObtained : '',
      }));
      setStudents(list);
      setAlreadySubmitted(res.data.alreadySubmitted);
      if (res.data.alreadySubmitted && res.data.students.length > 0 && res.data.students[0].totalMarks) {
        setTotalMarks(String(res.data.students[0].totalMarks));
      }
      setFetched(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateMarks = (id, val) => {
    const num = val === '' ? '' : Math.max(0, Math.min(Number(totalMarks), Number(val)));
    setStudents((prev) => prev.map((s) => s._id === id ? { ...s, marksObtained: num === '' ? '' : num } : s));
  };

  const handleSubmit = async () => {
    const incomplete = students.filter((s) => s.marksObtained === '' || s.marksObtained === undefined);
    if (incomplete.length > 0) {
      showToast(`${incomplete.length} student(s) have empty marks.`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const records = students.map(({ _id, marksObtained }) => ({ studentId: _id, marksObtained }));
      const res = await api.post('/marks', {
        subject: selectedSubject,
        class: selectedClass,
        examType: selectedExam,
        totalMarks: Number(totalMarks),
        date: selectedDate,
        records,
      });
      showToast(res.data.message);
      setAlreadySubmitted(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (obtained) => {
    if (obtained === '' || totalMarks === '') return '';
    const pct = (Number(obtained) / Number(totalMarks)) * 100;
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 60) return 'text-cyan-400';
    if (pct >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Enter Marks</h1>
            <p className="text-sm text-slate-500">Select class, subject and exam type to enter student marks</p>
          </div>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</label>
                <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setFetched(false); }}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                  <option value="">Select</option>
                  {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setFetched(false); }}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                  <option value="">Select</option>
                  {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Exam Type</label>
                <select value={selectedExam} onChange={(e) => { setSelectedExam(e.target.value); setFetched(false); }}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all">
                  <option value="">Select</option>
                  {EXAM_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Marks</label>
                <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} min="1"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
              </div>
              <div className="flex items-end">
                <button onClick={loadStudents} disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Load
                </button>
              </div>
            </div>
          </div>

          {/* Students marks table */}
          {fetched && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">{students.length} Students</span>
                  <span className="text-xs text-slate-500">
                    {EXAM_TYPES.find((e) => e.value === selectedExam)?.label} · {selectedSubject} · Out of {totalMarks}
                  </span>
                  {alreadySubmitted && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                      Already entered — editing
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">#</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Marks Obtained</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const pct = s.marksObtained !== '' && totalMarks ? ((Number(s.marksObtained) / Number(totalMarks)) * 100).toFixed(1) : '—';
                      return (
                        <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-3.5 text-sm text-slate-500">{i + 1}</td>
                          <td className="px-6 py-3.5 text-sm text-slate-400 font-mono">{s.rollNo}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                                {s.name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-white">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex justify-center">
                              <input
                                type="number" min="0" max={totalMarks}
                                value={s.marksObtained}
                                onChange={(e) => updateMarks(s._id, e.target.value)}
                                placeholder="—"
                                className={`w-24 text-center px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${getScoreColor(s.marksObtained)}`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`text-sm font-bold ${pct !== '—' ? getScoreColor(s.marksObtained) : 'text-slate-600'}`}>
                              {pct !== '—' ? `${pct}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end">
                <button onClick={handleSubmit} disabled={submitting || students.length === 0}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {alreadySubmitted ? 'Update Marks' : 'Submit Marks'}
                </button>
              </div>
            </div>
          )}

          {!fetched && !loading && (
            <div className="flex items-center justify-center h-64 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-slate-400 font-medium">Select class, subject and exam type above</p>
                <p className="text-slate-600 text-sm mt-1">Then click "Load" to begin entering marks</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StaffMarks;
