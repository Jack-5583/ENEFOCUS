'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDurationShort, formatDuration, generateId, subjectColorMap, getToday } from '@/lib/utils';

type Mode = 'normal' | 'pomodoro' | 'goal';

export function TimerView() {
  const { subjects, todos, activeSessionId, activeTodoId, timerStartedAt,
    setActiveTimer, addStudySession, updateStudySession, updateTodo, studySessions } = useStore();
  const [mode, setMode] = useState<Mode>('normal');
  const [elapsed, setElapsed] = useState(0);
  const [selectedTodoId, setSelectedTodoId] = useState('');
  const [goalMinutes, setGoalMinutes] = useState(90);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const today = getToday();
  const todayTodos = todos.filter((t) => t.date === today && t.status !== 'completed');
  const isRunning = !!activeTodoId && !!timerStartedAt;

  useEffect(() => {
    if (!timerStartedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - timerStartedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timerStartedAt]);

  // Pomodoro auto-switch
  useEffect(() => {
    if (mode !== 'pomodoro' || !isRunning) return;
    const workSec = 25 * 60;
    const breakSec = 5 * 60;
    const limit = pomodoroPhase === 'work' ? workSec : breakSec;
    if (elapsed >= limit) {
      if (pomodoroPhase === 'work') {
        setPomodoroPhase('break');
        setPomodoroCount((c) => c + 1);
      } else {
        setPomodoroPhase('work');
      }
    }
  }, [elapsed, mode, isRunning, pomodoroPhase]);

  function startTimer() {
    const todoId = selectedTodoId || (todayTodos[0]?.id || '');
    if (!todoId) return;
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    if (activeSessionId) {
      updateStudySession(activeSessionId, {
        endedAt: new Date().toISOString(),
        durationSeconds: elapsed,
      });
    }

    const sessionId = generateId();
    const now = Date.now();
    addStudySession({
      id: sessionId,
      userId: 'demo-user',
      todoId,
      subjectId: todo.subjectId,
      startedAt: new Date(now).toISOString(),
      durationSeconds: 0,
      source: 'timer',
      isCamstudy: false,
    });
    setActiveTimer(sessionId, todoId, now);
    updateTodo(todoId, { status: 'in-progress' });
  }

  function pauseTimer() {
    if (!activeSessionId || !timerStartedAt) return;
    const dur = Math.floor((Date.now() - timerStartedAt) / 1000);
    updateStudySession(activeSessionId, {
      endedAt: new Date().toISOString(),
      durationSeconds: dur,
    });
    setActiveTimer(null, null, null);
    if (activeTodoId) updateTodo(activeTodoId, { status: 'paused' });
  }

  function resetTimer() {
    pauseTimer();
    setElapsed(0);
    setPomodoroPhase('work');
    setPomodoroCount(0);
  }

  const activeTodo = todos.find((t) => t.id === (activeTodoId || selectedTodoId));
  const activeSubject = activeTodo ? subjects.find((s) => s.id === activeTodo.subjectId) : null;
  const colors = activeSubject ? subjectColorMap[activeSubject.color] : subjectColorMap.blue;

  // Today's study stats per subject
  const todaySessions = studySessions.filter((s) => {
    if (!s.startedAt) return false;
    const d = new Date(s.startedAt);
    const dk = d.getHours() < 2
      ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
    return dk === today;
  });

  const subjectStats = subjects.map((sub) => {
    const sec = todaySessions.filter((s) => s.subjectId === sub.id).reduce((a, s) => a + s.durationSeconds, 0);
    return { ...sub, seconds: sec };
  }).filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds);

  const pomodoroWorkSec = 25 * 60;
  const pomodoroBreakSec = 5 * 60;
  const pomodoroLimit = pomodoroPhase === 'work' ? pomodoroWorkSec : pomodoroBreakSec;
  const pomodoroProgress = mode === 'pomodoro' ? Math.min(100, (elapsed / pomodoroLimit) * 100) : 0;
  const goalProgress = mode === 'goal' ? Math.min(100, (elapsed / (goalMinutes * 60)) * 100) : 0;

  const circumference = 2 * Math.PI * 80;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Mode selector */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 mb-8">
        {(['normal', 'pomodoro', 'goal'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === m ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
            onClick={() => { setMode(m); resetTimer(); }}
          >
            {m === 'normal' ? '일반' : m === 'pomodoro' ? '포모도로' : '목표시간'}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="80" fill="none" stroke="#f3f3f3" strokeWidth="8" />
            {(mode === 'pomodoro' || mode === 'goal') && (
              <circle
                cx="90" cy="90" r="80"
                fill="none"
                stroke={pomodoroPhase === 'break' ? '#22c55e' : '#000'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * (mode === 'pomodoro' ? pomodoroProgress : goalProgress)) / 100}
                className="transition-all duration-1000"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {mode === 'pomodoro' && (
              <div className={`text-xs font-bold mb-1 px-2 py-0.5 rounded-full ${
                pomodoroPhase === 'work' ? 'bg-black text-white' : 'bg-green-500 text-white'
              }`}>
                {pomodoroPhase === 'work' ? '집중' : '휴식'} #{pomodoroCount + 1}
              </div>
            )}
            <div className="text-4xl font-black font-mono tabular-nums">
              {formatDurationShort(mode === 'pomodoro' ? Math.max(0, pomodoroLimit - elapsed) : elapsed)}
            </div>
            {activeTodo && (
              <p className="text-xs text-gray-500 mt-1 text-center px-4">{activeTodo.title}</p>
            )}
          </div>
        </div>
      </div>

      {/* Todo selector */}
      {!isRunning && (
        <div className="mb-6">
          <select
            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-900 outline-none"
            value={selectedTodoId || activeTodoId || ''}
            onChange={(e) => setSelectedTodoId(e.target.value)}
          >
            <option value="">투두 선택 (선택 안 하면 첫 번째 항목)</option>
            {todayTodos.map((t) => {
              const sub = subjects.find((s) => s.id === t.subjectId);
              return (
                <option key={t.id} value={t.id}>
                  [{sub?.name || ''}] {t.title}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Goal time input */}
      {mode === 'goal' && !isRunning && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">목표 시간</label>
          <input
            type="number"
            min="10"
            max="480"
            value={goalMinutes}
            onChange={(e) => setGoalMinutes(Number(e.target.value))}
            className="w-24 px-3 py-2 bg-gray-100 rounded-xl text-center font-bold text-gray-900 outline-none"
          />
          <span className="text-sm text-gray-500">분</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={resetTimer}
          className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <RotateCcw size={20} className="text-gray-600" />
        </button>
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          disabled={!isRunning && todayTodos.length === 0}
          className={`px-10 py-4 rounded-full font-bold text-lg transition-all ${
            isRunning
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
              : 'bg-black hover:bg-gray-800 text-white'
          } disabled:opacity-40`}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      {/* Subject stats */}
      {subjectStats.length > 0 && (
        <div className="mt-10">
          <h3 className="font-bold text-gray-900 mb-4">오늘 과목별 통계</h3>
          <div className="space-y-2">
            {subjectStats.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 shrink-0">{s.name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(s.seconds / Math.max(...subjectStats.map((x) => x.seconds))) * 100}%`,
                      backgroundColor: subjectColorMap[s.color].bg.replace('bg-', ''),
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">
                  {formatDuration(s.seconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
