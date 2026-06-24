const express = require('express');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── POST /api/timetable ─────────────────────────────────────────────────────
// Principal creates or updates timetable for a class
router.post('/', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { class: cls, timetable } = req.body;
    // timetable: { Monday: [{time, subject, staffName, staffId}], Tuesday: [...], ... }

    if (!cls || !timetable) {
      return res.status(400).json({ message: 'class and timetable data are required.' });
    }

    const ops = [];
    for (const day of DAYS) {
      if (timetable[day]) {
        ops.push({
          updateOne: {
            filter: { class: cls, day },
            update: { $set: { class: cls, day, periods: timetable[day] } },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) {
      await Timetable.bulkWrite(ops);
    }

    res.json({ message: `Timetable saved for class ${cls}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save timetable.' });
  }
});

// ─── GET /api/timetable/class/:classId ────────────────────────────────────────
// Returns full weekly timetable for a class (principal or any authenticated user)
router.get('/class/:classId', verifyToken, async (req, res) => {
  try {
    const cls = req.params.classId;
    const docs = await Timetable.find({ class: cls }).sort({ day: 1 });

    // Build map keyed by day
    const weekMap = {};
    DAYS.forEach((d) => { weekMap[d] = []; });
    docs.forEach((doc) => { weekMap[doc.day] = doc.periods; });

    res.json({ class: cls, timetable: weekMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch timetable.' });
  }
});

// ─── GET /api/timetable/staff/my ──────────────────────────────────────────────
// Staff sees only their own periods across all classes
router.get('/staff/my', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const staffDoc = await Staff.findOne({ userId: req.user.id });
    if (!staffDoc) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }

    // Find all timetable entries containing this staff member
    const allDocs = await Timetable.find({
      'periods.staffId': staffDoc._id,
    });

    // Filter periods to only those belonging to this staff
    const weekMap = {};
    DAYS.forEach((d) => { weekMap[d] = []; });

    for (const doc of allDocs) {
      const myPeriods = doc.periods
        .filter((p) => p.staffId && p.staffId.toString() === staffDoc._id.toString())
        .map((p) => ({
          time: p.time,
          subject: p.subject,
          class: doc.class,
        }));
      weekMap[doc.day].push(...myPeriods);
    }

    // Sort each day's periods by time
    for (const day of DAYS) {
      weekMap[day].sort((a, b) => a.time.localeCompare(b.time));
    }

    res.json({ staffName: staffDoc.name, timetable: weekMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch staff timetable.' });
  }
});

// ─── GET /api/timetable/student/my ────────────────────────────────────────────
// Student sees their class timetable
router.get('/student/my', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    const studentDoc = await Student.findOne({ userId: req.user.id });
    if (!studentDoc) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const cls = studentDoc.class;
    const docs = await Timetable.find({ class: cls }).sort({ day: 1 });

    const weekMap = {};
    DAYS.forEach((d) => { weekMap[d] = []; });
    docs.forEach((doc) => { weekMap[doc.day] = doc.periods; });

    res.json({ class: cls, studentName: studentDoc.name, timetable: weekMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch student timetable.' });
  }
});

// ─── GET /api/timetable/staff-list ────────────────────────────────────────────
// Principal needs staff list to assign in timetable builder
router.get('/staff-list', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const staffList = await Staff.find({}).select('_id name subjectsAssigned').sort({ name: 1 });
    res.json({ staff: staffList });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff list.' });
  }
});

module.exports = router;
