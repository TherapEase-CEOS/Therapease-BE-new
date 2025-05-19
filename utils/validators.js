import { Roles } from '../constants/constant.js';
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRole = (role) => {
  if (role == Roles.COUNSELEE || role == Roles.COUNSELOR) {
    return true;
  }
  return false;
};

export const validatePassword = (password) => {
  // 최소 8자, 하나 이상의 문자 및 숫자 포함
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
};
