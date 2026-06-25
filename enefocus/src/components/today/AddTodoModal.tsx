'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useStore } from '@/lib/store';
import { generateId, getToday } from '@/lib/utils';
import type { Todo, TodoType } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddTodoModal({ open, onClose }: Props) {
  const { subjects, addTodo, materials, materialUnits } = useStore();
  const [form, setForm] = useState({
    subjectId: '',
    title: '',
    type: 'problem-solving' as TodoType,
    targetAmount: '',
    estimatedMinutes: '',
    requiresPhoto: true,
    materialId: '',
    unitId: '',
    dueAt: '',
    memo: '',
  });
  const [mode, setMode] = useState<'manual' | 'material'>('manual');

  const selectedMaterialUnits = materialUnits.filter((u) => u.materialId === form.materialId);

  function handleSubmit() {
    if (!form.subjectId || !form.title.trim()) return;
    const todo: Todo = {
      id: generateId(),
      userId: 'demo-user',
      subjectId: form.subjectId,
      materialId: form.materialId || undefined,
      title: form.title,
      type: form.type,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      status: 'pending',
      date: getToday(),
      dueAt: form.dueAt || undefined,
      requiresPhoto: form.requiresPhoto,
      createdAt: new Date().toISOString(),
    };
    addTodo(todo);
    onClose();
    setForm({
      subjectId: '', title: '', type: 'problem-solving', targetAmount: '',
      estimatedMinutes: '', requiresPhoto: true, materialId: '', unitId: '', dueAt: '', memo: '',
    });
  }

  function handleMaterialSelect() {
    if (!form.materialId || !form.unitId) return;
    const unit = materialUnits.find((u) => u.id === form.unitId);
    const mat = materials.find((m) => m.id === form.materialId);
    if (!unit || !mat) return;
    setForm((f) => ({
      ...f,
      subjectId: mat.subjectId,
      title: `${mat.title} ${unit.title}`,
      type: 'problem-solving',
      targetAmount: unit.questionEnd && unit.questionStart
        ? String(unit.questionEnd - unit.questionStart + 1)
        : '',
    }));
    setMode('manual');
  }

  return (
    <Modal open={open} onClose={onClose} title="투두 추가" size="md">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            onClick={() => setMode('manual')}
          >
            직접 등록
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'material' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            onClick={() => setMode('material')}
          >
            교재에서 불러오기
          </button>
        </div>

        {mode === 'material' ? (
          <div className="space-y-3">
            <Select
              label="교재 선택"
              value={form.materialId}
              onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value, unitId: '' }))}
            >
              <option value="">교재를 선택하세요</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </Select>
            {form.materialId && (
              <Select
                label="회차/단원 선택"
                value={form.unitId}
                onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
              >
                <option value="">회차를 선택하세요</option>
                {selectedMaterialUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title} {u.questionStart && u.questionEnd ? `(${u.questionStart}~${u.questionEnd}번)` : ''}
                  </option>
                ))}
              </Select>
            )}
            <Button
              fullWidth
              onClick={handleMaterialSelect}
              disabled={!form.materialId || !form.unitId}
            >
              이 회차로 투두 생성
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              label="과목"
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">과목 선택</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>

            <Input
              label="제목"
              placeholder="예: 미적분 N제 3회차"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />

            <Select
              label="유형"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TodoType }))}
            >
              <option value="problem-solving">문제풀이</option>
              <option value="exam">시험</option>
              <option value="concept">개념공부</option>
              <option value="review">복습</option>
              <option value="memorization">암기</option>
              <option value="reading">독서</option>
              <option value="life">생활</option>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="목표량"
                type="number"
                placeholder="예: 30 (문제)"
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              />
              <Input
                label="예상 시간 (분)"
                type="number"
                placeholder="예: 90"
                value={form.estimatedMinutes}
                onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requiresPhoto"
                checked={form.requiresPhoto}
                onChange={(e) => setForm((f) => ({ ...f, requiresPhoto: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="requiresPhoto" className="text-sm text-gray-700">인증 사진 필요</label>
            </div>

            <Textarea
              label="메모 (선택)"
              placeholder="오늘 집중할 내용..."
              rows={2}
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            />

            <div className="flex gap-3 pt-2">
              <Button variant="subtle" fullWidth onClick={onClose}>취소</Button>
              <Button fullWidth onClick={handleSubmit} disabled={!form.subjectId || !form.title.trim()}>
                추가하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
