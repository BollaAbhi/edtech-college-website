const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const Staff = require('../models/Staff');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/leave ──────────────────────────────────────────────────────────
// Staff applies for a leave request (Staff only)
router.post('/', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'fromDate, toDate, and reason are required.' });
    }

    // Find the Staff document linked to this User
    const staff = await Staff.findOne({ userId: req.user.id });
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    const leave = await LeaveRequest.create({
      staffId: staff._id,
      fromDate,
      toDate,
      reason: reason.trim(),
      status: 'pending',
    });

    res.status(201).json({ message: 'Leave request submitted successfully.', leave });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({ message: 'Failed to submit leave request.' });
  }
});

// ─── GET /api/leave/my ────────────────────────────────────────────────────────
// Staff sees their own leave history (Staff only)
router.get('/my', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const staff = await Staff.findOne({ userId: req.user.id });
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    const leaves = await LeaveRequest.find({ staffId: staff._id })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'name email');

    res.json({ leaves });
  } catch (error) {
    console.error('Error fetching staff leaves:', error);
    res.status(500).json({ message: 'Failed to fetch leave history.' });
  }
});

// ─── GET /api/leave/all ───────────────────────────────────────────────────────
// Principal sees all leave requests (Principal only)
router.get('/all', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const leaves = await LeaveRequest.find()
      .sort({ createdAt: -1 })
      .populate('staffId', 'name email phone subjectsAssigned classesAssigned')
      .populate('reviewedBy', 'name email');

    res.json({ leaves });
  } catch (error) {
    console.error('Error fetching all leaves:', error);
    res.status(500).json({ message: 'Failed to fetch leave requests.' });
  }
});

// ─── PUT /api/leave/:id ───────────────────────────────────────────────────────
// Principal approves or rejects leave request (Principal only)
router.put('/:id', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.reviewedBy = req.user.id;
    await leave.save();

    const populatedLeave = await LeaveRequest.findById(leave._id)
      .populate('staffId', 'name email phone')
      .populate('reviewedBy', 'name email');

    res.json({ message: `Leave request has been ${status}.`, leave: populatedLeave });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ message: 'Failed to update leave request.' });
  }
});

module.exports = router;
