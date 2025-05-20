import mongoose from 'mongoose';

export const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    counselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Counselor',
    },
    // startDate: { type: Date } -> _createdAt 으로 대체
    status: {
      type: String,
      enum: ['ongoing', 'completed'],
      default: 'ongoing',
    },
    goal: { type: String },
    sessionDay: { type: String },
    sessionTime: { type: Date },
  },
  {
    timestamps: true,
  }
);

const client = mongoose.model('Client', clientSchema);
export default client;
