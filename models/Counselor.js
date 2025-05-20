import mongoose from 'mongoose';

// ✅ Counselor Schema
export const counselorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  introText: { type: String },
});
const counselor = mongoose.model('counselor', counselorSchema);
export default counselor;
