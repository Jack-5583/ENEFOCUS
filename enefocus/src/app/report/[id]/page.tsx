'use client';
import { useEffect, useState } from 'react';
import { BarChart3, Clock, Video, CheckCircle, BookOpen } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDuration, subjectColorHex, subjectColorMap } from '@/lib/utils';
import type { DailyReport } from '@/lib/types';

interface Props {
  params: { id: string };
}

export default function SharedReportPage({ params }: Props) {
  const { id } = params;
  const { dailyReports, studySessions, todos, subjects, todoRecords, lifeLogs } = useStore();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Look up report by publicShareId
    const found = (dailyReports || []).find(
      (r: DailyReport) => r.publicShareId === id || r.id === id
    );
    if (found) {
      setReport(found);
    } else {
      setNotFound(true);
    }
  }, [id, dailyReports]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm max-w-sm w-full">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">리포트를 찾을 수 없어요</h1>
          <p className="text-sm text-gray-500">링크가 만료되었거나 비공개 설정된 리포트입니다.</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const dateStr = report.reportDate;
  const todaySessions = studySessions.filter((s) => {
    const start = new Date(s.startedAt);
    return start >= new Date(report.rangeStart) && start <= new Date(report.rangeEnd);
  });
  const dateTodos = todos.filter((t) => t.date === dateStr);
  const completedTodos = dateTodos.filter((t) => t.status === 'completed');

  const subjectBreakdown = subjects.map((sub) => {
    const sec = todaySessions.filter((s) => s.subjectId === sub.id).reduce((a, s) => a + s.durationSeconds, 0);
    return { ...sub, seconds: sec };
  }).filter((s) => s.seconds > 0).sort((a, b) => b.seconds - a.seconds);

  const todayLog = lifeLogs.find((l) => l.date === dateStr);
  const todayRecords = todoRecords.filter((r) => {
    const todo = todos.find((t) => t.id === r.todoId);
    return todo?.date === dateStr;
  });
  const totalProblemsSolved = todayRecords.reduce((a, r) => a + (r.problemsSolved || 0), 0);
  const totalProblemsCorrect = todayRecords.reduce((a, r) => a + (r.problemsCorrect || 0), 0);
  const accuracy = totalProblemsSolved > 0
    ? Math.round((totalProblemsCorrect / totalProblemsSolved) * 100)
    : 0;

  const [y, m, d] = dateStr.split('-');
  const displayDate = `${y}년 ${Number(m)}월 ${Number(d)}일`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-black text-white rounded-3xl p-6">
          <p className="text-gray-400 text-sm mb-1">ENE Focus 학습 리포트</p>
          <h1 className="text-2xl font-black mb-4">{displayDate}</h1>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-gray-300" />
                <span className="text-gray-400 text-xs">총 공부시간</span>
              </div>
              <p className="text-xl font-black">{formatDuration(report.totalStudySeconds)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Video size={14} className="text-yellow-400" />
                <span className="text-gray-400 text-xs">캠스터디</span>
              </div>
              <p className="text-xl font-black">{formatDuration(report.camstudySeconds)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-gray-400 text-xs">완료</span>
              </div>
              <p className="text-xl font-black">
                {report.completedTodosCount}
                <span className="text-gray-400 text-sm"> / {report.totalTodosCount}</span>
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen size={14} className="text-blue-400" />
                <span className="text-gray-400 text-xs">정답률</span>
              </div>
              <p className="text-xl font-black">{accuracy > 0 ? `${accuracy}%` : '-'}</p>
            </div>
          </div>
        </div>

        {/* Subject breakdown */}
        {subjectBreakdown.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">과목별 공부시간</h2>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
              {subjectBreakdown.map((s) => (
                <div
                  key={s.id}
                  style={{
                    width: `${(s.seconds / report.totalStudySeconds) * 100}%`,
                    backgroundColor: subjectColorHex[s.color],
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ))}
            </div>
            <div className="space-y-2">
              {subjectBreakdown.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subjectColorHex[s.color] }} />
                  <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                  <span className="text-sm font-bold text-gray-900">{formatDuration(s.seconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">완료한 항목 ({completedTodos.length})</h2>
            <div className="space-y-2">
              {completedTodos.map((t) => {
                const sub = subjects.find((s) => s.id === t.subjectId);
                const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    {sub && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${colors.light} ${colors.text} shrink-0`}>
                        {sub.name}
                      </span>
                    )}
                    <span className="text-sm text-gray-800">{t.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Life log */}
        {todayLog && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">생활 기록</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {todayLog.wakeTime && (
                <div><span className="text-gray-500">기상: </span><span className="font-medium">{todayLog.wakeTime}</span></div>
              )}
              {todayLog.sleepTime && (
                <div><span className="text-gray-500">취침: </span><span className="font-medium">{todayLog.sleepTime}</span></div>
              )}
              {todayLog.conditionScore && (
                <div><span className="text-gray-500">컨디션: </span><span className="font-medium">{todayLog.conditionScore}/5</span></div>
              )}
              {todayLog.focusScore && (
                <div><span className="text-gray-500">집중도: </span><span className="font-medium">{todayLog.focusScore}/5</span></div>
              )}
            </div>
            {todayLog.memo && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{todayLog.memo}</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          ENE Focus로 공유된 학습 리포트입니다
        </p>
      </div>
    </div>
  );
}
