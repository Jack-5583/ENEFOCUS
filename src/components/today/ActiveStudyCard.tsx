'use client';
import { useEffect, useState } from 'react';
import { Pause, Check, Video } from 'lucide-react';
import { useStore } from '@/lib/store';
import { subjectColorMap, formatDurationShort } from '@/lib/utils';
import { CompleteTodoModal } from './CompleteTodoModal';

export function ActiveStudyCard() {
  const { activeTodoId, timerStartedAt, todos, subjects, activeSessionId,
    updateStudySession, setActiveTimer, updateTodo, activeZoomSession } = useStore();
  const [elapsed, setElapsed] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const todo = todos.find((t) => t.id === activeTodoId);
  const subject = todo ? subjects.find((s) => s.id === todo.subjectId) : null;
  const colors = subject ? subjectColorMap[subject.color] : subjectColorMap.gray;

  useEffect(() => {
    if (!timerStartedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - timerStartedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timerStartedAt]);

  if (!todo || !activeTodoId) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
        <p className="text-gray-400 text-sm">투두 카드에서 ▶ 버튼을 눌러 공부를 시작하세요</p>
      </div>
    );
  }

  function pauseStudy() {
    if (!activeSessionId || !timerStartedAt) return;
    const dur = Math.floor((Date.now() - timerStartedAt) / 1000);
    updateStudySession(activeSessionId, {
      endedAt: new Date().toISOString(),
      durationSeconds: dur,
    });
    setActiveTimer(null, null, null);
    updateTodo(activeTodoId!, { status: 'paused' });
  }

  return (
    <>
      <div className={`rounded-2xl p-5 ${colors.bg} text-white relative overflow-hidden`}>
        {activeZoomSession && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <Video size={12} />
            <span className="text-xs font-bold">캠스터디 중</span>
          </div>
        )}

        <div className="mb-1">
          <span className="text-white/70 text-xs uppercase tracking-wider font-bold">현재 공부 중</span>
        </div>
        <h3 className="font-bold text-lg mb-1">{todo.title}</h3>
        {subject && <p className="text-white/80 text-sm mb-4">{subject.name}</p>}

        <div className="text-4xl font-black font-mono mb-4 tabular-nums">
          {formatDurationShort(elapsed)}
        </div>

        <div className="flex gap-2">
          <button
            onClick={pauseStudy}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 text-sm font-medium transition-colors"
          >
            <Pause size={16} />
            일시정지
          </button>
          <button
            onClick={() => setShowComplete(true)}
            className="flex items-center gap-2 bg-white text-gray-900 hover:bg-white/90 rounded-full px-4 py-2 text-sm font-medium transition-colors"
          >
            <Check size={16} />
            완료하기
          </button>
        </div>
      </div>

      {todo && (
        <CompleteTodoModal
          todo={todo}
          open={showComplete}
          onClose={() => setShowComplete(false)}
        />
      )}
    </>
  );
}
