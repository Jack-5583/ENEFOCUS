'use client';
import { useState } from 'react';
import { FileText, BarChart2, Star } from 'lucide-react';
import { useStore } from '@/lib/store';
import { subjectColorMap, todoTypeLabels } from '@/lib/utils';

export function RecordsView() {
  const { todoRecords, todos, subjects, proofPhotos } = useStore();
  const [filter, setFilter] = useState<'all' | 'problem-solving' | 'exam'>('all');

  const enrichedRecords = todoRecords.map((r) => {
    const todo = todos.find((t) => t.id === r.todoId);
    const sub = todo ? subjects.find((s) => s.id === todo.subjectId) : null;
    const photos = proofPhotos.filter((p) => p.todoId === r.todoId);
    return { ...r, todo, sub, photos };
  }).filter((r) => {
    if (filter === 'all') return true;
    return r.todo?.type === filter;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h2 className="text-2xl font-black text-gray-900 mb-6">학습 기록</h2>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6 w-fit">
        {[
          { id: 'all', label: '전체' },
          { id: 'problem-solving', label: '문제풀이' },
          { id: 'exam', label: '시험' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
            onClick={() => setFilter(tab.id as typeof filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {enrichedRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>아직 기록이 없습니다</p>
          <p className="text-sm mt-1">투두를 완료하면 기록이 쌓입니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrichedRecords.map((r) => {
            const colors = r.sub ? subjectColorMap[r.sub.color] : subjectColorMap.gray;
            const accuracy = r.problemsSolved && r.problemsCorrect
              ? Math.round((r.problemsCorrect / r.problemsSolved) * 100)
              : null;

            return (
              <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`w-1 rounded-full self-stretch ${colors.bg}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {r.sub && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                          {r.sub.name}
                        </span>
                      )}
                      {r.todo && (
                        <span className="text-xs text-gray-500">
                          {todoTypeLabels[r.todo.type] || r.todo.type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="font-bold text-gray-900 mb-3">
                      {r.todo?.title || '기록'}
                    </p>

                    {/* Problem solving stats */}
                    {r.problemsSolved && (
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">푼 문제</p>
                          <p className="text-2xl font-black text-gray-900">{r.problemsSolved}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">정답</p>
                          <p className="text-2xl font-black text-green-600">{r.problemsCorrect}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${
                          accuracy && accuracy >= 80 ? 'bg-green-50' : accuracy && accuracy >= 60 ? 'bg-yellow-50' : 'bg-red-50'
                        }`}>
                          <p className="text-xs text-gray-500 mb-1">정답률</p>
                          <p className={`text-2xl font-black ${
                            accuracy && accuracy >= 80 ? 'text-green-600' : accuracy && accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {accuracy}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Exam stats */}
                    {r.score !== undefined && r.score !== null && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">원점수</p>
                          <p className="text-3xl font-black text-gray-900">{r.score}점</p>
                        </div>
                        {r.grade && (
                          <div className="bg-black rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">등급</p>
                            <p className="text-3xl font-black text-white">{r.grade}등급</p>
                          </div>
                        )}
                      </div>
                    )}

                    {r.memo && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3">{r.memo}</p>
                    )}

                    {r.reviewDate && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600">
                        <Star size={12} />
                        복습 예정: {new Date(r.reviewDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </div>
                    )}

                    {/* Proof photos */}
                    {r.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {r.photos.map((p) => (
                          <img
                            key={p.id}
                            src={p.imageUrl}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
