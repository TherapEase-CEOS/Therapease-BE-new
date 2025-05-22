import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Counselor from '../models/Counselor.js';
import { validateEmail, validateRole } from '../utils/validators.js';
import { Roles } from '../constants/constant.js';

const router = express.Router();

function generateAuthCode(user) {
  const initials = user.role == Roles.COUNSELEE ? 'CE' : 'CR';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6글자 랜덤
  return `${initials}-${randomPart}`; // ex. 'CE-X7P9Q2'
}

// 유저 등록 (Register)
// 최초 내담자를 만드려면 반드시 연관된 상담사 id를 채워줘야하는데 요청 정보에 상담사 id 가 들어있어야 맵핑 정보 생성이 가능함.
// 그러면 1. 상담사는 DB 자체적으로 우리가 등록해주고, 2. 내담자 등록은 내담자 목록에서 추가해서 프로필 생성하거나, 반드시 상담사 계정으로만 요청보내도록?
// => 그냥 counselorId required 제한을 풀고, 이거는 유저만 등록하는 API 로 쓰고 나중에 연결하는건 내담자 추가 기능으로.
// => 내담자 등록 할 때에는 counserlorId 를 같이 보내도록 하기.
router.post('/register', async (req, res) => {
  const user = req.body;
  const { email, name, role, counserlorId } = user;

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

    //  역할에 따라 연결된 엔티티 생성
    if (role === Roles.COUNSELEE) {
      const client = new Client({ userId: newUser._id, counserlorId });
      await client.save();
    } else if (role === Roles.COUNSELOR) {
      const counselor = new Counselor({ userId: newUser._id });
      await counselor.save();

      // ✨ 타임테이블 초기화 (15칸짜리 false 배열로 모든 요일)
      const emptyDay = Array(15).fill(false);
      const weeklySchedule = {
        sunday: [...emptyDay],
        monday: [...emptyDay],
        tuesday: [...emptyDay],
        wednesday: [...emptyDay],
        thursday: [...emptyDay],
        friday: [...emptyDay],
        saturday: [...emptyDay],
      };

      const timeTable = new AvailableTime({
        counselorId: counselor._id,
        timetable: { ...weeklySchedule },
      });

      await timeTable.save();
    }

    return res.status(201).json({
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        authCode: newUser.authCode,
      },
    });
    /*
    비밀번호 포함 회원가입 확장 고려
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    */
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { authCode } = req.body;

  try {
    // [1] 사용자 존재 여부 확인
    const user = await User.findOne({ authCode });
    if (!user) {
      return res.status(400).json({ message: 'Invalid authCode' });
    }

    // [2] 역할에 따라 관련 정보 조회
    let profileId = null;
    let linkedCounselorId = null;

    if (user.role === 'client') {
      const client = await Client.findOne({ userId: user._id });
      if (!client) {
        return res.status(404).json({ message: 'Client profile not found' });
      }
      profileId = client._id;
      linkedCounselorId = client.counselorId; // 연동된 상담사 ID 추가
    } else if (user.role === 'counselor') {
      const counselor = await Counselor.findOne({ userId: user._id });
      if (!counselor) {
        return res.status(404).json({ message: 'Counselor profile not found' });
      }
      profileId = counselor._id;
    }
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
    res.status(200).json({
      message: 'Login Success',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        authCode: user.authCode, // TODO : authCode 는 보안상 위험으로 제거하기
        clientId: user.role === Roles.COUNSELEE ? profileId : null,
        counselorId:
          user.role === Roles.COUNSELOR ? profileId : linkedCounselorId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
