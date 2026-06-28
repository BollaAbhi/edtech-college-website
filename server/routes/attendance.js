const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/attendance ─────────────────────────────────────────────────────
// Mark / Edit bulk attendance
router.post('/', verifyToken, checkRole(['staff', 'principal']), async (req, res) => {
  try {
    const { subject, class: cls, date, records } = req.body;
    // records: [{ studentId, status }]

    if (!subject || !cls || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'subject, class, date and records are required.' });
    }

    let staffId = null;
    let staffDoc = null;

    if (req.user.role === 'staff') {
      staffDoc = await Staff.findOne({ userId: req.user.id });
      if (!staffDoc) {
        return res.status(403).json({ message: 'Staff profile not found.' });
      }
      staffId = staffDoc._id;

      // Enforce same-day check for staff
      const todayStr = new Date().toISOString().split('T')[0];
      if (date !== todayStr) {
        return res.status(403).json({ message: 'Staff can only mark or edit attendance for today.' });
      }
    }

    // Fetch existing records for these student IDs, subject, and date
    const studentIds = records.map(r => r.studentId);
    const existingRecords = await Attendance.find({
      studentId: { $in: studentIds },
      subject,
      date
    });

    // If staff, verify they own all existing records
    if (req.user.role === 'staff') {
      for (const rec of existingRecords) {
        if (!rec.staffId || rec.staffId.toString() !== staffId.toString()) {
          return res.status(403).json({ message: 'Cannot edit attendance marked by another staff member or principal.' });
        }
      }
    }

    const existingMap = {};
    existingRecords.forEach(r => {
      existingMap[r.studentId.toString()] = true;
    });

    const userName = req.user.name || (await User.findById(req.user.id))?.name || 'Unknown';

    // Upsert each student's record
    const ops = records.map(({ studentId, status }) => {
      const updateData = {
        studentId,
        subject,
        class: cls,
        date,
        status
      };
      
      if (staffId) {
        updateData.staffId = staffId;
      }

      // If the record already exists, it is an edit/update
      if (existingMap[studentId.toString()]) {
        updateData.lastEditedById = req.user.id;
        updateData.lastEditedByName = userName;
        updateData.lastEditedAt = new Date();
      }

      return {
        updateOne: {
          filter: { studentId, subject, date },
          update: { $set: updateData },
          upsert: true,
        },
      };
    });

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
// Staff/Principal gets the list of students for a class to mark attendance
router.get('/classes', verifyToken, checkRole(['staff', 'principal']), async (req, res) => {
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

// ─── PUT /api/attendance/:id ──────────────────────────────────────────────────
// Edit a single attendance record
router.put('/:id', verifyToken, checkRole(['principal', 'staff']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    if (req.user.role === 'staff') {
      const staffDoc = await Staff.findOne({ userId: req.user.id });
      if (!staffDoc) {
        return res.status(403).json({ message: 'Staff profile not found.' });
      }

      // Check own-attendance constraint
      if (!record.staffId || record.staffId.toString() !== staffDoc._id.toString()) {
        return res.status(403).json({ message: 'Cannot edit attendance marked by another staff member.' });
      }

      // Check same-day constraint
      const todayStr = new Date().toISOString().split('T')[0];
      if (record.date !== todayStr) {
        return res.status(403).json({ message: 'Staff can only edit attendance for today.' });
      }
    }

    // Update status and lastEdited metadata
    record.status = status;
    record.lastEditedById = req.user.id;
    
    const userDoc = await User.findById(req.user.id);
    record.lastEditedByName = userDoc?.name || 'Unknown';
    record.lastEditedAt = new Date();

    await record.save();
    res.json({ message: 'Attendance record updated successfully.', record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update attendance record.' });
  }
});

// ─── DELETE /api/attendance/:id ───────────────────────────────────────────────
// Delete a wrong attendance entry (principal only)
router.delete('/:id', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete attendance record.' });
  }
});

module.exports = router;
