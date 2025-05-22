import mongoose from 'mongoose';

const availableTimeSchema = new mongoose.Schema({
  counselorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Counselor',
    required: true,
    unique: true,
  },
  timetable: {
    sunday: { type: [Boolean], default: Array(15).fill(false) },
    monday: { type: [Boolean], default: Array(15).fill(false) },
    tuesday: { type: [Boolean], default: Array(15).fill(false) },
    wednesday: { type: [Boolean], default: Array(15).fill(false) },
    thursday: { type: [Boolean], default: Array(15).fill(false) },
    friday: { type: [Boolean], default: Array(15).fill(false) },
    saturday: { type: [Boolean], default: Array(15).fill(false) },
  },
});

const availableTime = mongoose.model('AvailableTime', availableTimeSchema);
export default availableTime;
