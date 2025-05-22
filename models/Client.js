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

    weeklySchedule: [
      {
        day: {
          type: String,
          enum: [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
        },
        time: {
          type: String, // '15:00' 형태 (24시간제)
        },
      },
    ],
    goal: { type: String },
  },
  {
    timestamps: true,
  }
);

const client = mongoose.model('Client', clientSchema);
export default client;
