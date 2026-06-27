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
      .populate('userId', 'name email role isActive isFirstLogin');

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

    // Auto-generate temporary password: Staff@<first4lettersOfName>
    const first4 = name.replace(/\s+/g, '').substring(0, 4);
    const capitalized = first4.charAt(0).toUpperCase() + first4.slice(1);
    const defaultPassword = `Staff@${capitalized}`;

    // Create User account with default password
    const user = await User.create({
      name,
      email,
      password: defaultPassword,
      role: 'staff',
      isFirstLogin: true,
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

    const { isActive } = req.body;
    if (isActive !== undefined && staffMember.userId) {
      await User.findByIdAndUpdate(staffMember.userId, { isActive });
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

// POST /api/staff-members/:id/reset-password — Reset password (Principal only)
router.post('/:id/reset-password', async (req, res) => {
  try {
    const staffMember = await Staff.findById(req.params.id);
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const first4 = staffMember.name.replace(/\s+/g, '').substring(0, 4);
    const capitalized = first4.charAt(0).toUpperCase() + first4.slice(1);
    const tempPassword = req.body.password || `Staff@${capitalized}`;

    const user = await User.findById(staffMember.userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.password = tempPassword;
    user.isFirstLogin = true;
    user.activeToken = undefined; // Force fresh login
    await user.save();

    res.json({ message: `Password reset successfully. Temporary password: ${tempPassword}` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset staff password.' });
  }
});

module.exports = router;
