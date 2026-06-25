'use client';
import { useState } from 'react';
import { Plus, BookOpen, ChevronRight, Trash2, CheckCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { generateId, subjectColorMap } from '@/lib/utils';
import type { Material, MaterialType, MaterialUnit } from '@/lib/types';

const materialTypeLabels: Record<MaterialType, string> = {
  'n-je': 'N제',
  'kichuljemun': '기출문제집',
  'gaenyeom': '개념서',
  'siheomji': '시험지',
  'print': '프린트',
  'daneojiang': '단어장',
};

const unitStatusLabels = {
  'not-started': '미시작',
  'in-progress': '진행 중',
  'first-complete': '1회독 완료',
  'reviewing': '오답 중',
  'complete': '완료',
};

const unitStatusColors = {
  'not-started': 'bg-gray-100 text-gray-500',
  'in-progress': 'bg-blue-100 text-blue-700',
  'first-complete': 'bg-green-100 text-green-700',
  'reviewing': 'bg-orange-100 text-orange-700',
  'complete': 'bg-black text-white',
};

export function MaterialsView() {
  const { materials, materialUnits, subjects, addMaterial, addMaterialUnit,
    deleteMaterial, updateMaterialUnit } = useStore();
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [matForm, setMatForm] = useState({
    subjectId: '', title: '', type: 'n-je' as MaterialType, totalUnits: '', totalQuestions: '',
  });
  const [unitForm, setUnitForm] = useState({
    title: '', questionStart: '', questionEnd: '',
  });

  function handleAddMaterial() {
    if (!matForm.subjectId || !matForm.title) return;
    const mat: Material = {
      id: generateId(),
      userId: 'demo-user',
      subjectId: matForm.subjectId,
      title: matForm.title,
      type: matForm.type,
      totalUnits: matForm.totalUnits ? Number(matForm.totalUnits) : undefined,
      totalQuestions: matForm.totalQuestions ? Number(matForm.totalQuestions) : undefined,
      createdAt: new Date().toISOString(),
    };
    addMaterial(mat);
    setShowAddMaterial(false);
    setMatForm({ subjectId: '', title: '', type: 'n-je', totalUnits: '', totalQuestions: '' });
  }

  function handleAddUnit(materialId: string) {
    if (!unitForm.title) return;
    const unit: MaterialUnit = {
      id: generateId(),
      materialId,
      title: unitForm.title,
      order: materialUnits.filter((u: MaterialUnit) => u.materialId === materialId).length,
      questionStart: unitForm.questionStart ? Number(unitForm.questionStart) : undefined,
      questionEnd: unitForm.questionEnd ? Number(unitForm.questionEnd) : undefined,
      status: 'not-started',
    };
    addMaterialUnit(unit);
    setShowAddUnit(null);
    setUnitForm({ title: '', questionStart: '', questionEnd: '' });
  }

  function handleCreateTodo(mat: Material, unit: MaterialUnit) {
    const today = new Date().toISOString().split('T')[0];
    const todo = {
      id: generateId(),
      userId: 'demo-user',
      subjectId: mat.subjectId,
      materialId: mat.id,
      title: `${mat.title} ${unit.title}`,
      type: 'problem-solving' as const,
      targetAmount: unit.questionEnd && unit.questionStart
        ? unit.questionEnd - unit.questionStart + 1
        : undefined,
      estimatedMinutes: undefined,
      status: 'pending' as const,
      date: today,
      requiresPhoto: true,
      createdAt: new Date().toISOString(),
    };
    const { addTodo: add } = useStore.getState();
    add(todo);
    alert(`"${todo.title}" 투두가 오늘에 추가되었습니다!`);
  }

  const selectedMat = materials.find((m: Material) => m.id === selectedMaterial);
  const matUnits = materialUnits.filter((u: MaterialUnit) => u.materialId === selectedMaterial);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">교재 관리</h2>
        <Button onClick={() => setShowAddMaterial(true)}>
          <Plus size={16} />
          교재 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material list */}
        <div className="lg:col-span-1 space-y-3">
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>등록된 교재가 없습니다</p>
            </div>
          ) : (
            materials.map((mat: Material) => {
              const sub = subjects.find((s: any) => s.id === mat.subjectId);
              const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
              const units = materialUnits.filter((u: MaterialUnit) => u.materialId === mat.id);
              const completed = units.filter((u: MaterialUnit) => u.status === 'complete').length;
              const progress = units.length > 0 ? (completed / units.length) * 100 : 0;

              return (
                <div
                  key={mat.id}
                  className={`bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                    selectedMaterial === mat.id ? 'border-black' : 'border-transparent border border-gray-100 shadow-sm'
                  }`}
                  onClick={() => setSelectedMaterial(mat.id === selectedMaterial ? null : mat.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1 rounded-full self-stretch ${colors.bg}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {sub && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                            {sub.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{materialTypeLabels[mat.type]}</span>
                      </div>
                      <p className="font-bold text-gray-900 truncate">{mat.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors.bg}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{completed}/{units.length}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`text-gray-300 transition-transform ${selectedMaterial === mat.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Unit list */}
        <div className="lg:col-span-2">
          {selectedMat ? (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedMat.title}</h3>
                  <p className="text-sm text-gray-400">{materialTypeLabels[selectedMat.type]} · {matUnits.length}개 단원</p>
                </div>
                <Button size="sm" onClick={() => setShowAddUnit(selectedMaterial)}>
                  <Plus size={14} />
                  단원 추가
                </Button>
              </div>

              {matUnits.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">단원을 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matUnits
                    .sort((a: MaterialUnit, b: MaterialUnit) => a.order - b.order)
                    .map((unit: MaterialUnit) => (
                      <div key={unit.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">{unit.title}</p>
                            {unit.questionStart && unit.questionEnd && (
                              <span className="text-xs text-gray-400">
                                {unit.questionStart}~{unit.questionEnd}번
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs bg-gray-100 rounded-lg px-2 py-1 outline-none"
                            value={unit.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateMaterialUnit(unit.id, { status: e.target.value as MaterialUnit['status'] })}
                          >
                            {Object.entries(unitStatusLabels).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                          <button
                            className="text-xs bg-black text-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCreateTodo(selectedMat, unit)}
                          >
                            오늘 추가
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>교재를 선택하면 단원 목록이 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Material Modal */}
      <Modal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="교재 추가">
        <div className="space-y-4">
          <Select
            label="과목"
            value={matForm.subjectId}
            onChange={(e) => setMatForm((f) => ({ ...f, subjectId: e.target.value }))}
          >
            <option value="">과목 선택</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="교재명" placeholder="이해원 N제 수학Ⅰ" value={matForm.title}
            onChange={(e) => setMatForm((f) => ({ ...f, title: e.target.value }))} />
          <Select label="유형" value={matForm.type}
            onChange={(e) => setMatForm((f) => ({ ...f, type: e.target.value as MaterialType }))}>
            {Object.entries(materialTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="총 단원 수" type="number" value={matForm.totalUnits}
              onChange={(e) => setMatForm((f) => ({ ...f, totalUnits: e.target.value }))} />
            <Input label="총 문제 수" type="number" value={matForm.totalQuestions}
              onChange={(e) => setMatForm((f) => ({ ...f, totalQuestions: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <Button variant="subtle" fullWidth onClick={() => setShowAddMaterial(false)}>취소</Button>
            <Button fullWidth onClick={handleAddMaterial} disabled={!matForm.subjectId || !matForm.title}>추가</Button>
          </div>
        </div>
      </Modal>

      {/* Add Unit Modal */}
      <Modal open={!!showAddUnit} onClose={() => setShowAddUnit(null)} title="단원 추가">
        <div className="space-y-4">
          <Input label="단원/회차 이름" placeholder="Day 03, 1강, 3회차..." value={unitForm.title}
            onChange={(e) => setUnitForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="시작 문제 번호" type="number" value={unitForm.questionStart}
              onChange={(e) => setUnitForm((f) => ({ ...f, questionStart: e.target.value }))} />
            <Input label="끝 문제 번호" type="number" value={unitForm.questionEnd}
              onChange={(e) => setUnitForm((f) => ({ ...f, questionEnd: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <Button variant="subtle" fullWidth onClick={() => setShowAddUnit(null)}>취소</Button>
            <Button fullWidth onClick={() => handleAddUnit(showAddUnit!)} disabled={!unitForm.title}>추가</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
