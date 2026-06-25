'use client';
import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { getToday } from '@/lib/utils';

export function useNotifications() {
  const { todos, lifeLogs } = useStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  function notify(title: string, body: string, tag: string) {
    if (notifiedRef.current.has(tag)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body, tag, icon: '/favicon.ico' });
    notifiedRef.current.add(tag);
  }

  useEffect(() => {
    const today = getToday();

    const check = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      // Morning startup reminder at 8:30
      if (h === 8 && m === 30) {
        notify('ENE Focus', '공부 시작할 시간이에요! 오늘의 투두를 확인하세요.', `study-start-${today}`);
      }

      // Report closing notice at 1:30am (next day)
      if (h === 1 && m === 30) {
        notify('ENE Focus', '리포트 마감 30분 전입니다. 오늘 기록을 정리하세요.', `report-close-${today}`);
      }

      // Incomplete todos at 23:30
      if (h === 23 && m === 30) {
        const todayTodos = todos.filter((t) => t.date === today);
        const incomplete = todayTodos.filter((t) => t.status !== 'completed').length;
        if (incomplete > 0) {
          notify('ENE Focus', `아직 완료하지 못한 투두가 ${incomplete}개 있어요!`, `incomplete-${today}`);
        }
      }

      // Medicine reminders
      const todayLog = lifeLogs.find((l) => l.date === today);
      if (h === 8 && m === 0 && !todayLog?.medicineMorning) {
        notify('ENE Focus', '아침 약 복용 시간이에요.', `med-morning-${today}`);
      }
      if (h === 13 && m === 0 && !todayLog?.medicineLunch) {
        notify('ENE Focus', '점심 약 복용 시간이에요.', `med-lunch-${today}`);
      }
      if (h === 19 && m === 0 && !todayLog?.medicineEvening) {
        notify('ENE Focus', '저녁 약 복용 시간이에요.', `med-evening-${today}`);
      }
    };

    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [todos, lifeLogs]);

  return { requestPermission };
}
