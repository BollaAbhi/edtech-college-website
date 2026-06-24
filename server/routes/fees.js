const express = require('express');
const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/fees ───────────────────────────────────────────────────────────
// Principal records/updates a student payment (Principal only)
router.post('/', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { studentId, amount, paidAmount, semester, paidDate, status } = req.body;

    if (!studentId || !semester || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'studentId, semester, and total amount are required.' });
    }

    // Upsert fee record
    const feeRecord = await FeeRecord.findOneAndUpdate(
      { studentId, semester },
      {
        studentId,
        amount: Number(amount),
        paidAmount: Number(paidAmount || 0),
        status: status || 'pending',
        paidDate: paidDate || (paidAmount > 0 ? new Date().toISOString().split('T')[0] : ''),
        semester,
      },
      { new: true, upsert: true }
    );

    // Sync student model feeStatus
    // 'paid' -> 'paid', 'partial' -> 'partial', 'pending' -> 'unpaid'
    const studentStatusMap = {
      paid: 'paid',
      partial: 'partial',
      pending: 'unpaid',
    };
    const mappedStatus = studentStatusMap[feeRecord.status] || 'unpaid';
    await Student.findByIdAndUpdate(studentId, { feeStatus: mappedStatus });

    res.status(201).json({ message: 'Fee record saved successfully.', feeRecord });
  } catch (error) {
    console.error('Error saving fee record:', error);
    res.status(500).json({ message: 'Failed to record fee payment.' });
  }
});

// ─── GET /api/fees ────────────────────────────────────────────────────────────
// Principal views all fee records (Principal only)
router.get('/', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { page = 1, limit = 10, class: cls, division, status, semester } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Filter students first if class or division is specified
    let studentFilter = {};
    if (cls) studentFilter.class = cls;
    if (division) studentFilter.division = division;

    let filterActive = Object.keys(studentFilter).length > 0;
    let matchingStudentIds = [];

    if (filterActive) {
      const students = await Student.find(studentFilter).select('_id');
      matchingStudentIds = students.map((s) => s._id);
    }

    let query = {};
    if (filterActive) {
      query.studentId = { $in: matchingStudentIds };
    }
    if (req.query.studentId) {
      query.studentId = req.query.studentId;
    }
    if (status) {
      query.status = status;
    }
    if (semester) {
      query.semester = semester;
    }

    // Get total count & paginated records
    const total = await FeeRecord.countDocuments(query);
    const records = await FeeRecord.find(query)
      .populate('studentId', 'name rollNo class division email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Compute active collection stats for the current filter/overall
    // Wait, let's fetch all records matching the query (without limit) to compute stats
    const allMatching = await FeeRecord.find(query);
    let totalExpected = 0;
    let totalCollected = 0;
    allMatching.forEach((r) => {
      totalExpected += r.amount || 0;
      totalCollected += r.paidAmount || 0;
    });
    const totalOutstanding = totalExpected - totalCollected;
    const paymentRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0.0';

    res.json({
      records,
      stats: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        paymentRate,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching fee records:', error);
    res.status(500).json({ message: 'Failed to fetch fee records.' });
  }
});

// ─── GET /api/fees/my ─────────────────────────────────────────────────────────
// Student gets their own fee records (Student only)
router.get('/my', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const records = await FeeRecord.find({ studentId: student._id }).sort({ createdAt: -1 });

    // Compute stats
    let totalDue = 0;
    let totalPaid = 0;
    records.forEach((r) => {
      totalDue += r.amount || 0;
      totalPaid += r.paidAmount || 0;
    });
    const totalOutstanding = totalDue - totalPaid;

    let overallStatus = 'unpaid';
    if (records.length > 0) {
      const allPaid = records.every((r) => r.status === 'paid');
      const anyPaidOrPartial = records.some((r) => r.status === 'paid' || r.status === 'partial' || r.paidAmount > 0);
      if (allPaid) {
        overallStatus = 'paid';
      } else if (anyPaidOrPartial) {
        overallStatus = 'partial';
      }
    }

    res.json({
      records,
      student: {
        name: student.name,
        rollNo: student.rollNo,
        class: student.class,
        division: student.division,
      },
      summary: {
        totalDue,
        totalPaid,
        totalOutstanding,
        overallStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ message: 'Failed to fetch fee details.' });
  }
});

module.exports = router;
