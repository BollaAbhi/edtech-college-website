const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const Staff = require('../models/Staff');
const Timetable = require('../models/Timetable');
const LeaveRequest = require('../models/LeaveRequest');
const Notice = require('../models/Notice');
const Student = require('../models/Student');

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

    if (now > endTime) {
      return 'completed';
    } else if (now >= startTime && now <= endTime) {
      return 'ongoing';
    } else {
      return 'upcoming';
    }
  } catch (error) {
    console.error('Error parsing period status:', error);
    return 'upcoming';
  }
}

// GET /api/staff/my-info — staff only
router.get('/my-info', verifyToken, checkRole(['staff']), async (req, res) => {
  try {
    const staffDoc = await Staff.findOne({ userId: req.user.id });
    if (!staffDoc) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }

    // Format assigned subjects
    const assignedSubjects = staffDoc.subjectsAssigned.map((sub, idx) => ({
      id: idx + 1,
      name: sub,
      code: sub.toUpperCase().replace(/\s+/g, '').substring(0, 4) + '101'
    }));

    // Format assigned classes and count real students
    const assignedClasses = [];
    for (let i = 0; i < staffDoc.classesAssigned.length; i++) {
      const clsName = staffDoc.classesAssigned[i];
      let classQuery = {};
      const parts = clsName.split(/[-\s]+/);
      if (parts.length >= 2) {
        classQuery.class = parts[0];
        classQuery.division = parts[1];
      } else {
        classQuery.class = clsName;
      }

      const studentCount = await Student.countDocuments(classQuery);
      assignedClasses.push({
        id: i + 1,
        name: `Class ${clsName}`,
        students: studentCount || 0
      });
    }

    // Get today's schedule from Timetable
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let todayDay = daysOfWeek[new Date().getDay()];
    if (todayDay === 'Sunday') todayDay = 'Monday'; // Fallback to Monday for demo if Sunday

    const timetables = await Timetable.find({ day: todayDay, 'periods.staffId': staffDoc._id });
    
    const todaySchedule = [];
    let slotId = 1;

    for (const tt of timetables) {
      for (let pi = 0; pi < tt.periods.length; pi++) {
        const p = tt.periods[pi];
        if (p.staffId && p.staffId.toString() === staffDoc._id.toString()) {
          const status = getPeriodStatus(p.time);
          todaySchedule.push({
            id: slotId++,
            period: pi + 1,
            time: p.time,
            subject: p.subject,
            class: `Class ${tt.class}`,
            room: `Room ${tt.class.replace(/[^0-9]/g, '') || '101'}`,
            status: status
          });
        }
      }
    }

    // Sort schedule by period number
    todaySchedule.sort((a, b) => a.period - b.period);

    // Get pending leave counts
    const leaves = await LeaveRequest.find({ staffId: staffDoc._id });
    const pendingLeave = {
      total: leaves.length,
      approved: leaves.filter(l => l.status === 'approved').length,
      pending: leaves.filter(l => l.status === 'pending').length,
      rejected: leaves.filter(l => l.status === 'rejected').length
    };

    // Get notices/announcements
    const notices = await Notice.find({ targetRole: { $in: ['all', 'staff'] } })
      .sort({ createdAt: -1 })
      .limit(3);

    const announcements = notices.map((n, idx) => ({
      id: idx + 1,
      title: n.title,
      body: n.content,
      date: n.createdAt.toISOString().split('T')[0],
      priority: n.priority
    }));

    res.json({
      assignedSubjects,
      assignedClasses,
      todaySchedule,
      pendingLeave,
      announcements,
    });
  } catch (error) {
    console.error('Error fetching staff info:', error);
    res.status(500).json({ message: 'Failed to fetch staff info.' });
  }
});

module.exports = router;
