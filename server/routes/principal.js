const express = require('express');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// GET /api/principal/stats — principal only
router.get('/stats', verifyToken, checkRole(['principal']), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalStaff = await User.countDocuments({ role: 'staff' });

    // Placeholder values until Fee and Attendance models are built
    const totalFeeCollected = 485000;
    const totalFeePending = 215000;
    const avgAttendance = 78.5;

    // Monthly attendance trend (placeholder data)
    const monthlyAttendance = [
      { month: 'Jan', attendance: 82 },
      { month: 'Feb', attendance: 79 },
      { month: 'Mar', attendance: 85 },
      { month: 'Apr', attendance: 74 },
      { month: 'May', attendance: 88 },
      { month: 'Jun', attendance: 76 },
      { month: 'Jul', attendance: 81 },
      { month: 'Aug', attendance: 90 },
      { month: 'Sep', attendance: 72 },
      { month: 'Oct', attendance: 85 },
      { month: 'Nov', attendance: 78 },
      { month: 'Dec', attendance: 83 },
    ];

    // Fee breakdown for pie chart
    const feeBreakdown = [
      { name: 'Collected', value: totalFeeCollected },
      { name: 'Pending', value: totalFeePending },
    ];

    res.json({
      totalStudents,
      totalStaff,
      totalFeeCollected,
      totalFeePending,
      avgAttendance,
      monthlyAttendance,
      feeBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

module.exports = router;
