'use client';
import { useState, useMemo } from 'react';
import { Calendar, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { generateId, getToday } from '@/lib/utils';
import type { Material, MaterialUnit, Todo } from '@/lib/types';

interface Props {
  material: Material;
  open: boolean;
  onClose: () => void;
}

export function StudyPlanModal({ material, open, onClose }: Props) {
  const { materialUnits, addTodo } = useStore();
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState(getToday());
  const [generated, setGenerated] = useState<Array<{ date: string; units: MaterialUnit[] }>>([]);

  const units = materialUnits
    .filter((u) => u.materialId === material.id && u.status !== 'complete')
    .sort((a, b) => a.order - b.order);

  const plan = useMemo(() => {
    if (!units.length) return [];
    const perDay = Math.ceil(units.length / days);
    const result: Array<{ date: string; units: MaterialUnit[] }> = [];
    const [y, m, d] = startDate.split('-').map(Number);
    for (let i = 0; i < days; i++) {
      const date = new Date(y, m - 1, d + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayUnits = units.slice(i * perDay, (i + 1) * perDay);
      if (dayUnits.length > 0) {
        result.push({ date: dateStr, units: dayUnits });
      }
    }
    return result;
  }, [units, days, startDate]);

  function createPlan() {
    plan.forEach(({ date, units: dayUnits }) => {
      dayUnits.forEach((unit) => {
        const todo: Todo = {
          id: generateId(),
          userId: 'demo-user',
          subjectId: material.subjectId,
          materialId: material.id,
          title: `${material.title} ${unit.title}`,
          type: 'problem-solving',
          targetAmount: unit.questionEnd && unit.questionStart
            ? unit.questionEnd - unit.questionStart + 1
            : undefined,
          status: 'pending',
          date,
          requiresPhoto: true,
          createdAt: new Date().toISOString(),
        };
        addTodo(todo);
      });
    });
    setGenerated(plan);
  }

  function createReviewTodos() {
    const reviewUnits = materialUnits.filter(
      (u) => u.materialId === material.id && (u.status === 'first-complete' || u.status === 'reviewing')
    );
    reviewUnits.forEach((unit) => {
      const todo: Todo = {
        id: generateId(),
        userId: 'demo-user',
        subjectId: material.subjectId,
        materialId: material.id,
        title: `[오답] ${material.title} ${unit.title}`,
        type: 'review',
        status: 'pending',
        date: getToday(),
        requiresPhoto: true,
        createdAt: new Date().toISOString(),
      };
      addTodo(todo);
    });
    alert(`오답 복습 투두 ${reviewUnits.length}개가 오늘에 추가되었습니다!`);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="학습 계획 생성" size="lg">
      <div className="space-y-5">
        {/* Plan type tabs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-gray-700" />
              <h4 className="font-bold text-gray-900">N일 계획 분배</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              남은 단원 {units.length}개를 N일에 나눕니다
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-16 text-center bg-white border border-gray-200 rounded-xl py-1.5 font-bold outline-none"
              />
              <span className="text-sm text-gray-600">일 계획</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 shrink-0">시작일:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
              />
            </div>
            <Button
              size="sm"
              fullWidth
              onClick={createPlan}
              disabled={units.length === 0}
            >
              {days}일 계획 생성
            </Button>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-orange-500" />
              <h4 className="font-bold text-gray-900">오답 복습 생성</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              1회독 완료 또는 오답 중 단원을<br />오늘 복습 투두로 만듭니다
            </p>
            <p className="text-sm font-bold text-gray-700 mb-3">
              {materialUnits.filter((u) => u.materialId === material.id && (u.status === 'first-complete' || u.status === 'reviewing')).length}개 단원
            </p>
            <Button
              variant="subtle"
              size="sm"
              fullWidth
              onClick={createReviewTodos}
            >
              오답 투두 생성
            </Button>
          </div>
        </div>

        {/* Plan preview */}
        {plan.length > 0 && (
          <div>
            <h4 className="font-bold text-gray-900 mb-3">계획 미리보기 ({plan.length}일)</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {plan.map(({ date, units: dayUnits }, i) => (
                <div key={date} className="flex gap-3 items-start">
                  <div className="shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {dayUnits.map((u) => (
                        <span key={u.id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-700">
                          {u.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {generated.length > 0 ? (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                투두 생성 완료! 각 날짜의 오늘 탭에서 확인하세요.
              </div>
            ) : (
              <Button fullWidth className="mt-4" onClick={createPlan}>
                <Calendar size={16} />
                이 계획으로 투두 생성
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
