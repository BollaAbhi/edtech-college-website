const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    examType: {
      type: String,
      enum: ['unit', 'midterm', 'final'],
      required: [true, 'Exam type is required'],
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: 1,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
  },
  { timestamps: true }
);

// Prevent duplicate marks for same student/subject/examType
marksSchema.index({ studentId: 1, subject: 1, examType: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);
