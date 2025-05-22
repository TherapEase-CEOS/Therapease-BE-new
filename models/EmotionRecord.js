import mongoose from 'mongoose';

// ✅ Emotion Schema
const emotionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['sad', 'mad', 'scared', 'joyful', 'powerful', 'peaceful'],
    required: true,
  },
  subcategory: { type: String, required: true },
  feeling: {
    type: String,
    enum: ['positive', 'negative', 'unsure'],
    required: true,
  },
  intensity: { type: Number, min: 1, max: 5, required: true },
});

// ✅ EmotionRecord Schema
export const emotionRecordSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  date: { type: Date, required: true },
  answer1: { type: String, maxlength: 100 },
  answer2: { type: String, maxlength: 100 },
  answer3: { type: String, maxlength: 100 },
  emotions: {
    type: [emotionSchema],
    validate: [
      (arr) => arr.length >= 1 && arr.length <= 3,
      'Must have 1~3 emotions',
    ],
  },
});

const emotionRecord = mongoose.model('EmotionRecord', emotionRecordSchema);
export default emotionRecord;
