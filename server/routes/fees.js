const express = require('express');
const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

const FEE_TYPES = ['yearly', 'term1', 'term2', 'term3'];
const FEE_TYPE_LABELS = {
  yearly: 'Annual Fees',
  term1: 'Term 1 (Jun–Sep)',
  term2: 'Term 2 (Oct–Jan)',
  term3: 'Term 3 (Feb–May)',
};

// ─── POST /api/fees ───────────────────────────────────────────────────────────
// Principal creates/updates a student fee record
router.post('/', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { studentId, feeType, amount, paidAmount, paidDate, status, academicYear, remarks } = req.body;

    if (!studentId || !feeType || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'studentId, feeType, and amount are required.' });
    }

    if (!FEE_TYPES.includes(feeType)) {
      return res.status(400).json({ message: 'Invalid feeType. Must be yearly, term1, term2, or term3.' });
    }

    const now = new Date();
    const defaultYear = now.getMonth() >= 5 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;

    const feeRecord = await FeeRecord.findOneAndUpdate(
      { studentId, feeType, academicYear: academicYear || defaultYear },
      {
        studentId,
        feeType,
        amount: Number(amount),
        paidAmount: Number(paidAmount || 0),
        status: status || 'pending',
        paidDate: paidDate || (paidAmount > 0 ? now.toISOString().split('T')[0] : ''),
        academicYear: academicYear || defaultYear,
        remarks: remarks || '',
      },
      { new: true, upsert: true }
    );

    // Sync student model feeStatus based on all their records
    const allRecords = await FeeRecord.find({ studentId });
    const allPaid = allRecords.length > 0 && allRecords.every((r) => r.status === 'paid');
    const anyPaidOrPartial = allRecords.some((r) => r.status === 'paid' || r.status === 'partial' || r.paidAmount > 0);
    let mappedStatus = 'unpaid';
    if (allPaid) mappedStatus = 'paid';
    else if (anyPaidOrPartial) mappedStatus = 'partial';
    await Student.findByIdAndUpdate(studentId, { feeStatus: mappedStatus });

    res.status(201).json({ message: 'Fee record saved successfully.', feeRecord });
  } catch (error) {
    console.error('Error saving fee record:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A fee record for this type and year already exists. It has been updated.' });
    }
    res.status(500).json({ message: 'Failed to record fee payment.' });
  }
});

// ─── GET /api/fees ────────────────────────────────────────────────────────────
// Principal views all fee records with filters & term-wise stats
router.get('/', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { page = 1, limit = 20, class: cls, division, status, feeType, academicYear, studentId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build student filter
    let studentFilter = {};
    if (cls) {
      const parts = cls.split('-');
      if (parts.length >= 2) {
        studentFilter.class = parts[0];
        studentFilter.division = parts[1];
      } else {
        studentFilter.class = cls;
      }
    }
    if (division) studentFilter.division = division;

    let matchingStudentIds = [];
    const filterActive = Object.keys(studentFilter).length > 0;

    if (filterActive) {
      const students = await Student.find(studentFilter).select('_id');
      matchingStudentIds = students.map((s) => s._id);
    }

    let query = {};
    if (filterActive) query.studentId = { $in: matchingStudentIds };
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (academicYear) query.academicYear = academicYear;

    const total = await FeeRecord.countDocuments(query);
    const records = await FeeRecord.find(query)
      .populate('studentId', 'name rollNo class division email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Compute stats (all matching, not just page)
    const allMatching = await FeeRecord.find(query);
    let totalExpected = 0;
    let totalCollected = 0;
    allMatching.forEach((r) => {
      totalExpected += r.amount || 0;
      totalCollected += r.paidAmount || 0;
    });
    const totalOutstanding = totalExpected - totalCollected;
    const paymentRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0.0';

    // Term-wise breakdown
    const termBreakdown = {};
    FEE_TYPES.forEach((ft) => {
      termBreakdown[ft] = { label: FEE_TYPE_LABELS[ft], expected: 0, collected: 0, count: 0, paidCount: 0, pendingCount: 0 };
    });
    allMatching.forEach((r) => {
      if (termBreakdown[r.feeType]) {
        termBreakdown[r.feeType].expected += r.amount || 0;
        termBreakdown[r.feeType].collected += r.paidAmount || 0;
        termBreakdown[r.feeType].count += 1;
        if (r.status === 'paid') termBreakdown[r.feeType].paidCount += 1;
        else termBreakdown[r.feeType].pendingCount += 1;
      }
    });

    // Status distribution for pie chart
    const statusCounts = { paid: 0, partial: 0, pending: 0 };
    allMatching.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

    // Pending records with student details
    const pendingRecords = await FeeRecord.find({ ...query, status: { $in: ['pending', 'partial'] } })
      .populate('studentId', 'name rollNo class division')
      .sort({ amount: -1 })
      .limit(20);

    res.json({
      records,
      stats: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        paymentRate,
        termBreakdown,
        statusCounts,
      },
      pendingList: pendingRecords,
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
// Student sees their own fee records
router.get('/my', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const records = await FeeRecord.find({ studentId: student._id }).sort({ academicYear: -1, feeType: 1 });

    // Compute summary
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
      if (allPaid) overallStatus = 'paid';
      else if (anyPaidOrPartial) overallStatus = 'partial';
    }

    // Term-wise breakdown for current year
    const now = new Date();
    const currentYear = now.getMonth() >= 5 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
    const termStatus = {};
    FEE_TYPES.forEach((ft) => {
      const rec = records.find((r) => r.feeType === ft && r.academicYear === currentYear);
      termStatus[ft] = rec
        ? { amount: rec.amount, paidAmount: rec.paidAmount, status: rec.status, paidDate: rec.paidDate, feeType: ft, label: FEE_TYPE_LABELS[ft] }
        : { amount: 0, paidAmount: 0, status: 'not_set', paidDate: '', feeType: ft, label: FEE_TYPE_LABELS[ft] };
    });

    res.json({
      records: records.map((r) => ({
        ...r.toObject(),
        feeTypeLabel: FEE_TYPE_LABELS[r.feeType] || r.feeType,
      })),
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
      termStatus,
      currentYear,
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ message: 'Failed to fetch fee details.' });
  }
});

module.exports = router;
