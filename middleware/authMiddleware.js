import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const cookies = req.headers.cookie;
  console.log('📦 Raw Cookies:', cookies);

  if (!cookies) {
    return res.status(401).json({ message: 'No cookies found' });
  }

  // 쿠키 파싱
  const parsedCookies = parse(cookies);
  const token = parsedCookies.token;

  console.log('🔐 Parsed token:', token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided in cookies' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Decoded JWT:', decoded);
    req.user = decoded; // req.user.userId, req.user.role 등 사용 가능
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
