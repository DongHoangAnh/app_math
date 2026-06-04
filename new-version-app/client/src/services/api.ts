/**
 * API Service - React Native
 * Handles all API calls to backend
 */

import axios from 'axios';
import { API_URL } from '../config';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API endpoints
export const gameShowAPI = {
  // Get user stats
  getUserStats: (userId: string) =>
    api.get(`/api/gameshow/stats/${userId}`),

  // Get leaderboard
  getLeaderboard: (limit: number = 10) =>
    api.get(`/api/gameshow/leaderboard?limit=${limit}`),

  // Save game result
  saveGameResult: (data: {
    userId: string;
    opponentId: string;
    roomId: string;
    playerScore: number;
    opponentScore: number;
    playerTime: number;
    opponentTime: number;
    isWinner: boolean;
  }) =>
    api.post('/api/gameshow/results', data),
};

export const userAPI = {
  // Get user profile
  getProfile: (userId: string) =>
    api.get(`/api/users/${userId}`),

  // Update user profile
  updateProfile: (userId: string, data: any) =>
    api.patch(`/api/users/${userId}`, data),
};

export const authAPI = {
  // Login with credentials
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  // Register new user
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    grade?: string;
  }) =>
    api.post('/api/auth/register', data),

  // Verify token
  verifyToken: () =>
    api.get('/api/auth/verify'),
};
