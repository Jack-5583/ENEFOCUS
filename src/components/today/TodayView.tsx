'use client';
import { useState } from 'react';
import { Plus, Sun } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getToday, formatDate, formatDuration, subjectColorHex } from '@/lib/utils';
import { TodoCard } from './TodoCard';
import { AddTodoModal } from './AddTodoModal';
import { ActiveStudyCard } from './ActiveStudyCard';
import { DayTimeline } from './DayTimeline';

export function TodayView() {
  const { todos, subjects, studySessions, lifeLogs } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const today = getToday();

  const todayTodos = todos.filter((t) => t.date === today);
  const completedCount = todayTodos.filter((t) => t.status === 'completed').length;

  const todaySessions = studySessions.filter((s) => {
    if (!s.startedAt) return false;
    const d = new Date(s.startedAt);
    const dateKey = d.getHours() < 2
      ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
    return dateKey === today;
  });

  const totalStudied = todaySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const camStudied = todaySessions.filter((s) => s.isCamstudy).reduce((a, s) => a + (s.durationSeconds || 0), 0);

  // Subject breakdown
  const subjectBreakdown = subjects.map((sub) => {
    const sec = todaySessions
      .filter((s) => s.subjectId === sub.id)
      .reduce((a, s) => a + (s.durationSeconds || 0), 0);
    return { ...sub, seconds: sec };
  }).filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds);

  const todayLog = lifeLogs.find((l) => l.date === today);

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Day summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">총 공부시간</p>
          <p className="text-2xl font-black">{formatDuration(totalStudied)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">캠스터디</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <p className="text-2xl font-black text-gray-900">{formatDuration(camStudied)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">완료한 항목</p>
          <p className="text-2xl font-black text-gray-900">
            {completedCount}<span className="text-gray-400 text-lg"> / {todayTodos.length}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">수면</p>
          {todayLog?.wakeTime && todayLog?.sleepTime ? (
            <p className="text-xl font-black text-gray-900">
              {todayLog.wakeTime} 기상
            </p>
          ) : (
            <p className="text-gray-400 text-sm">기록 없음</p>
          )}
        </div>
      </div>

      {/* Subject breakdown bar */}
      {subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">과목별 공부시간</h3>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
            {subjectBreakdown.map((s) => (
              <div
                key={s.id}
                className="h-full transition-all"
                style={{
                  width: `${(s.seconds / totalStudied) * 100}%`,
                  backgroundColor: subjectColorHex[s.color],
                }}
                title={`${s.name}: ${formatDuration(s.seconds)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {subjectBreakdown.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColorHex[s.color] }} />
                <span className="text-gray-600">{s.name}</span>
                <span className="font-bold text-gray-900">{formatDuration(s.seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Todo list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">오늘의 투두</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-black text-white px-3 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              추가
            </button>
          </div>

          {todayTodos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Sun size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">오늘의 투두가 없습니다</p>
              <p className="text-sm mt-1">+ 추가 버튼으로 시작하세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending/in-progress todos first */}
              {todayTodos
                .filter((t) => t.status !== 'completed')
                .map((todo) => (
                  <TodoCard key={todo.id} todo={todo} />
                ))}
              {/* Completed todos */}
              {todayTodos.filter((t) => t.status === 'completed').length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">완료됨 ({todayTodos.filter((t) => t.status === 'completed').length})</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {todayTodos
                    .filter((t) => t.status === 'completed')
                    .map((todo) => (
                      <TodoCard key={todo.id} todo={todo} />
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Active study + timeline */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-3">현재 공부 중</h2>
            <ActiveStudyCard />
          </div>
          <DayTimeline />
        </div>
      </div>

      <AddTodoModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
