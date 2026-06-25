const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Staff = require('../models/Staff');
const Notice = require('../models/Notice');

const router = express.Router();

function getPeriodStatus(timeStr) {
  try {
    const times = timeStr.split(/[\-\u2013\u2014]/).map(t => t.trim());
    if (times.length < 2) return 'upcoming';

    const now = new Date();
    const [startHour, startMin] = times[0].split(':').map(Number);
    const [endHour, endMin] = times[1].split(':').map(Number);

    const startTime = new Date(now);
    startTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(endHour, endMin, 0, 0);

    if (now > endTime) return 'completed';
    if (now >= startTime && now <= endTime) return 'ongoing';
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
}

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

    // ── Build today's schedule from Timetable collection ──
    let todaySchedule = [];
    try {
      const studentDoc = await Student.findOne({ userId: req.user.id });
      if (studentDoc) {
        const cls = studentDoc.class && studentDoc.division
          ? `${studentDoc.class}-${studentDoc.division}`
          : studentDoc.class || '';

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let todayDay = daysOfWeek[new Date().getDay()];
        if (todayDay === 'Sunday') todayDay = 'Monday';

        // Try multiple class name formats
        const classVariants = [cls];
        if (studentDoc.class && studentDoc.division) {
          classVariants.push(`${studentDoc.class}${studentDoc.division}`);
          classVariants.push(`${studentDoc.class} ${studentDoc.division}`);
        }

        let ttDoc = null;
        for (const variant of classVariants) {
          ttDoc = await Timetable.findOne({ class: variant, day: todayDay });
          if (ttDoc) break;
        }

        if (ttDoc && ttDoc.periods.length > 0) {
          // Resolve staff names for each period
          const staffIds = ttDoc.periods
            .filter(p => p.staffId)
            .map(p => p.staffId);

          const staffDocs = await Staff.find({ _id: { $in: staffIds } }).select('_id name');
          const staffMap = {};
          staffDocs.forEach(s => { staffMap[s._id.toString()] = s.name; });

          todaySchedule = ttDoc.periods.map((p, idx) => ({
            id: idx + 1,
            period: idx + 1,
            time: p.time,
            subject: p.subject || '—',
            staffName: p.staffName || (p.staffId ? staffMap[p.staffId.toString()] : '') || '',
            status: getPeriodStatus(p.time),
          }));
        }
      }
    } catch (schedErr) {
      console.error('Error building student schedule:', schedErr);
    }

    res.json({
      overallAttendance,
      subjectAttendance,
      recentMarks,
      upcomingExams,
      feeStatus,
      notices,
      todaySchedule,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student info.' });
  }
});

module.exports = router;

