import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ['client', 'counselor'], required: true },
    email: { type: String, required: true, unique: true },
    authCode: { type: String, required: true }, // 추후 인증 코드로 사용
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
