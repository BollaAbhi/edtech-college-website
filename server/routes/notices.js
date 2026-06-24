const express = require('express');
const Notice = require('../models/Notice');
const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

// ─── POST /api/notices ────────────────────────────────────────────────────────
// Principal can post to all/staff/student
// Staff can only post to students
router.post('/', verifyToken, checkRole(['principal', 'staff']), async (req, res) => {
  try {
    const { title, content, targetRole, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    // Staff can only target students
    const resolvedTarget = req.user.role === 'staff' ? 'student' : (targetRole || 'all');

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      targetRole: resolvedTarget,
      priority: priority || 'normal',
    });

    res.status(201).json({ message: 'Notice posted successfully.', notice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to post notice.' });
  }
});

// ─── GET /api/notices ─────────────────────────────────────────────────────────
// Returns notices relevant to the logged-in user's role
// Principal: all notices
// Staff: notices where targetRole = 'all' OR 'staff'
// Student: notices where targetRole = 'all' OR 'student'
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};
    if (req.user.role === 'staff') {
      query.targetRole = { $in: ['all', 'staff'] };
    } else if (req.user.role === 'student') {
      query.targetRole = { $in: ['all', 'student'] };
    }
    // principal sees everything (no filter)

    const total = await Notice.countDocuments(query);
    const notices = await Notice.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      notices,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch notices.' });
  }
});

// ─── DELETE /api/notices/:id ──────────────────────────────────────────────────
// Only the author (or principal) can delete a notice
router.delete('/:id', verifyToken, checkRole(['principal', 'staff']), async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found.' });
    }

    // Staff can only delete their own notices; principal can delete any
    if (req.user.role === 'staff' && notice.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own notices.' });
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notice.' });
  }
});

module.exports = router;
