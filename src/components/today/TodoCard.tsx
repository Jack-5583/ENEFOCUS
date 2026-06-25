'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, Check, ChevronRight, Clock, MoreHorizontal, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { subjectColorMap, formatDurationShort, generateId, statusLabels, todoTypeLabels } from '@/lib/utils';
import { CompleteTodoModal } from './CompleteTodoModal';
import type { Todo } from '@/lib/types';

interface Props {
  todo: Todo;
}

export function TodoCard({ todo }: Props) {
  const {
    subjects, activeSessionId, activeTodoId, timerStartedAt,
    setActiveTimer, addStudySession, updateStudySession,
    updateTodo, studySessions, deleteTodo,
  } = useStore();
  const [showComplete, setShowComplete] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const subject = subjects.find((s) => s.id === todo.subjectId);
  const colors = subject ? subjectColorMap[subject.color] : subjectColorMap.gray;
  const isActive = activeTodoId === todo.id;
  const isPaused = todo.status === 'paused';

  // Calculate total study time for this todo
  const todoSessions = studySessions.filter((s) => s.todoId === todo.id);
  const totalStudied = todoSessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);

  // Live timer
  useEffect(() => {
    if (!isActive || !timerStartedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - timerStartedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isActive, timerStartedAt]);

  function startStudy() {
    // Stop any existing active session
    if (activeSessionId) {
      updateStudySession(activeSessionId, {
        endedAt: new Date().toISOString(),
        durationSeconds: Math.floor((Date.now() - (timerStartedAt || Date.now())) / 1000),
      });
    }

    const sessionId = generateId();
    const now = Date.now();
    addStudySession({
      id: sessionId,
      userId: 'demo-user',
      todoId: todo.id,
      subjectId: todo.subjectId,
      startedAt: new Date(now).toISOString(),
      durationSeconds: 0,
      source: 'timer',
      isCamstudy: false,
    });
    setActiveTimer(sessionId, todo.id, now);
    updateTodo(todo.id, { status: 'in-progress' });
  }

  function pauseStudy() {
    if (!activeSessionId || !timerStartedAt) return;
    const dur = Math.floor((Date.now() - timerStartedAt) / 1000);
    updateStudySession(activeSessionId, {
      endedAt: new Date().toISOString(),
      durationSeconds: dur,
    });
    setActiveTimer(null, null, null);
    updateTodo(todo.id, { status: 'paused' });
  }

  function handleDelete() {
    if (window.confirm('이 투두를 삭제하시겠습니까?')) {
      deleteTodo(todo.id);
    }
  }

  const statusColor = {
    pending: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    'verification-pending': 'bg-orange-100 text-orange-700',
    completed: 'bg-black text-white',
    incomplete: 'bg-red-100 text-red-700',
    'carried-over': 'bg-purple-100 text-purple-700',
  };

  return (
    <>
      <div
        className={`relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all ${
          isActive ? 'ring-2 ring-black shadow-md' : ''
        } ${todo.status === 'completed' ? 'opacity-60' : ''}`}
      >
        {/* Subject color stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bg}`} />

        <div className="pl-4 pr-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {subject && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                    {subject.name}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[todo.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[todo.status]}
                </span>
                <span className="text-xs text-gray-400">{todoTypeLabels[todo.type]}</span>
              </div>

              <p className="font-semibold text-gray-900 truncate">{todo.title}</p>

              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                {todo.targetAmount && (
                  <span>목표: {todo.targetAmount}문제</span>
                )}
                {todo.estimatedMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {todo.estimatedMinutes}분
                  </span>
                )}
                {totalStudied > 0 && (
                  <span className="text-gray-600 font-medium">
                    {formatDurationShort(totalStudied)} 공부
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {todo.status !== 'completed' && (
                <>
                  {isActive ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-black text-white px-3 py-1.5 rounded-full text-sm font-mono font-bold min-w-[80px] text-center">
                        {formatDurationShort(elapsed)}
                      </div>
                      <button
                        onClick={pauseStudy}
                        className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded-full transition-colors"
                      >
                        <Pause size={16} className="text-yellow-700" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startStudy}
                      className={`p-2 ${colors.bg} rounded-full hover:opacity-80 transition-opacity`}
                    >
                      <Play size={16} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowComplete(true)}
                    className="p-2 bg-black hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <Check size={16} className="text-white" />
                  </button>
                </>
              )}
              {todo.status === 'completed' && (
                <div className="p-2 bg-black rounded-full">
                  <Check size={16} className="text-white" />
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreHorizontal size={16} className="text-gray-400" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[120px] py-1">
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                      onClick={() => { setShowMenu(false); handleDelete(); }}
                    >
                      <Trash2 size={14} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompleteTodoModal
        todo={todo}
        open={showComplete}
        onClose={() => setShowComplete(false)}
      />
    </>
  );
}
