const express = require('express');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const { sendWelcomeEmail } = require('../utils/sendEmail');

const router = express.Router();

// All routes are principal-only
router.use(verifyToken, checkRole(['principal']));

// GET /api/students — list all students with search, pagination
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, classFilter = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
      ];
    }

    if (classFilter) {
      query.class = classFilter;
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name email role');

    res.json({
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students.' });
  }
});

// POST /api/students — add new student (also creates User account)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, class: cls, division, rollNo, feeStatus } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Create a User account with default password
    const defaultPassword = 'student123';
    const user = await User.create({
      name,
      email,
      password: defaultPassword,
      role: 'student',
    });

    // Create student record linked to User
    const student = await Student.create({
      name,
      email,
      phone: phone || '',
      class: cls,
      division,
      rollNo,
      feeStatus: feeStatus || 'unpaid',
      userId: user._id,
    });

    // Send Welcome Email
    await sendWelcomeEmail(user.email, user.name, defaultPassword, 'student');

    res.status(201).json({
      message: `Student added successfully. Default password: ${defaultPassword}`,
      student,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A student with this email already exists.' });
    }
    res.status(500).json({ message: 'Failed to add student.' });
  }
});

// PUT /api/students/:id — edit student
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, class: cls, division, rollNo, feeStatus } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // If email changed, update the linked User too
    if (email && email !== student.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: student.userId } });
      if (emailTaken) {
        return res.status(400).json({ message: 'This email is already in use.' });
      }
      if (student.userId) {
        await User.findByIdAndUpdate(student.userId, { email, name: name || student.name });
      }
    } else if (name && name !== student.name && student.userId) {
      await User.findByIdAndUpdate(student.userId, { name });
    }

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      {
        name: name || student.name,
        email: email || student.email,
        phone: phone !== undefined ? phone : student.phone,
        class: cls || student.class,
        division: division || student.division,
        rollNo: rollNo || student.rollNo,
        feeStatus: feeStatus || student.feeStatus,
      },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Student updated successfully.', student: updated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to update student.' });
  }
});

// DELETE /api/students/:id — delete student and linked User
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Delete linked User account
    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete student.' });
  }
});

module.exports = router;
