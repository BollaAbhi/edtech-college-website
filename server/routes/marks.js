const express = require('express');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/marks ──────────────────────────────────────────────────────────
// Staff enters marks for a class + subject + exam type
router.post('/', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const { subject, class: cls, examType, totalMarks, date, records } = req.body;
    // records: [{ studentId, marksObtained }]

    if (!subject || !cls || !examType || !totalMarks || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'subject, class, examType, totalMarks, date and records are required.' });
    }

    const staffDoc = await Staff.findOne({ userId: req.user.id });
    const staffId = staffDoc?._id || null;

    // Upsert each student's marks
    const ops = records.map(({ studentId, marksObtained }) => ({
      updateOne: {
        filter: { studentId, subject, examType },
        update: {
          $set: {
            studentId, staffId, subject, class: cls, examType,
            marksObtained: Number(marksObtained),
            totalMarks: Number(totalMarks),
            date,
          },
        },
        upsert: true,
      },
    }));

    await Marks.bulkWrite(ops);

    res.json({ message: `Marks saved for ${records.length} student(s).` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save marks.' });
  }
});

// ─── GET /api/marks/students ──────────────────────────────────────────────────
// Staff loads student list for a class with existing marks pre-filled
router.get('/students', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const { class: cls, subject, examType } = req.query;
    if (!cls) return res.status(400).json({ message: 'class is required.' });

    const [classNum] = cls.split('-');
    const students = await Student.find({ class: classNum }).sort({ rollNo: 1 });

    let existing = [];
    if (subject && examType) {
      const studentIds = students.map((s) => s._id);
      existing = await Marks.find({ studentId: { $in: studentIds }, subject, examType });
    }

    const existingMap = {};
    existing.forEach((r) => {
      existingMap[r.studentId.toString()] = { marksObtained: r.marksObtained, totalMarks: r.totalMarks };
    });

    const enriched = students.map((s) => ({
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      class: s.class,
      division: s.division,
      marksObtained: existingMap[s._id.toString()]?.marksObtained ?? '',
      totalMarks: existingMap[s._id.toString()]?.totalMarks ?? '',
    }));

    res.json({ students: enriched, alreadySubmitted: existing.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch students.' });
  }
});

// ─── GET /api/marks/my ────────────────────────────────────────────────────────
// Student sees own marksheet grouped by subject + exam type
router.get('/my', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    const studentDoc = await Student.findOne({ userId: req.user.id });
    if (!studentDoc) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const records = await Marks.find({ studentId: studentDoc._id })
      .sort({ subject: 1, examType: 1 })
      .populate('staffId', 'name');

    // Group by subject
    const subjectMap = {};
    for (const r of records) {
      if (!subjectMap[r.subject]) {
        subjectMap[r.subject] = { subject: r.subject, exams: [], totalObtained: 0, totalMax: 0 };
      }
      subjectMap[r.subject].exams.push({
        examType: r.examType,
        marksObtained: r.marksObtained,
        totalMarks: r.totalMarks,
        percentage: parseFloat(((r.marksObtained / r.totalMarks) * 100).toFixed(1)),
        date: r.date,
        staffName: r.staffId?.name || '—',
      });
      subjectMap[r.subject].totalObtained += r.marksObtained;
      subjectMap[r.subject].totalMax += r.totalMarks;
    }

    const subjects = Object.values(subjectMap).map((s) => ({
      ...s,
      overallPercentage: s.totalMax > 0 ? parseFloat(((s.totalObtained / s.totalMax) * 100).toFixed(1)) : 0,
      grade: getGrade(s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0),
    }));

    // Overall
    const totalObtained = subjects.reduce((a, s) => a + s.totalObtained, 0);
    const totalMax = subjects.reduce((a, s) => a + s.totalMax, 0);
    const overallPercentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(1)) : 0;

    res.json({ subjects, overallPercentage, totalObtained, totalMax, grade: getGrade(overallPercentage) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch marks.' });
  }
});

// ─── GET /api/marks/report ────────────────────────────────────────────────────
// Principal sees all marks with filters
router.get('/report', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { class: cls, subject, examType, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (cls) query.class = cls;
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (examType) query.examType = examType;

    const total = await Marks.countDocuments(query);
    const records = await Marks.find(query)
      .sort({ class: 1, subject: 1, marksObtained: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('studentId', 'name rollNo class division')
      .populate('staffId', 'name');

    // Compute class toppers per subject+examType for highlighting
    const topperQuery = { ...query };
    const allForToppers = await Marks.find(topperQuery).populate('studentId', 'name rollNo');
    const topperMap = {};
    for (const r of allForToppers) {
      const key = `${r.class}_${r.subject}_${r.examType}`;
      if (!topperMap[key] || r.marksObtained > topperMap[key].marks) {
        topperMap[key] = { marks: r.marksObtained, studentId: r.studentId?._id?.toString() };
      }
    }

    // Summary stats
    const allRecords = await Marks.find(query);
    const avgPercentage = allRecords.length > 0
      ? parseFloat((allRecords.reduce((a, r) => a + (r.marksObtained / r.totalMarks) * 100, 0) / allRecords.length).toFixed(1))
      : 0;
    const passCount = allRecords.filter((r) => (r.marksObtained / r.totalMarks) * 100 >= 40).length;
    const failCount = allRecords.length - passCount;

    res.json({
      records,
      topperMap,
      summary: { total: allRecords.length, avgPercentage, passCount, failCount },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch report.' });
  }
});

function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

module.exports = router;
