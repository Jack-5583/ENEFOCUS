'use client';
import { useState } from 'react';
import { Plus, Trash2, Palette } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { generateId, subjectColorMap } from '@/lib/utils';
import type { Subject, SubjectColor } from '@/lib/types';

const colorOptions: { value: SubjectColor; label: string }[] = [
  { value: 'red', label: '빨강' },
  { value: 'blue', label: '파랑' },
  { value: 'purple', label: '보라' },
  { value: 'green', label: '초록' },
  { value: 'navy', label: '남색' },
  { value: 'orange', label: '주황' },
  { value: 'sky', label: '하늘색' },
  { value: 'gray', label: '회색' },
  { value: 'gold', label: '금색' },
];

export function SettingsView() {
  const { subjects, addSubject, updateSubject, deleteSubject, user, setUser } = useStore();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', color: 'blue' as SubjectColor });
  const [userName, setUserName] = useState(user?.name || '');

  function handleAddSubject() {
    if (!subForm.name.trim()) return;
    const sub: Subject = {
      id: generateId(),
      userId: 'demo-user',
      name: subForm.name,
      color: subForm.color,
      order: subjects.length,
      createdAt: new Date().toISOString(),
    };
    addSubject(sub);
    setShowAddSubject(false);
    setSubForm({ name: '', color: 'blue' });
  }

  function handleDeleteSubject(id: string) {
    if (window.confirm('이 과목을 삭제하시겠습니까?')) {
      deleteSubject(id);
    }
  }

  function handleSaveUser() {
    if (user) {
      setUser({ ...user, name: userName });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <h2 className="text-2xl font-black text-gray-900">설정</h2>

      {/* User settings */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">프로필</h3>
        <div className="flex gap-3">
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="이름"
          />
          <Button onClick={handleSaveUser} variant="subtle">저장</Button>
        </div>
      </div>

      {/* Subject management */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Palette size={18} />
            과목 관리
          </h3>
          <Button size="sm" onClick={() => setShowAddSubject(true)}>
            <Plus size={14} />
            과목 추가
          </Button>
        </div>

        <div className="space-y-2">
          {subjects.map((sub) => {
            const colors = subjectColorMap[sub.color];
            return (
              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group">
                <div className={`w-4 h-4 rounded-full ${colors.bg} shrink-0`} />
                <span className="flex-1 font-medium text-gray-900">{sub.name}</span>
                <select
                  className="text-xs bg-gray-100 rounded-lg px-2 py-1 outline-none"
                  value={sub.color}
                  onChange={(e) => updateSubject(sub.id, { color: e.target.value as SubjectColor })}
                >
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-lg"
                  onClick={() => handleDeleteSubject(sub.id)}
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* App info */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">앱 정보</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>앱 이름</span>
            <span className="font-medium text-gray-900">ENE Focus</span>
          </div>
          <div className="flex justify-between">
            <span>버전</span>
            <span className="font-medium text-gray-900">1.0.0 MVP</span>
          </div>
          <div className="flex justify-between">
            <span>하루 기준</span>
            <span className="font-medium text-gray-900">오전 02:00 ~ 익일 01:59</span>
          </div>
        </div>
      </div>

      {/* Add Subject Modal */}
      <Modal open={showAddSubject} onClose={() => setShowAddSubject(false)} title="과목 추가">
        <div className="space-y-4">
          <Input
            label="과목명"
            placeholder="예: 국어, 수학, 영어..."
            value={subForm.name}
            onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((c) => {
                const cm = subjectColorMap[c.value];
                return (
                  <button
                    key={c.value}
                    onClick={() => setSubForm((f) => ({ ...f, color: c.value }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      subForm.color === c.value ? 'border-black' : 'border-transparent bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${cm.bg}`} />
                    <span className="text-sm">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="subtle" fullWidth onClick={() => setShowAddSubject(false)}>취소</Button>
            <Button fullWidth onClick={handleAddSubject} disabled={!subForm.name.trim()}>추가</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
