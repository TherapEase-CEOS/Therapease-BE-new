import express from 'express';
import EmotionRecord from '../models/EmotionRecord.js';
import Client from '../models/Client.js';
import dayjs from 'dayjs';

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

// GET /emotion-records/:clientId?page=1&limit=7
router.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page) || 7;

    const today = dayjs().startOf('day');
    const sevenDaysAgo = today.subtract(6, 'day'); // 최근 7일 기준 시작점

    // [1] 최근 7일 날짜 배열 생성
    const recentDates = Array.from({ length: 7 }, (_, i) =>
      today.subtract(i, 'day').toDate()
    );

    // [2] 최근 7일간 감정기록 조회
    const recentRecords = await EmotionRecord.find({
      clientId,
      date: { $gte: sevenDaysAgo.toDate(), $lte: today.toDate() },
    }).lean();

    const recentMap = new Map(
      recentRecords.map((record) => [
        dayjs(record.date).format('YYYY-MM-DD'),
        record,
      ])
    );

    const recentResult = recentDates.map((date) => {
      const key = dayjs(date).format('YYYY-MM-DD');
      return {
        date: key,
        record: recentMap.get(key) || null,
      };
    });

    // [3] 8일 전 감정기록 중 실제로 존재하는 것만 조회 (페이징)

    const skipCount = (page - 1) * limit;
    const oldRecords = await EmotionRecord.find({
      clientId,
      date: { $lt: sevenDaysAgo.toDate() },
    })
      .sort({ date: -1 }) // 최신순
      .skip(skipCount)
      .limit(page === 1 ? limit - 7 : limit)
      .lean();

    const formattedOld = oldRecords.map((record) => ({
      date: dayjs(record.date).format('YYYY-MM-DD'),
      record,
    }));

    // [4] 첫 페이지에는 최근 7일 포함, 이후에는 오래된 기록만 포함
    const responseRecords =
      page === 1 ? [...recentResult, formattedOld] : formattedOld;

    res.status(200).json({
      clientId,
      page,
      limit,
      records: responseRecords,
    });
  } catch (err) {
    console.error('❌ Error fetching emotion history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
