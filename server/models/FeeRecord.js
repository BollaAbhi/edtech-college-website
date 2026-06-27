const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    feeType: {
      type: String,
      enum: ['yearly', 'term1', 'term2', 'term3'],
      required: [true, 'Fee type is required'],
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
    academicYear: {
      type: String,
      default: () => {
        const now = new Date();
        const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
        return `${yr}-${yr + 1}`;
      },
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// One fee record per student per feeType per academic year
feeRecordSchema.index({ studentId: 1, feeType: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
