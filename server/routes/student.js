const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// GET /api/student/my-info — student only
router.get('/my-info', verifyToken, checkRole(['student']), async (req, res) => {
  try {
    // Placeholder data until models are built
    const overallAttendance = 82.4;

    const subjectAttendance = [
      { subject: 'Mathematics', attended: 38, total: 42, percentage: 90 },
      { subject: 'Physics', attended: 32, total: 40, percentage: 80 },
      { subject: 'Chemistry', attended: 28, total: 38, percentage: 74 },
      { subject: 'English', attended: 35, total: 40, percentage: 88 },
      { subject: 'Comp. Science', attended: 30, total: 36, percentage: 83 },
      { subject: 'Hindi', attended: 26, total: 35, percentage: 74 },
    ];

    const recentMarks = [
      { id: 1, subject: 'Mathematics', exam: 'Mid-Term', score: 87, total: 100, date: '2025-06-10' },
      { id: 2, subject: 'Physics', exam: 'Mid-Term', score: 72, total: 100, date: '2025-06-11' },
      { id: 3, subject: 'Chemistry', exam: 'Mid-Term', score: 68, total: 100, date: '2025-06-12' },
      { id: 4, subject: 'English', exam: 'Mid-Term', score: 91, total: 100, date: '2025-06-13' },
      { id: 5, subject: 'Comp. Science', exam: 'Mid-Term', score: 95, total: 100, date: '2025-06-14' },
    ];

    const upcomingExams = [
      { id: 1, subject: 'Mathematics', date: '2025-07-05', type: 'Final Exam' },
      { id: 2, subject: 'Physics', date: '2025-07-07', type: 'Final Exam' },
      { id: 3, subject: 'Chemistry', date: '2025-07-09', type: 'Final Exam' },
      { id: 4, subject: 'English', date: '2025-07-11', type: 'Final Exam' },
    ];

    const feeStatus = {
      totalFee: 75000,
      paid: 50000,
      pending: 25000,
      dueDate: '2025-07-15',
      status: 'partial',
    };

    const notices = [
      {
        id: 1,
        title: 'Final Exam Timetable Published',
        body: 'The final examination timetable for all classes has been published. Check the Timetable section for details.',
        date: '2025-06-22',
        priority: 'high',
      },
      {
        id: 2,
        title: 'Library Books Return Deadline',
        body: 'All library books must be returned by June 30. Late returns will incur a fine of ₹10/day.',
        date: '2025-06-20',
        priority: 'normal',
      },
      {
        id: 3,
        title: 'Annual Sports Day – July 20',
        body: 'Register for sports day events through your class representative before July 10.',
        date: '2025-06-18',
        priority: 'normal',
      },
      {
        id: 4,
        title: 'Fee Payment Reminder',
        body: 'Students with pending fee dues are requested to clear their balance before July 15 to avoid late penalties.',
        date: '2025-06-17',
        priority: 'high',
      },
    ];

    res.json({
      overallAttendance,
      subjectAttendance,
      recentMarks,
      upcomingExams,
      feeStatus,
      notices,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student info.' });
  }
});

module.exports = router;
