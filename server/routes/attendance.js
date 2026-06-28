const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/attendance ─────────────────────────────────────────────────────
// Staff marks attendance for a class+subject on a given date
router.post('/', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const { subject, class: cls, date, records } = req.body;
    // records: [{ studentId, status }]

    if (!subject || !cls || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'subject, class, date and records are required.' });
    }

    // Find the Staff doc linked to the logged-in user
    const staffDoc = await Staff.findOne({ userId: req.user.id });
    const staffId = staffDoc?._id || null;

    // Upsert each student's record (prevent duplicates)
    const ops = records.map(({ studentId, status }) => ({
      updateOne: {
        filter: { studentId, subject, date },
        update: { $set: { studentId, staffId, subject, class: cls, date, status } },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);

    res.json({ message: `Attendance saved for ${records.length} student(s).` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save attendance.' });
  }
});

// ─── GET /api/attendance/my ───────────────────────────────────────────────────
// Student views their own attendance (grouped by subject)
router.get('/my', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    // Find the Student doc linked to this user
    const studentDoc = await Student.findOne({ userId: req.user.id });
    if (!studentDoc) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const records = await Attendance.find({ studentId: studentDoc._id }).sort({ date: -1 });

    // Group by subject
    const subjectMap = {};
    for (const r of records) {
      if (!subjectMap[r.subject]) {
        subjectMap[r.subject] = { subject: r.subject, total: 0, present: 0, absent: 0, late: 0, records: [] };
      }
      subjectMap[r.subject].total++;
      subjectMap[r.subject][r.status]++;
      subjectMap[r.subject].records.push({ date: r.date, status: r.status });
    }

    const subjects = Object.values(subjectMap).map((s) => ({
      ...s,
      percentage: s.total > 0 ? parseFloat(((s.present + s.late) / s.total * 100).toFixed(1)) : 0,
    }));

    const overallTotal = records.length;
    const overallPresent = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const overallPercentage = overallTotal > 0 ? parseFloat((overallPresent / overallTotal * 100).toFixed(1)) : "Not yet recorded";

    res.json({ subjects, overallPercentage, totalClasses: overallTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch attendance.' });
  }
});

// ─── GET /api/attendance/report ───────────────────────────────────────────────
// Principal views full attendance report with optional filters
router.get('/report', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { class: cls, date, subject, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (cls) query.class = cls;
    if (date) query.date = date;
    if (subject) query.subject = { $regex: subject, $options: 'i' };

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .sort({ date: -1, class: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('studentId', 'name rollNo class division')
      .populate('staffId', 'name');

    // Summary stats
    const allRecords = await Attendance.find(query);
    const totalPresent = allRecords.filter((r) => r.status === 'present').length;
    const totalAbsent = allRecords.filter((r) => r.status === 'absent').length;
    const totalLate = allRecords.filter((r) => r.status === 'late').length;

    res.json({
      records,
      summary: { total: allRecords.length, totalPresent, totalAbsent, totalLate },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch report.' });
  }
});

// ─── GET /api/attendance/classes ─────────────────────────────────────────────
// Staff gets the list of students for a class to mark attendance
router.get('/classes', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const { class: cls, subject, date } = req.query;
    if (!cls) return res.status(400).json({ message: 'class is required.' });

    const [classDiv] = cls.split('-');
    const students = await Student.find({ class: classDiv }).sort({ rollNo: 1 });

    // Fetch already-submitted attendance for this class/subject/date
    let existing = [];
    if (subject && date) {
      const studentIds = students.map((s) => s._id);
      existing = await Attendance.find({ studentId: { $in: studentIds }, subject, date });
    }

    const existingMap = {};
    existing.forEach((r) => { existingMap[r.studentId.toString()] = r.status; });

    const enriched = students.map((s) => ({
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      class: s.class,
      division: s.division,
      status: existingMap[s._id.toString()] || 'present',
    }));

    res.json({ students: enriched, alreadySubmitted: existing.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch class students.' });
  }
});

module.exports = router;
