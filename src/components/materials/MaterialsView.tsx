'use client';
import { useState } from 'react';
import { Plus, BookOpen, ChevronRight, Trash2, BarChart2, Calendar, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { generateId, subjectColorMap, getToday } from '@/lib/utils';
import { StudyPlanModal } from './StudyPlanModal';
import type { Material, MaterialType, MaterialUnit, Todo } from '@/lib/types';

const materialTypeLabels: Record<MaterialType, string> = {
  'n-je': 'N제',
  'kichuljemun': '기출문제집',
  'gaenyeom': '개념서',
  'siheomji': '시험지',
  'print': '프린트',
  'daneojiang': '단어장',
};

const unitStatusOptions = [
  { value: 'not-started', label: '미시작', color: 'bg-gray-100 text-gray-500' },
  { value: 'in-progress', label: '진행 중', color: 'bg-blue-100 text-blue-700' },
  { value: 'first-complete', label: '1회독', color: 'bg-green-100 text-green-700' },
  { value: 'reviewing', label: '오답 중', color: 'bg-orange-100 text-orange-700' },
  { value: 'complete', label: '완료', color: 'bg-black text-white' },
];

export function MaterialsView() {
  const { materials, materialUnits, subjects, addMaterial, addMaterialUnit,
    deleteMaterial, updateMaterialUnit, addTodo } = useStore();

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [matForm, setMatForm] = useState({
    subjectId: '', title: '', type: 'n-je' as MaterialType,
    totalUnits: '', totalQuestions: '',
  });
  const [unitForm, setUnitForm] = useState({ title: '', questionStart: '', questionEnd: '' });
  const [bulkAdd, setBulkAdd] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState('Day');

  const today = getToday();

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
    const existingUnits = materialUnits.filter((u) => u.materialId === materialId);
    const unit: MaterialUnit = {
      id: generateId(),
      materialId,
      title: unitForm.title,
      order: existingUnits.length,
      questionStart: unitForm.questionStart ? Number(unitForm.questionStart) : undefined,
      questionEnd: unitForm.questionEnd ? Number(unitForm.questionEnd) : undefined,
      status: 'not-started',
    };
    addMaterialUnit(unit);
    setUnitForm({ title: '', questionStart: '', questionEnd: '' });
  }

  function handleBulkAdd(materialId: string) {
    const existing = materialUnits.filter((u) => u.materialId === materialId).length;
    for (let i = 1; i <= bulkCount; i++) {
      const unit: MaterialUnit = {
        id: generateId(),
        materialId,
        title: `${bulkPrefix} ${String(existing + i).padStart(2, '0')}`,
        order: existing + i - 1,
        status: 'not-started',
      };
      addMaterialUnit(unit);
    }
    setShowAddUnit(null);
  }

  function handleCreateTodo(mat: Material, unit: MaterialUnit) {
    const todo: Todo = {
      id: generateId(),
      userId: 'demo-user',
      subjectId: mat.subjectId,
      materialId: mat.id,
      title: `${mat.title} ${unit.title}`,
      type: 'problem-solving',
      targetAmount: unit.questionEnd && unit.questionStart
        ? unit.questionEnd - unit.questionStart + 1
        : undefined,
      status: 'pending',
      date: today,
      requiresPhoto: true,
      createdAt: new Date().toISOString(),
    };
    addTodo(todo);
  }

  function handleAddAllToday(matId: string) {
    const mat = materials.find((m) => m.id === matId);
    if (!mat) return;
    const unfinished = materialUnits
      .filter((u) => u.materialId === matId && u.status === 'not-started')
      .sort((a, b) => a.order - b.order)
      .slice(0, 5);
    unfinished.forEach((unit) => handleCreateTodo(mat, unit));
    if (unfinished.length > 0) {
      alert(`${unfinished.length}개 단원을 오늘 투두에 추가했습니다!`);
    }
  }

  const selectedMat = materials.find((m) => m.id === selectedMaterial);
  const matUnits = materialUnits
    .filter((u) => u.materialId === selectedMaterial)
    .sort((a, b) => a.order - b.order);

  // Stats for selected material
  const total = matUnits.length;
  const done = matUnits.filter((u) => u.status === 'complete').length;
  const firstRead = matUnits.filter((u) => u.status === 'first-complete').length;
  const reviewing = matUnits.filter((u) => u.status === 'reviewing').length;
  const inProgress = matUnits.filter((u) => u.status === 'in-progress').length;
  const progressPct = total > 0 ? Math.round(((done + firstRead) / total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black text-gray-900">교재 관리</h2>
        <Button onClick={() => setShowAddMaterial(true)}>
          <Plus size={16} />
          교재 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1 min-h-0">
        {/* Material list */}
        <div className="lg:col-span-2 space-y-2 overflow-y-auto">
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">등록된 교재가 없습니다</p>
              <p className="text-sm mt-1">교재를 추가하고 학습을 관리하세요</p>
            </div>
          ) : (
            materials.map((mat) => {
              const sub = subjects.find((s) => s.id === mat.subjectId);
              const colors = sub ? subjectColorMap[sub.color] : subjectColorMap.gray;
              const units = materialUnits.filter((u) => u.materialId === mat.id);
              const matDone = units.filter((u) => u.status === 'complete').length;
              const matFirst = units.filter((u) => u.status === 'first-complete').length;
              const pct = units.length > 0 ? Math.round(((matDone + matFirst) / units.length) * 100) : 0;

              return (
                <div
                  key={mat.id}
                  className={`bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                    selectedMaterial === mat.id ? 'border-black shadow-md' : 'border-transparent border border-gray-100 shadow-sm hover:border-gray-200'
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
                      <p className="font-bold text-gray-900 truncate text-sm">{mat.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${colors.bg}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{units.length}단원 · 완료 {matDone}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-300 transition-transform shrink-0 ${selectedMaterial === mat.id ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Unit detail */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {selectedMat ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
              {/* Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedMat.title}</h3>
                    <p className="text-sm text-gray-400">{materialTypeLabels[selectedMat.type]} · 총 {total}단원</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => setShowPlan(true)}
                    >
                      <Calendar size={14} />
                      계획
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddUnit(selectedMaterial)}
                    >
                      <Plus size={14} />
                      단원
                    </Button>
                  </div>
                </div>

                {/* Progress stats */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: '미시작', value: total - done - firstRead - reviewing - inProgress, color: 'text-gray-500' },
                    { label: '진행 중', value: inProgress, color: 'text-blue-600' },
                    { label: '1회독', value: firstRead, color: 'text-green-600' },
                    { label: '완료', value: done, color: 'text-black' },
                  ].map((s) => (
                    <div key={s.label} className="text-center bg-gray-50 rounded-xl p-2">
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-green-500 transition-all" style={{ width: `${(firstRead / Math.max(total, 1)) * 100}%` }} />
                  <div className="bg-black transition-all" style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{progressPct}% 진행</p>

                {/* Quick actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddAllToday(selectedMat.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white rounded-full py-2 text-xs font-medium hover:bg-gray-800 transition-colors"
                  >
                    <Zap size={12} />
                    미시작 5개 오늘 추가
                  </button>
                  <button
                    onClick={() => setShowPlan(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 rounded-full py-2 text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Calendar size={12} />
                    학습 계획 생성
                  </button>
                </div>
              </div>

              {/* Unit list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {matUnits.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">단원을 추가하세요</p>
                    <p className="text-xs mt-1">일괄 추가로 빠르게 등록할 수 있습니다</p>
                  </div>
                ) : (
                  matUnits.map((unit, idx) => {
                    const statusOpt = unitStatusOptions.find((o) => o.value === unit.status);
                    return (
                      <div
                        key={unit.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group transition-colors"
                      >
                        <span className="text-xs text-gray-400 w-6 shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{unit.title}</p>
                          {unit.questionStart && unit.questionEnd && (
                            <p className="text-xs text-gray-400">{unit.questionStart}~{unit.questionEnd}번 ({unit.questionEnd - unit.questionStart + 1}문)</p>
                          )}
                        </div>
                        <select
                          className={`text-xs rounded-full px-2 py-1 outline-none font-medium shrink-0 ${statusOpt?.color || 'bg-gray-100 text-gray-500'}`}
                          value={unit.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateMaterialUnit(unit.id, { status: e.target.value as MaterialUnit['status'] })}
                        >
                          {unitStatusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <button
                          className="text-xs bg-black text-white rounded-full px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-gray-800"
                          onClick={() => handleCreateTodo(selectedMat, unit)}
                        >
                          오늘 추가
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl h-full flex flex-col items-center justify-center">
              <BookOpen size={40} className="mb-3 opacity-30" />
              <p className="font-medium">교재를 선택하면 단원 목록이 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Material Modal */}
      <Modal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="교재 추가">
        <div className="space-y-4">
          <Select label="과목" value={matForm.subjectId}
            onChange={(e) => setMatForm((f) => ({ ...f, subjectId: e.target.value }))}>
            <option value="">과목 선택</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
        <div className="space-y-5">
          {/* Toggle single/bulk */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!bulkAdd ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              onClick={() => setBulkAdd(false)}
            >단건 추가</button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${bulkAdd ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              onClick={() => setBulkAdd(true)}
            >일괄 추가</button>
          </div>

          {!bulkAdd ? (
            <>
              <Input label="단원/회차 이름" placeholder="Day 03, 1강, 3회차..." value={unitForm.title}
                onChange={(e) => setUnitForm((f) => ({ ...f, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="시작 번호" type="number" value={unitForm.questionStart}
                  onChange={(e) => setUnitForm((f) => ({ ...f, questionStart: e.target.value }))} />
                <Input label="끝 번호" type="number" value={unitForm.questionEnd}
                  onChange={(e) => setUnitForm((f) => ({ ...f, questionEnd: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button variant="subtle" fullWidth onClick={() => setShowAddUnit(null)}>취소</Button>
                <Button fullWidth onClick={() => { handleAddUnit(showAddUnit!); }}
                  disabled={!unitForm.title}>추가</Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">이름 형식</p>
                <div className="flex gap-2 items-center">
                  <Input value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="Day" />
                  <span className="text-gray-400 shrink-0">01, 02...</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">개수</p>
                <Input type="number" min="1" max="100" value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value))} />
              </div>
              <p className="text-xs text-gray-500">
                {bulkPrefix} 01 ~ {bulkPrefix} {String(bulkCount).padStart(2, '0')} 형식으로 {bulkCount}개가 추가됩니다
              </p>
              <div className="flex gap-3">
                <Button variant="subtle" fullWidth onClick={() => setShowAddUnit(null)}>취소</Button>
                <Button fullWidth onClick={() => handleBulkAdd(showAddUnit!)}>
                  {bulkCount}개 일괄 추가
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Study Plan Modal */}
      {selectedMat && (
        <StudyPlanModal
          material={selectedMat}
          open={showPlan}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  );
}
