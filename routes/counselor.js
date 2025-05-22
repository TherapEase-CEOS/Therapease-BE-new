// routes/counselor.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Counselor from '../models/Counselor.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import AvailableTime from '../models/AvailableTime.js';

const router = express.Router();

// GET /api/counselor/clients -> 내담자 목록 조회
router.get('/clients', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. userId → counselorId 찾기
    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    // 2. 해당 counselorId 와 연결된 client 목록 조회
    const clients = await Client.find({ counselorId: counselor._id }).lean();

    // 3. 각 client의 user 정보 조인 (name, email 등)
    const clientUserIds = clients.map((c) => c.userId);
    const users = await User.find({ _id: { $in: clientUserIds } }).lean();

    // 4. 매칭
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 5. 필요한 필드만 추출
    const formattedClients = clients.map((client) => ({
      counselorId: client.counselorId?.toString(),
      name: userMap.get(client.userId.toString()).name || '',
      status: client.status,
      createdAt: client.createdAt,
      goal: client.goal,
      weeklySchedule: client.weeklySchedule ?? [],
    }));

    res.status(200).json({ clients: formattedClients });
  } catch (err) {
    console.error('❌ Failed to fetch client list:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * [GET] 상담사 프로필 조회
 * GET /counselor/:id/profile
 */
router.get('/:counselorId/profile', async (req, res) => {
  try {
    const { counselorId } = req.params;

    const counselor = await Counselor.findById(counselorId)
      .populate('userId', 'name') // name 가져오기
      .lean();

    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    const profile = {
      name: counselor.userId?.name || '',
      contact: counselor.contact || '',
      introText: counselor.introText || '',
    };

    res.status(200).json(profile);
  } catch (error) {
    console.error('❌ Error fetching counselor profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// [POST] 새로운 타임테이블 생성
router.post('/:counselorId/timetable', async (req, res) => {
  try {
    const { counselorId } = req.params;

    const exists = await AvailableTime.findOne({ counselorId });
    if (exists) {
      return res
        .status(400)
        .json({ message: 'Schedule already exists for this counselor.' });
    }
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

    const newSchedule = new AvailableTime({
      counselorId,
      timetable: { ...weeklySchedule },
    });
    await newSchedule.save();

    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * [GET] 상담사 타임테이블 조회
 * GET /counselors/:id/timetable
 */
router.get('/:counselorId/timetable', async (req, res) => {
  try {
    const { counselorId } = req.params;

    const availableTime = await AvailableTime.findOne({ counselorId }).lean();

    if (!availableTime) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    res.status(200).json(availableTime.timetable); // timetable만 응답
  } catch (error) {
    console.error('❌ Error fetching timetable:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 상담사 정보 (일정표 + 프로필) 조회
// GET /:counselorId
router.get('/:counselorId/full', async (req, res) => {
  try {
    const { counselorId } = req.params;

    const availableTime = await AvailableTime.findOne({ counselorId }).lean();
    if (!availableTime) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const counselor = await Counselor.findById(counselorId)
      .populate('userId', 'name')
      .lean();

    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    const response = {
      timetable: availableTime.timetable,
      counselorProfile: {
        name: counselor.userId?.name || '',
        contact: counselor.contact || '',
        introText: counselor.introText || '',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching counselor info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

/**
 * [PUT] 상담사 정보(일정표+프로필) 업데이트
 */

router.put('/:counselorId/full', async (req, res) => {
  try {
    const { counselorId } = req.params;
    const { timetable, counselorProfile } = req.body;

    // 유효성 검사: 요일 배열
    const weekDays = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const valid = weekDays.every(
      (day) => Array.isArray(timetable?.[day]) && timetable[day].length === 15
    );

    if (!valid) {
      return res.status(400).json({
        message: 'Each weekday must be an array of 15 boolean values.',
      });
    }

    // 타임테이블 업데이트
    const timeResult = await AvailableTime.findOneAndUpdate(
      { counselorId },
      { $set: { timetable } },
      { new: true }
    );

    // 상담사 소개 및 연락처 업데이트
    const profileResult = await Counselor.findByIdAndUpdate(
      counselorId,
      {
        $set: {
          contact: counselorProfile.contact,
          introText: counselorProfile.introText,
        },
      },
      { new: true }
    ).populate('userId', 'name');

    if (!timeResult || !profileResult) {
      return res
        .status(404)
        .json({ message: 'Counselor or timetable not found.' });
    }

    const response = {
      timetable: timeResult.timetable,
      counselorProfile: {
        name: profileResult.userId?.name || '',
        contact: profileResult.contact || '',
        introText: profileResult.introText || '',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating counselor info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
