const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    date: {
      type: String, // stored as YYYY-MM-DD for easy filtering
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent',
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate attendance for same student/subject/date
attendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
