const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidDate: {
      type: String, // YYYY-MM-DD
      default: '',
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'partial'],
      default: 'pending',
    },
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique fee record per student per semester
feeRecordSchema.index({ studentId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
