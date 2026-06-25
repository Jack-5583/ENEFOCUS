'use client';
import { useMemo } from 'react';
import { Video } from 'lucide-react';
import { useStore } from '@/lib/store';
import { subjectColorHex, getToday, formatTime } from '@/lib/utils';
import type { SubjectColor } from '@/lib/types';

interface TimeBlock {
  id: string;
  label: string;
  startTime: Date;
  endTime: Date;
  color: string;
  isCamstudy?: boolean;
  subjectColor?: SubjectColor;
}

export function DayTimeline() {
  const { studySessions, subjects, zoomSessions, lifeLogs } = useStore();
  const today = getToday();

  // Day range: 06:00 ~ 02:00+1
  const rangeStart = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(y, m - 1, d, 6, 0, 0);
  }, [today]);
  const rangeEnd = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(y, m - 1, d + 1, 2, 0, 0);
  }, [today]);

  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  const blocks: TimeBlock[] = useMemo(() => {
    const result: TimeBlock[] = [];
    const todaySessions = studySessions.filter((s) => {
      if (!s.startedAt) return false;
      const d = new Date(s.startedAt);
      const dateKey = d.getHours() < 2
        ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
        : d.toISOString().split('T')[0];
      return dateKey === today;
    });

    todaySessions.forEach((s) => {
      const start = new Date(s.startedAt);
      const end = s.endedAt ? new Date(s.endedAt) : new Date();
      const subject = subjects.find((sub) => sub.id === s.subjectId);
      const color = subject ? subjectColorHex[subject.color] : '#9ca3af';
      result.push({
        id: s.id,
        label: subject ? subject.name : '공부',
        startTime: start,
        endTime: end,
        color,
        isCamstudy: s.isCamstudy,
        subjectColor: subject?.color,
      });
    });

    return result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [studySessions, subjects, today]);

  // Hour labels
  const hours = [];
  for (let h = 6; h <= 26; h++) {
    const displayH = h >= 24 ? h - 24 : h;
    hours.push(displayH);
  }

  function getLeftPercent(time: Date): number {
    return Math.max(0, Math.min(100, ((time.getTime() - rangeStart.getTime()) / totalMs) * 100));
  }
  function getWidthPercent(start: Date, end: Date): number {
    const width = ((end.getTime() - start.getTime()) / totalMs) * 100;
    return Math.max(0.5, Math.min(100, width));
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-4">하루 타임라인</h3>

      {/* Hour markers */}
      <div className="relative mb-2">
        <div className="flex">
          {Array.from({ length: 21 }, (_, i) => {
            const h = 6 + i;
            const displayH = h >= 24 ? h - 24 : h;
            if (i % 2 !== 0) return null;
            return (
              <div
                key={i}
                className="flex-1 text-xs text-gray-400 text-left"
                style={{ flexBasis: `${100 / 20}%` }}
              >
                {displayH < 10 ? `0${displayH}` : displayH}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative h-12 bg-gray-100 rounded-xl overflow-hidden mb-4">
        {/* Current time indicator */}
        {(() => {
          const now = new Date();
          if (now >= rangeStart && now <= rangeEnd) {
            const left = getLeftPercent(now);
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black z-20"
                style={{ left: `${left}%` }}
              >
                <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-black rounded-full" />
              </div>
            );
          }
        })()}

        {/* Study blocks */}
        {blocks.map((block) => {
          const left = getLeftPercent(block.startTime);
          const width = getWidthPercent(block.startTime, block.endTime);
          return (
            <div
              key={block.id}
              className="absolute top-1 bottom-1 rounded-lg flex items-center overflow-hidden group"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: block.color,
                boxShadow: block.isCamstudy ? `0 0 0 2px #eab308, 0 0 8px ${block.color}` : undefined,
              }}
              title={`${block.label} ${formatTime(block.startTime.toISOString())} - ${formatTime(block.endTime.toISOString())}`}
            >
              {block.isCamstudy && (
                <Video size={10} className="text-white ml-1 shrink-0" />
              )}
              {width > 5 && (
                <span className="text-white text-[9px] font-bold truncate px-1">{block.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {blocks.length > 0 && (
        <div className="space-y-1">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center gap-2 text-xs text-gray-600">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: block.color,
                  boxShadow: block.isCamstudy ? '0 0 0 1.5px #eab308' : undefined,
                }}
              />
              {block.isCamstudy && <Video size={10} className="text-yellow-500 shrink-0" />}
              <span>{formatTime(block.startTime.toISOString())}</span>
              <span className="text-gray-300">-</span>
              <span>{formatTime(block.endTime.toISOString())}</span>
              <span className="font-medium text-gray-800">{block.label}</span>
              {block.isCamstudy && (
                <span className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold">캠</span>
              )}
            </div>
          ))}
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          아직 공부 기록이 없습니다.<br />
          투두를 선택하고 공부를 시작하세요!
        </div>
      )}
    </div>
  );
}
