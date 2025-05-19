import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import User from '../models/User.js';
import { validateEmail, validateRole } from '../utils/validators.js';
import { Roles } from '../constants/constant.js';

const router = express.Router();

function generateAuthCode(user) {
  const initials = user.role == Roles.COUNSELEE ? 'CE' : 'CR';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6글자 랜덤
  return `${initials}-${randomPart}`; // ex. 'CE-X7P9Q2'
}

// 회원가입 (Register)
router.post('/register', async (req, res) => {
  const user = req.body;
  const { email, name, role } = user;

  if (!validateEmail(email) || !validateRole(role)) {
    return res.status(400).json({ message: 'Invalid email or role format.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'Email already registered.' });

    const authCode = generateAuthCode(user);

    // TODO 코드 중복 체크 확인 필요

    const newUser = new User({ email, role, name, authCode });
    await newUser.save();

    /*
    비밀번호 포함 회원가입 확장 고려
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    */

    return res.status(201).json({
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        authCode: newUser.authCode,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { authCode } = req.body;

  try {
    // 사용자 존재 여부 확인
    const user = await User.findOne({ authCode });
    if (!user) {
      return res.status(400).json({ message: 'Invalid authCode' });
    }

    /* 비밀번호 일치 확인 -> 추후 확장 고려
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid email or password' });
    */

    // JWT 발급
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // JWT를 HTTP-Only 쿠키로 설정
    const serialized = serialize('token', token, {
      httpOnly: true, // 클라이언트 JS에서 접근 불가
      secure: process.env.NODE_ENV === 'production', // HTTPS 환경에서만 동작
      sameSite: 'strict',
      maxAge: 60 * 60, // 1시간
      path: '/',
    });
    res.setHeader('Set-Cookie', serialized);
    res.status(200).json({ message: 'Login Success', user }); // TODO : authCode 는 보안상 위험으로 제거하기
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
