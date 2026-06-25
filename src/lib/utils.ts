import { type SubjectColor } from './types';

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export function getToday(): string {
  const now = new Date();
  // If before 2am, it's still "yesterday"
  if (now.getHours() < 2) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

export function getDayRange(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, 2, 0, 0);
  const end = new Date(year, month - 1, day + 1, 1, 59, 59);
  return { start, end };
}

export const subjectColorMap: Record<SubjectColor, { bg: string; text: string; border: string; light: string }> = {
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    light: 'bg-red-50',
  },
  blue: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    light: 'bg-blue-50',
  },
  purple: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-600',
    light: 'bg-purple-50',
  },
  green: {
    bg: 'bg-green-600',
    text: 'text-green-600',
    border: 'border-green-600',
    light: 'bg-green-50',
  },
  navy: {
    bg: 'bg-indigo-800',
    text: 'text-indigo-800',
    border: 'border-indigo-800',
    light: 'bg-indigo-50',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    border: 'border-orange-500',
    light: 'bg-orange-50',
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    border: 'border-sky-500',
    light: 'bg-sky-50',
  },
  gray: {
    bg: 'bg-gray-400',
    text: 'text-gray-600',
    border: 'border-gray-400',
    light: 'bg-gray-50',
  },
  gold: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    border: 'border-yellow-500',
    light: 'bg-yellow-50',
  },
};

export const subjectColorHex: Record<SubjectColor, string> = {
  red: '#ef4444',
  blue: '#2563eb',
  purple: '#9333ea',
  green: '#16a34a',
  navy: '#3730a3',
  orange: '#f97316',
  sky: '#0ea5e9',
  gray: '#9ca3af',
  gold: '#eab308',
};

export const todoTypeLabels: Record<string, string> = {
  'problem-solving': '문제풀이',
  'exam': '시험',
  'concept': '개념공부',
  'review': '복습',
  'memorization': '암기',
  'reading': '독서',
  'life': '생활',
};

export const statusLabels: Record<string, string> = {
  'pending': '예정',
  'in-progress': '진행 중',
  'paused': '일시정지',
  'verification-pending': '인증 대기',
  'completed': '완료',
  'incomplete': '미완료',
  'carried-over': '이월',
};

export function getTimelinePosition(time: Date, rangeStart: Date, rangeEnd: Date): number {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  const elapsed = time.getTime() - rangeStart.getTime();
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function calculateStudyStats(sessions: import('./types').StudySession[]) {
  const total = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const camstudy = sessions.filter((s) => s.isCamstudy).reduce((acc, s) => acc + s.durationSeconds, 0);
  return { totalSeconds: total, camstudySeconds: camstudy };
}
