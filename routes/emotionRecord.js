import express from 'express';
import EmotionRecord from '../models/EmotionRecord.js';
import Client from '../models/Client.js';

const router = express.Router();

// POST /emotion-records
router.post('/', async (req, res) => {
  try {
    const { date, answer1, answer2, answer3, emotions } = req.body;

    const userId = req.user.userId;
    console.log(userId);

    // userId로 counselee 문서 조회
    const client = await Client.findOne({ userId });
    if (!client) {
      return res.status(404).json({ message: 'Client profile not found.' });
    }
    const clientId = client._id;

    // 날짜 중복 체크 (clientId + date)
    const existing = await EmotionRecord.findOne({
      clientId,
      date: new Date(date),
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: 'Emotion record for this date already exists.' });
    }

    // 유효성 검사 (이미 Mongoose 스키마에서도 validation 적용됨)
    if (!emotions || emotions.length < 1 || emotions.length > 3) {
      return res.status(400).json({ message: 'Must provide 1 to 3 emotions.' });
    }

    const newRecord = new EmotionRecord({
      clientId,
      date,
      answer1,
      answer2,
      answer3,
      emotions,
    });

    await newRecord.save();

    res.status(201).json({
      message: 'Emotion record saved successfully.',
      recordId: newRecord._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
