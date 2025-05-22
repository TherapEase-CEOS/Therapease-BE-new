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

    const clientWithUserInfo = clients.map((client) => {
      const userInfo = userMap.get(client.userId.toString()) || {};
      return {
        ...client,
        name: userInfo.name || '',
      };
    });

    res.status(200).json({ clients: clientWithUserInfo });
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
