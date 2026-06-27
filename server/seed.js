const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('DNS configured to Google DNS for seed script');
} catch (e) {
  console.error('Failed to configure DNS:', e);
}

const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Student = require('./models/Student');
const Staff = require('./models/Staff');
const Attendance = require('./models/Attendance');
const Marks = require('./models/Marks');
const FeeRecord = require('./models/FeeRecord');
const LeaveRequest = require('./models/LeaveRequest');
const Notice = require('./models/Notice');
const Timetable = require('./models/Timetable');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is missing from .env');
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // Clear existing data
    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Staff.deleteMany({});
    await Attendance.deleteMany({});
    await Marks.deleteMany({});
    await FeeRecord.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Notice.deleteMany({});
    await Timetable.deleteMany({});
    console.log('Cleared all collections.');

    // 1. Create Principal Account
    console.log('Seeding Principal...');
    const principalUser = new User({
      name: 'Principal Admin',
      email: 'abhilashbolla846@gmail.com',
      password: await bcrypt.hash('Demo@1234', 10),
      role: 'principal',
      isFirstLogin: false
    });
    await principalUser.save();

    // 2. Create Staff Accounts & Records
    console.log('Seeding Staff records...');
    const staffData = [
      {
        name: 'Staff Member',
        email: 'abhilashbolla0@gmail.com', // Demo staff
        subjectsAssigned: ['Mathematics', 'Physics'],
        classesAssigned: ['10 A', '10 B'],
        phone: '+1 (555) 019-2834'
      },
      {
        name: 'Dr. Elena Rostova',
        email: 'elena@demo.com',
        subjectsAssigned: ['Chemistry', 'Biology'],
        classesAssigned: ['10 A'],
        phone: '+1 (555) 019-3742'
      },
      {
        name: 'Prof. James Wilson',
        email: 'james@demo.com',
        subjectsAssigned: ['English', 'History'],
        classesAssigned: ['10 B'],
        phone: '+1 (555) 019-4821'
      }
    ];

    const staffDocs = [];
    for (const s of staffData) {
      const user = new User({
        name: s.name,
        email: s.email,
        password: await bcrypt.hash('Demo@1234', 10),
        role: 'staff',
        isFirstLogin: true
      });
      const savedUser = await user.save();

      // Create Staff
      const staff = new Staff({
        name: s.name,
        email: s.email,
        phone: s.phone,
        subjectsAssigned: s.subjectsAssigned,
        classesAssigned: s.classesAssigned,
        userId: savedUser._id
      });
      const savedStaff = await staff.save();
      staffDocs.push(savedStaff);
    }

    const davidMiller = staffDocs[0];
    const elenaRostova = staffDocs[1];
    const jamesWilson = staffDocs[2];

    // 3. Create Student Accounts & Records
    console.log('Seeding Student records...');
    const studentData = [
      {
        name: 'Student User',
        email: 'joguyashwanth009@gmail.com', // Demo student
        class: '10',
        division: 'A',
        rollNo: '01',
        feeStatus: 'paid',
        phone: '+1 (555) 011-2233'
      },
      {
        name: 'Emily Chen',
        email: 'emily@demo.com',
        class: '10',
        division: 'A',
        rollNo: '02',
        feeStatus: 'partial',
        phone: '+1 (555) 012-3344'
      },
      {
        name: 'Marcus Johnson',
        email: 'marcus@demo.com',
        class: '10',
        division: 'A',
        rollNo: '03',
        feeStatus: 'unpaid',
        phone: '+1 (555) 013-4455'
      },
      {
        name: 'Sophia Patel',
        email: 'sophia@demo.com',
        class: '10',
        division: 'B',
        rollNo: '01',
        feeStatus: 'paid',
        phone: '+1 (555) 014-5566'
      },
      {
        name: 'Liam O\'Connor',
        email: 'liam@demo.com',
        class: '10',
        division: 'B',
        rollNo: '02',
        feeStatus: 'paid',
        phone: '+1 (555) 015-6677'
      }
    ];

    const studentDocs = [];
    for (const st of studentData) {
      // Create User
      const user = new User({
        name: st.name,
        email: st.email,
        password: await bcrypt.hash('Demo@1234', 10),
        role: 'student',
        isFirstLogin: true
      });
      const savedUser = await user.save();

      // Create Student
      const student = new Student({
        name: st.name,
        email: st.email,
        phone: st.phone,
        class: st.class,
        division: st.division,
        rollNo: st.rollNo,
        feeStatus: st.feeStatus,
        userId: savedUser._id
      });
      const savedStudent = await student.save();
      studentDocs.push(savedStudent);
    }

    const alexRivera = studentDocs[0];
    const emilyChen = studentDocs[1];
    const marcusJohnson = studentDocs[2];
    const sophiaPatel = studentDocs[3];
    const liamOConnor = studentDocs[4];

    // 4. Seed FeeRecords
    console.log('Seeding Fee records...');
    const feeRecords = [
      { studentId: alexRivera._id, amount: 25000, paidAmount: 25000, status: 'paid', paidDate: '2026-05-15', feeType: 'yearly' },
      { studentId: emilyChen._id, amount: 25000, paidAmount: 12500, status: 'partial', paidDate: '2026-05-20', feeType: 'yearly' },
      { studentId: marcusJohnson._id, amount: 25000, paidAmount: 0, status: 'pending', paidDate: '', feeType: 'yearly' },
      { studentId: sophiaPatel._id, amount: 25000, paidAmount: 25000, status: 'paid', paidDate: '2026-05-12', feeType: 'yearly' },
      { studentId: liamOConnor._id, amount: 25000, paidAmount: 25000, status: 'paid', paidDate: '2026-05-14', feeType: 'yearly' }
    ];
    await FeeRecord.insertMany(feeRecords);

    // 5. Seed Attendance Records
    console.log('Seeding Attendance...');
    const dates = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24'];
    const attendanceRecords = [];

    // Class 10 A: Alex, Emily, Marcus
    // David Miller teaches Math, Elena teaches Chemistry
    const classAStudents = [alexRivera, emilyChen, marcusJohnson];
    const classAStatuses = {
      [alexRivera._id]: ['present', 'present', 'present', 'present', 'present'],
      [emilyChen._id]: ['present', 'absent', 'present', 'present', 'absent'],
      [marcusJohnson._id]: ['absent', 'present', 'absent', 'absent', 'present']
    };

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      for (const st of classAStudents) {
        // Math Attendance
        attendanceRecords.push({
          studentId: st._id,
          staffId: davidMiller._id,
          subject: 'Mathematics',
          class: '10 A',
          date: date,
          status: classAStatuses[st._id][i]
        });
        // Chemistry Attendance
        attendanceRecords.push({
          studentId: st._id,
          staffId: elenaRostova._id,
          subject: 'Chemistry',
          class: '10 A',
          date: date,
          status: classAStatuses[st._id][(i + 1) % dates.length]
        });
      }
    }

    // Class 10 B: Sophia, Liam
    // David Miller teaches Math, James Wilson teaches English
    const classBStudents = [sophiaPatel, liamOConnor];
    const classBStatuses = {
      [sophiaPatel._id]: ['present', 'present', 'present', 'present', 'present'],
      [liamOConnor._id]: ['present', 'present', 'absent', 'present', 'present']
    };

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      for (const st of classBStudents) {
        // Math Attendance
        attendanceRecords.push({
          studentId: st._id,
          staffId: davidMiller._id,
          subject: 'Mathematics',
          class: '10 B',
          date: date,
          status: classBStatuses[st._id][i]
        });
        // English Attendance
        attendanceRecords.push({
          studentId: st._id,
          staffId: jamesWilson._id,
          subject: 'English',
          class: '10 B',
          date: date,
          status: classBStatuses[st._id][(i + 2) % dates.length]
        });
      }
    }

    await Attendance.insertMany(attendanceRecords);

    // 6. Seed Marks
    console.log('Seeding Marks...');
    const marksRecords = [
      // Alex Rivera
      { studentId: alexRivera._id, subject: 'Mathematics', staffId: davidMiller._id, class: '10 A', examType: 'midterm', marksObtained: 88, totalMarks: 100, date: '2026-06-15' },
      { studentId: alexRivera._id, subject: 'Chemistry', staffId: elenaRostova._id, class: '10 A', examType: 'midterm', marksObtained: 92, totalMarks: 100, date: '2026-06-16' },

      // Emily Chen
      { studentId: emilyChen._id, subject: 'Mathematics', staffId: davidMiller._id, class: '10 A', examType: 'midterm', marksObtained: 75, totalMarks: 100, date: '2026-06-15' },
      { studentId: emilyChen._id, subject: 'Chemistry', staffId: elenaRostova._id, class: '10 A', examType: 'midterm', marksObtained: 81, totalMarks: 100, date: '2026-06-16' },

      // Marcus Johnson
      { studentId: marcusJohnson._id, subject: 'Mathematics', staffId: davidMiller._id, class: '10 A', examType: 'midterm', marksObtained: 62, totalMarks: 100, date: '2026-06-15' },
      { studentId: marcusJohnson._id, subject: 'Chemistry', staffId: elenaRostova._id, class: '10 A', examType: 'midterm', marksObtained: 58, totalMarks: 100, date: '2026-06-16' },

      // Sophia Patel
      { studentId: sophiaPatel._id, subject: 'Mathematics', staffId: davidMiller._id, class: '10 B', examType: 'midterm', marksObtained: 95, totalMarks: 100, date: '2026-06-15' },
      { studentId: sophiaPatel._id, subject: 'English', staffId: jamesWilson._id, class: '10 B', examType: 'midterm', marksObtained: 94, totalMarks: 100, date: '2026-06-17' },

      // Liam O'Connor
      { studentId: liamOConnor._id, subject: 'Mathematics', staffId: davidMiller._id, class: '10 B', examType: 'midterm', marksObtained: 82, totalMarks: 100, date: '2026-06-15' },
      { studentId: liamOConnor._id, subject: 'English', staffId: jamesWilson._id, class: '10 B', examType: 'midterm', marksObtained: 89, totalMarks: 100, date: '2026-06-17' }
    ];
    await Marks.insertMany(marksRecords);

    // 7. Seed Notices
    console.log('Seeding Notices...');
    const notices = [
      {
        title: 'Annual College Fest 2026 Dates',
        content: 'The Annual College Fest will take place from November 12th to November 15th, 2026. A detailed calendar of cultural and technical events will be posted shortly. All classes are suspended for these dates.',
        authorId: principalUser._id,
        authorName: 'Dr. Sarah Jenkins',
        authorRole: 'principal',
        targetRole: 'all',
        priority: 'high'
      },
      {
        title: 'Academic Council Meeting',
        content: 'All faculty members are requested to attend the semester review and syllabus planning meeting in the main conference hall on Friday, June 26th at 3:00 PM.',
        authorId: principalUser._id,
        authorName: 'Dr. Sarah Jenkins',
        authorRole: 'principal',
        targetRole: 'staff',
        priority: 'urgent'
      },
      {
        title: 'Mathematics Assignment 3 Submission Deadline',
        content: 'Students of Class 10 A and 10 B must submit their completed Mathematics assignment 3 (Vector Algebra) by Monday, June 29th, 2026. Late submissions will result in a marks penalty.',
        authorId: davidMiller.userId,
        authorName: 'Prof. David Miller',
        authorRole: 'staff',
        targetRole: 'student',
        priority: 'normal'
      }
    ];
    await Notice.insertMany(notices);

    // 8. Seed LeaveRequests
    console.log('Seeding Leave Requests...');
    const leaves = [
      {
        staffId: davidMiller._id,
        fromDate: '2026-07-02',
        toDate: '2026-07-04',
        reason: 'Attending a family wedding in Chicago.',
        status: 'pending'
      },
      {
        staffId: elenaRostova._id,
        fromDate: '2026-06-10',
        toDate: '2026-06-12',
        reason: 'Severe fever and doctor recommended medical rest.',
        status: 'approved',
        reviewedBy: principalUser._id
      },
      {
        staffId: jamesWilson._id,
        fromDate: '2026-06-15',
        toDate: '2026-06-16',
        reason: 'Personal financial appointments.',
        status: 'rejected',
        reviewedBy: principalUser._id
      }
    ];
    await LeaveRequest.insertMany(leaves);

    // 9. Seed Timetables
    console.log('Seeding Timetables...');
    const timetables = [
      {
        class: '10 A',
        day: 'Monday',
        periods: [
          { time: '09:00 - 09:45', subject: 'Mathematics', staffName: 'Prof. David Miller', staffId: davidMiller._id },
          { time: '09:45 - 10:30', subject: 'Chemistry', staffName: 'Dr. Elena Rostova', staffId: elenaRostova._id },
          { time: '10:45 - 11:30', subject: 'English', staffName: 'Prof. James Wilson', staffId: jamesWilson._id }
        ]
      },
      {
        class: '10 B',
        day: 'Monday',
        periods: [
          { time: '09:00 - 09:45', subject: 'Chemistry', staffName: 'Dr. Elena Rostova', staffId: elenaRostova._id },
          { time: '09:45 - 10:30', subject: 'Mathematics', staffName: 'Prof. David Miller', staffId: davidMiller._id },
          { time: '10:45 - 11:30', subject: 'History', staffName: 'Prof. James Wilson', staffId: jamesWilson._id }
        ]
      }
    ];
    await Timetable.insertMany(timetables);

    console.log('Database successfully seeded with demo accounts & stats!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();
