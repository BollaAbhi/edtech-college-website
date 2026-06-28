const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Staff = require('../models/Staff');
const Notice = require('../models/Notice');
const FeeRecord = require('../models/FeeRecord');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');

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
    const studentDoc = await Student.findOne({ userId: req.user.id });
    if (!studentDoc) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const studentId = studentDoc._id;

    // 1. Calculate Attendance from Database
    const attendanceDocs = await Attendance.find({ studentId });
    let overallAttendance = 'No attendance recorded yet'; // default if no records
    let subjectAttendance = [];
    
    if (attendanceDocs.length > 0) {
      const subjectMap = {};
      let totalAttended = 0;
      attendanceDocs.forEach(att => {
        const isAttended = att.status === 'present' || att.status === 'late';
        if (!subjectMap[att.subject]) {
          subjectMap[att.subject] = { attended: 0, total: 0 };
        }
        subjectMap[att.subject].total += 1;
        if (isAttended) {
          subjectMap[att.subject].attended += 1;
          totalAttended += 1;
        }
      });

      overallAttendance = Number(((totalAttended / attendanceDocs.length) * 100).toFixed(1));
      subjectAttendance = Object.entries(subjectMap).map(([subject, counts]) => ({
        subject,
        attended: counts.attended,
        total: counts.total,
        percentage: Math.round((counts.attended / counts.total) * 100)
      }));
    }

    // 2. Fetch Marks from Database
    const marksDocs = await Marks.find({ studentId }).sort({ createdAt: -1 });
    let recentMarks = [];
    if (marksDocs.length > 0) {
      recentMarks = marksDocs.map((m, idx) => ({
        id: m._id,
        subject: m.subject,
        exam: m.examType === 'midterm' ? 'Mid-Term' : m.examType === 'final' ? 'Final Exam' : 'Unit Test',
        score: m.marksObtained,
        total: m.totalMarks,
        date: m.date
      }));
    }

    // 3. Upcoming Exams (mock/derived)
    const upcomingExams = [
      { id: 1, subject: 'Mathematics', date: '2025-07-05', type: 'Final Exam' },
      { id: 2, subject: 'Physics', date: '2025-07-07', type: 'Final Exam' },
      { id: 3, subject: 'Chemistry', date: '2025-07-09', type: 'Final Exam' },
      { id: 4, subject: 'English', date: '2025-07-11', type: 'Final Exam' },
    ];

    // 4. Fee Status from Database
    const feeRecords = await FeeRecord.find({ studentId });
    let feeStatus = {
      totalFee: 0,
      paid: 0,
      pending: 0,
      dueDate: '',
      status: 'unpaid'
    };

    if (feeRecords.length > 0) {
      let totalDue = 0;
      let totalPaid = 0;
      feeRecords.forEach(r => {
        totalDue += r.amount || 0;
        totalPaid += r.paidAmount || 0;
      });
      const totalOutstanding = totalDue - totalPaid;
      
      let overallStatus = 'unpaid';
      const allPaid = feeRecords.every(r => r.status === 'paid');
      const anyPaidOrPartial = feeRecords.some(r => r.status === 'paid' || r.status === 'partial' || r.paidAmount > 0);
      if (allPaid) overallStatus = 'paid';
      else if (anyPaidOrPartial) overallStatus = 'partial';

      // Due date 15th of next month as default or dynamic
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const dueDateStr = nextMonth.toISOString().split('T')[0];

      feeStatus = {
        totalFee: totalDue,
        paid: totalPaid,
        pending: totalOutstanding,
        dueDate: dueDateStr,
        status: overallStatus
      };
    } else {
      // Fallback to studentDoc.feeStatus
      feeStatus = {
        totalFee: 75000,
        paid: studentDoc.feeStatus === 'paid' ? 75000 : studentDoc.feeStatus === 'partial' ? 50000 : 0,
        pending: studentDoc.feeStatus === 'paid' ? 0 : studentDoc.feeStatus === 'partial' ? 25000 : 75000,
        dueDate: '2025-07-15',
        status: studentDoc.feeStatus || 'unpaid'
      };
    }

    // 5. Notices from Database
    const noticeDocs = await Notice.find({ targetRole: { $in: ['all', 'student'] } })
      .sort({ createdAt: -1 })
      .limit(5);

    let notices = [];
    if (noticeDocs.length > 0) {
      notices = noticeDocs.map(n => ({
        id: n._id,
        title: n.title,
        body: n.content,
        date: n.createdAt.toISOString().split('T')[0],
        priority: n.priority
      }));
    } else {
      // Fallback notices
      notices = [
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
        }
      ];
    }

    // 6. Build today's schedule from Timetable collection
    let todaySchedule = [];
    try {
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
    console.error('Error fetching student info:', error);
    res.status(500).json({ message: 'Failed to fetch student info.' });
  }
});

module.exports = router;

