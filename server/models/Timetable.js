const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema(
  {
    time: { type: String, required: true, trim: true },       // e.g. "09:00 - 09:45"
    subject: { type: String, default: '', trim: true },
    staffName: { type: String, default: '', trim: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: [true, 'Day is required'],
    },
    periods: {
      type: [periodSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// One timetable entry per class per day
timetableSchema.index({ class: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
