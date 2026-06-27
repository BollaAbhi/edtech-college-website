const express = require('express');
const Staff = require('../models/Staff');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');
const { sendWelcomeEmail } = require('../utils/sendEmail');

const router = express.Router();

// All routes are principal-only
router.use(verifyToken, checkRole(['principal']));

// GET /api/staff-members — list all staff with search + pagination
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subjectsAssigned: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Staff.countDocuments(query);
    const staffList = await Staff.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name email role');

    res.json({
      staff: staffList,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff.' });
  }
});

// POST /api/staff-members — add new staff (also creates User account)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subjectsAssigned, classesAssigned } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Create User account with default password
    const defaultPassword = 'staff123';
    const user = await User.create({
      name,
      email,
      password: defaultPassword,
      role: 'staff',
    });

    const staffMember = await Staff.create({
      name,
      email,
      phone: phone || '',
      subjectsAssigned: subjectsAssigned || [],
      classesAssigned: classesAssigned || [],
      userId: user._id,
    });

    // Send Welcome Email
    await sendWelcomeEmail(user.email, user.name, defaultPassword, 'staff');

    res.status(201).json({
      message: `Staff added successfully. Default password: ${defaultPassword}`,
      staff: staffMember,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A staff member with this email already exists.' });
    }
    res.status(500).json({ message: 'Failed to add staff.' });
  }
});

// PUT /api/staff-members/:id — edit staff
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, subjectsAssigned, classesAssigned } = req.body;

    const staffMember = await Staff.findById(req.params.id);
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Sync linked User if email or name changed
    if (email && email !== staffMember.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: staffMember.userId } });
      if (emailTaken) {
        return res.status(400).json({ message: 'This email is already in use.' });
      }
      if (staffMember.userId) {
        await User.findByIdAndUpdate(staffMember.userId, { email, name: name || staffMember.name });
      }
    } else if (name && name !== staffMember.name && staffMember.userId) {
      await User.findByIdAndUpdate(staffMember.userId, { name });
    }

    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      {
        name: name || staffMember.name,
        email: email || staffMember.email,
        phone: phone !== undefined ? phone : staffMember.phone,
        subjectsAssigned: subjectsAssigned !== undefined ? subjectsAssigned : staffMember.subjectsAssigned,
        classesAssigned: classesAssigned !== undefined ? classesAssigned : staffMember.classesAssigned,
      },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Staff updated successfully.', staff: updated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to update staff.' });
  }
});

// DELETE /api/staff-members/:id — delete staff and linked User
router.delete('/:id', async (req, res) => {
  try {
    const staffMember = await Staff.findById(req.params.id);
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (staffMember.userId) {
      await User.findByIdAndDelete(staffMember.userId);
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.json({ message: 'Staff deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete staff.' });
  }
});

module.exports = router;
