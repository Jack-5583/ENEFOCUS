'use client';
import { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useStore } from '@/lib/store';
import { generateId } from '@/lib/utils';
import type { Todo } from '@/lib/types';

interface Props {
  todo: Todo;
  open: boolean;
  onClose: () => void;
}

export function CompleteTodoModal({ todo, open, onClose }: Props) {
  const { updateTodo, addTodoRecord, addProofPhoto, proofPhotos } = useStore();
  const [form, setForm] = useState({
    problemsSolved: '',
    problemsCorrect: '',
    score: '',
    grade: '',
    memo: '',
    reviewDate: '',
  });
  const [photos, setPhotos] = useState<Array<{ url: string; memo: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const todoPhotos = proofPhotos.filter((p) => p.todoId === todo.id);
  const correct = Number(form.problemsSolved) > 0
    ? Math.round((Number(form.problemsCorrect) / Number(form.problemsSolved)) * 100)
    : 0;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos((p) => [...p, { url, memo: '' }]);
  }

  function handleComplete() {
    // Add todo record
    const record = {
      id: generateId(),
      todoId: todo.id,
      recordType: todo.type,
      problemsSolved: form.problemsSolved ? Number(form.problemsSolved) : undefined,
      problemsCorrect: form.problemsCorrect ? Number(form.problemsCorrect) : undefined,
      score: form.score ? Number(form.score) : undefined,
      grade: form.grade ? Number(form.grade) : undefined,
      memo: form.memo,
      reviewDate: form.reviewDate || undefined,
      createdAt: new Date().toISOString(),
    };
    addTodoRecord(record);

    // Add photos
    photos.forEach((p) => {
      addProofPhoto({
        id: generateId(),
        userId: 'demo-user',
        todoId: todo.id,
        imageUrl: p.url,
        source: 'upload',
        capturedAt: new Date().toISOString(),
        memo: p.memo,
      });
    });

    // Update todo status
    updateTodo(todo.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="완료 인증" size="lg">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-bold text-gray-900">{todo.title}</p>
          {todo.type === 'problem-solving' && (
            <p className="text-sm text-gray-500 mt-1">목표: {todo.targetAmount}문제</p>
          )}
        </div>

        {/* Record inputs based on type */}
        {todo.type === 'problem-solving' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">문제풀이 기록</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="푼 문제 수"
                type="number"
                placeholder="30"
                value={form.problemsSolved}
                onChange={(e) => setForm((f) => ({ ...f, problemsSolved: e.target.value }))}
              />
              <Input
                label="맞은 문항 수"
                type="number"
                placeholder="24"
                value={form.problemsCorrect}
                onChange={(e) => setForm((f) => ({ ...f, problemsCorrect: e.target.value }))}
              />
            </div>
            {Number(form.problemsSolved) > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                <div className="text-2xl font-black text-blue-600">{correct}%</div>
                <div className="text-sm text-blue-700">
                  {form.problemsSolved}문제 중 {form.problemsCorrect}문제 정답
                </div>
              </div>
            )}
            <Input
              label="복습 예정일 (선택)"
              type="date"
              value={form.reviewDate}
              onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
            />
          </div>
        )}

        {todo.type === 'exam' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">시험 기록</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="점수 (원점수)"
                type="number"
                placeholder="42"
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
              />
              <Input
                label="등급"
                type="number"
                placeholder="2"
                min="1"
                max="9"
                value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              />
            </div>
          </div>
        )}

        <Textarea
          label="메모"
          placeholder="오늘의 공부 내용, 틀린 유형, 느낀 점..."
          rows={3}
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
        />

        {/* Proof photos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">인증 사진</h3>
            {todo.requiresPhoto && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">필수</span>
            )}
          </div>

          {/* Existing photos from the todo */}
          {todoPhotos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {todoPhotos.map((p) => (
                <div key={p.id} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* New photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="subtle"
              size="sm"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={16} />
              촬영
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              업로드
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="subtle" fullWidth onClick={onClose}>취소</Button>
          <Button
            fullWidth
            onClick={handleComplete}
            disabled={todo.requiresPhoto && photos.length === 0 && todoPhotos.length === 0}
          >
            <Check size={18} />
            완료 저장
          </Button>
        </div>
      </div>
    </Modal>
  );
}
