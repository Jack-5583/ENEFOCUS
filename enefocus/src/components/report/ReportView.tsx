'use client';
import { useState, useMemo } from 'react';
import { Share2, Copy, BarChart3, CheckCircle, Video, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDuration, getToday, subjectColorHex, subjectColorMap, todoTypeLabels } from '@/lib/utils';

export function ReportView() {
  const { todos, studySessions, subjects, todoRecords, proofPhotos, lifeLogs, zoomSessions, user } = useStore();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [shareVis, setShareVis] = useState<'private' | 'link'>('link');
  const [shareOptions, setShareOptions] = useState({
    includePhotos: true,
    includeScores: true,
    includeLife: true,
    includeMemo: true,
  });
  const [copied, setCopied] = useState(false);

  const todaySessions = useMemo(() => studySessions.filter((s) => {
    if (!s.startedAt) return false;
    const d = new Date(s.startedAt);
    const dk = d.getHours() < 2
      ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
    return dk === selectedDate;
  }), [studySessions, selectedDate]);

  const todayTodos = useMemo(() => todos.filter((t) => t.date === selectedDate), [todos, selectedDate]);
  const completedTodos = useMemo(() => todayTodos.filter((t) => t.status === 'completed'), [todayTodos]);
  const incompleteTodos = useMemo(() => todayTodos.filter((t) => t.status !== 'completed'), [todayTodos]);

  const totalStudied = todaySessions.reduce((a, s) => a + s.durationSeconds, 0);
  const camStudied = todaySessions.filter((s) => s.isCamstudy).reduce((a, s) => a + s.durationSeconds, 0);

  const subjectBreakdown = useMemo(() => subjects.map((sub) => {
    const sec = todaySessions.filter((s) => s.subjectId === sub.id).reduce((a, s) => a + s.durationSeconds, 0);
    return { ...sub, seconds: sec };
  }).filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds), [subjects, todaySessions]);

  const todayRecords = useMemo(() => {
    return todoRecords.filter((r) => {
      const todo = todos.find((t) => t.id === r.todoId);
      return todo?.date === selectedDate;
    });
  }, [todoRecords, todos, selectedDate]);

  const todayLog = lifeLogs.find((l) => l.date === selectedDate);
  const totalProblemsSolved = todayRecords.reduce((a, r) => a + (r.problemsSolved || 0), 0);
  const totalProblemsCorrect = todayRecords.reduce((a, r) => a + (r.problemsCorrect || 0), 0);
  const accuracy = totalProblemsSolved > 0
    ? Math.round((totalProblemsCorrect / totalProblemsSolved) * 100)
    : 0;

  const shareId = `report-${selectedDate}-${user?.id}`;
  const shareLink = `https://enefocus.app/report/${shareId}`;

  function copyLink() {
    navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">일일 리포트</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 bg-gray-100 rounded-xl text-sm outline-none"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">총 공부시간</p>
          <p className="text-2xl font-black">{formatDuration(totalStudied)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <Video size={12} className="text-yellow-500" />
            <p className="text-gray-400 text-xs">캠스터디</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{formatDuration(camStudied)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">완료 투두</p>
          <p className="text-2xl font-black text-gray-900">
            {completedTodos.length}<span className="text-gray-400 text-lg"> / {todayTodos.length}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">총 정답률</p>
          <p className="text-2xl font-black text-gray-900">
            {accuracy > 0 ? `${accuracy}%` : '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main report */}
        <div className="lg:col-span-2 space-y-5">
          {/* Subject breakdown */}
          {subjectBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">과목별 공부시간</h3>
              <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mb-4">
                {subjectBreakdown.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      width: `${(s.seconds / totalStudied) * 100}%`,
                      backgroundColor: subjectColorHex[s.color],
                    }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    title={`${s.name}: ${formatDuration(s.seconds)}`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {subjectBreakdown.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subjectColorHex[s.color] }} />
                    <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.seconds / totalStudied) * 100}%`,
                          backgroundColor: subjectColorHex[s.color],
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-20 text-right shrink-0">
                      {formatDuration(s.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problem solving summary */}
          {totalProblemsSolved > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">문제풀이 요약</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-black text-gray-900">{totalProblemsSolved}</p>
                  <p className="text-xs text-gray-500">총 문제</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-black text-green-600">{totalProblemsCorrect}</p>
                  <p className="text-xs text-gray-500">정답</p>
                </div>
                <div className={`text-center p-3 rounded-xl ${accuracy >= 80 ? 'bg-green-50' : accuracy >= 60 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <p className={`text-2xl font-black ${accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {accuracy}%
                  </p>
                  <p className="text-xs text-gray-500">정답률</p>
                </div>
              </div>
              <div className="space-y-2">
                {todayRecords.filter((r) => r.problemsSolved).map((r) => {
                  const todo = todos.find((t) => t.id === r.todoId);
                  const sub = todo ? subjects.find((s) => s.id === todo.subjectId) : null;
                  const acc = r.problemsSolved && r.problemsCorrect
                    ? Math.round((r.problemsCorrect / r.problemsSolved) * 100) : 0;
                  const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
                  return (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${colors.bg} shrink-0`} />
                      <span className="text-gray-600 flex-1 truncate">{todo?.title}</span>
                      <span className="text-gray-400">{r.problemsSolved}문제</span>
                      <span className="font-bold">{acc}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed todos */}
          {completedTodos.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">완료한 항목 ({completedTodos.length})</h3>
              <div className="space-y-2">
                {completedTodos.map((t) => {
                  const sub = subjects.find((s) => s.id === t.subjectId);
                  const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${colors.light} ${colors.text} shrink-0`}>
                        {sub?.name}
                      </span>
                      <span className="text-sm text-gray-800">{t.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Life log */}
          {todayLog && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">생활 기록</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {todayLog.wakeTime && (
                  <div><span className="text-gray-500">기상:</span> <span className="font-medium">{todayLog.wakeTime}</span></div>
                )}
                {todayLog.sleepTime && (
                  <div><span className="text-gray-500">취침:</span> <span className="font-medium">{todayLog.sleepTime}</span></div>
                )}
                {todayLog.conditionScore && (
                  <div><span className="text-gray-500">컨디션:</span> <span className="font-medium">{todayLog.conditionScore}/5</span></div>
                )}
                {todayLog.focusScore && (
                  <div><span className="text-gray-500">집중도:</span> <span className="font-medium">{todayLog.focusScore}/5</span></div>
                )}
              </div>
              {todayLog.memo && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{todayLog.memo}</p>
              )}
            </div>
          )}
        </div>

        {/* Share panel */}
        <div className="space-y-4">
          <div className="bg-black text-white rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4">리포트 공유</h3>

            <div className="space-y-3 mb-5">
              <div>
                <p className="text-gray-400 text-xs mb-2">공개 범위</p>
                <div className="flex gap-2">
                  {[
                    { v: 'private', l: '나만 보기' },
                    { v: 'link', l: '링크 공유' },
                  ].map(({ v, l }) => (
                    <button
                      key={v}
                      className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                        shareVis === v ? 'bg-white text-black' : 'bg-white/10 text-gray-300'
                      }`}
                      onClick={() => setShareVis(v as typeof shareVis)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-xs">포함할 항목</p>
                {[
                  { key: 'includePhotos', label: '인증 사진' },
                  { key: 'includeScores', label: '점수 기록' },
                  { key: 'includeLife', label: '생활 기록' },
                  { key: 'includeMemo', label: '메모' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareOptions[key as keyof typeof shareOptions]}
                      onChange={(e) => setShareOptions((o) => ({ ...o, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {shareVis === 'link' && (
              <div className="space-y-2">
                <div className="bg-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 break-all">
                  {shareLink}
                </div>
                <button
                  onClick={copyLink}
                  className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-all ${
                    copied ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  <Copy size={16} />
                  {copied ? '복사됨!' : '링크 복사'}
                </button>
              </div>
            )}
          </div>

          {/* Incomplete todos */}
          {incompleteTodos.filter((t) => t.status !== 'completed').length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">미완료 ({incompleteTodos.length})</h3>
              <div className="space-y-2">
                {incompleteTodos.slice(0, 5).map((t) => {
                  const sub = subjects.find((s) => s.id === t.subjectId);
                  const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.bg} shrink-0`} />
                      <span className="text-gray-600 truncate">{t.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
