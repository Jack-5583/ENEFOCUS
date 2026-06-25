'use client';
import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { generateId, getToday } from '@/lib/utils';
import type { DailyReport } from '@/lib/types';

export function useDailyReport() {
  const { studySessions, todos, todoRecords, lifeLogs, dailyReports, addDailyReport } = useStore() as any;

  const generateReport = useCallback((dateStr: string): DailyReport => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const rangeStart = new Date(y, m - 1, d, 2, 0, 0);
    const rangeEnd = new Date(y, m - 1, d + 1, 1, 59, 59);

    const sessions = studySessions.filter((s: any) => {
      const start = new Date(s.startedAt);
      return start >= rangeStart && start <= rangeEnd;
    });

    const dateTodos = todos.filter((t: any) => t.date === dateStr);
    const completedTodos = dateTodos.filter((t: any) => t.status === 'completed');
    const totalStudy = sessions.reduce((a: number, s: any) => a + s.durationSeconds, 0);
    const camStudy = sessions.filter((s: any) => s.isCamstudy).reduce((a: number, s: any) => a + s.durationSeconds, 0);

    const shareId = `${dateStr}-${generateId()}`;

    const report: DailyReport = {
      id: generateId(),
      userId: 'demo-user',
      reportDate: dateStr,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalStudySeconds: totalStudy,
      camstudySeconds: camStudy,
      completedTodosCount: completedTodos.length,
      totalTodosCount: dateTodos.length,
      publicShareId: shareId,
      visibility: 'private',
      createdAt: new Date().toISOString(),
    };
    return report;
  }, [studySessions, todos, todoRecords]);

  // Check if 2am has passed and generate report for yesterday
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour === 2 && minute < 5) {
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      const alreadyGenerated = (dailyReports || []).some((r: DailyReport) => r.reportDate === yesterday);
      if (!alreadyGenerated && addDailyReport) {
        const report = generateReport(yesterday);
        addDailyReport(report);
      }
    }
  }, [generateReport, dailyReports, addDailyReport]);

  return { generateReport };
}
