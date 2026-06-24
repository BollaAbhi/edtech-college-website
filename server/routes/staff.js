const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// GET /api/staff/my-info — staff only
router.get('/my-info', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    // Placeholder data until Subject, Class, Timetable models are built
    const assignedSubjects = [
      { id: 1, name: 'Mathematics', code: 'MATH101' },
      { id: 2, name: 'Physics', code: 'PHY201' },
      { id: 3, name: 'Computer Science', code: 'CS301' },
    ];

    const assignedClasses = [
      { id: 1, name: 'Class 10-A', students: 42 },
      { id: 2, name: 'Class 11-B', students: 38 },
      { id: 3, name: 'Class 12-A', students: 35 },
      { id: 4, name: 'Class 12-C', students: 40 },
    ];

    const todaySchedule = [
      { id: 1, period: 1, time: '09:00 – 09:45', subject: 'Mathematics', class: 'Class 10-A', room: 'Room 201', status: 'completed' },
      { id: 2, period: 2, time: '09:50 – 10:35', subject: 'Physics', class: 'Class 11-B', room: 'Lab 3', status: 'completed' },
      { id: 3, period: 3, time: '10:50 – 11:35', subject: 'Computer Science', class: 'Class 12-A', room: 'CS Lab', status: 'ongoing' },
      { id: 4, period: 4, time: '11:40 – 12:25', subject: 'Mathematics', class: 'Class 12-C', room: 'Room 305', status: 'upcoming' },
      { id: 5, period: 5, time: '01:15 – 02:00', subject: 'Physics', class: 'Class 12-A', room: 'Lab 3', status: 'upcoming' },
      { id: 6, period: 6, time: '02:05 – 02:50', subject: 'Computer Science', class: 'Class 11-B', room: 'CS Lab', status: 'upcoming' },
    ];

    const pendingLeave = {
      total: 2,
      approved: 1,
      pending: 1,
      rejected: 0,
    };

    const announcements = [
      {
        id: 1,
        title: 'Staff Meeting – Monday',
        body: 'All staff members are requested to attend the monthly review meeting in the conference hall at 3:00 PM.',
        date: '2025-06-23',
        priority: 'high',
      },
      {
        id: 2,
        title: 'Mid-Term Exam Schedule Released',
        body: 'The mid-term examination schedule has been finalized. Please review your invigilation duties.',
        date: '2025-06-21',
        priority: 'normal',
      },
      {
        id: 3,
        title: 'Holiday Notice – June 28',
        body: 'The institution will remain closed on June 28 on account of a public holiday.',
        date: '2025-06-20',
        priority: 'normal',
      },
    ];

    res.json({
      assignedSubjects,
      assignedClasses,
      todaySchedule,
      pendingLeave,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff info.' });
  }
});

module.exports = router;
