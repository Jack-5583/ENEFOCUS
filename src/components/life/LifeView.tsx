'use client';
import { useState, useEffect } from 'react';
import { Heart, Sun, Moon, Pill, Activity } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateId, getToday } from '@/lib/utils';
import type { LifeLog } from '@/lib/types';

function ScoreSelector({ value, onChange, label }: { value?: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
              value === n
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function calcSleep(wake?: string, sleep?: string): string {
  if (!wake || !sleep) return '-';
  const [wh, wm] = wake.split(':').map(Number);
  const [sh, sm] = sleep.split(':').map(Number);
  let wTotal = wh * 60 + wm;
  let sTotal = sh * 60 + sm;
  if (sTotal > wTotal) sTotal -= 24 * 60;
  const diff = wTotal - sTotal;
  if (diff <= 0) return '-';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}시간 ${m}분`;
}

export function LifeView() {
  const { lifeLogs, addLifeLog, updateLifeLog } = useStore();
  const today = getToday();
  const existing = lifeLogs.find((l) => l.date === today);

  const [form, setForm] = useState({
    wakeTime: '',
    sleepTime: '',
    conditionScore: undefined as number | undefined,
    focusScore: undefined as number | undefined,
    fatigueScore: undefined as number | undefined,
    medicineMorning: false,
    medicineLunch: false,
    medicineEvening: false,
    memo: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        wakeTime: existing.wakeTime || '',
        sleepTime: existing.sleepTime || '',
        conditionScore: existing.conditionScore,
        focusScore: existing.focusScore,
        fatigueScore: existing.fatigueScore,
        medicineMorning: existing.medicineMorning || false,
        medicineLunch: existing.medicineLunch || false,
        medicineEvening: existing.medicineEvening || false,
        memo: existing.memo || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  function handleSave() {
    const data: Partial<LifeLog> = {
      userId: 'demo-user',
      date: today,
      wakeTime: form.wakeTime || undefined,
      sleepTime: form.sleepTime || undefined,
      conditionScore: form.conditionScore,
      focusScore: form.focusScore,
      fatigueScore: form.fatigueScore,
      medicineMorning: form.medicineMorning,
      medicineLunch: form.medicineLunch,
      medicineEvening: form.medicineEvening,
      memo: form.memo || undefined,
    };
    if (existing) {
      updateLifeLog(existing.id, data);
    } else {
      addLifeLog({ id: generateId(), ...data } as LifeLog);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sleepStr = calcSleep(form.wakeTime, form.sleepTime);

  type BoolKey = 'medicineMorning' | 'medicineLunch' | 'medicineEvening';

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-50 rounded-xl">
          <Heart size={20} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">생활 기록</h2>
      </div>

      <div className="space-y-5">
        {/* Sleep */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Moon size={16} />
            수면
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1 flex items-center gap-1">
                <Moon size={12} />
                취침 시간
              </label>
              <input
                type="time"
                value={form.sleepTime}
                onChange={(e) => setForm((f) => ({ ...f, sleepTime: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1 flex items-center gap-1">
                <Sun size={12} />
                기상 시간
              </label>
              <input
                type="time"
                value={form.wakeTime}
                onChange={(e) => setForm((f) => ({ ...f, wakeTime: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none"
              />
            </div>
          </div>
          {form.wakeTime && form.sleepTime && sleepStr !== '-' && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <span className="text-gray-500">수면 시간: </span>
              <span className="font-bold text-gray-900">{sleepStr}</span>
            </div>
          )}
        </div>

        {/* Medicine */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Pill size={16} />
            약 복용
          </h3>
          <div className="flex gap-4">
            {([
              { key: 'medicineMorning' as BoolKey, label: '아침' },
              { key: 'medicineLunch' as BoolKey, label: '점심' },
              { key: 'medicineEvening' as BoolKey, label: '저녁' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                className="flex-1 flex flex-col items-center gap-2"
                onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    form[key] ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Pill size={20} />
                </div>
                <span className={`text-sm font-medium ${form[key] ? 'text-black' : 'text-gray-500'}`}>{label}</span>
                {form[key] && <span className="text-xs text-green-600">✓ 복용</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Scores */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Activity size={16} />
            오늘의 상태
          </h3>
          <ScoreSelector
            label="컨디션"
            value={form.conditionScore}
            onChange={(v) => setForm((f) => ({ ...f, conditionScore: v }))}
          />
          <ScoreSelector
            label="집중도"
            value={form.focusScore}
            onChange={(v) => setForm((f) => ({ ...f, focusScore: v }))}
          />
          <ScoreSelector
            label="피로도"
            value={form.fatigueScore}
            onChange={(v) => setForm((f) => ({ ...f, fatigueScore: v }))}
          />
        </div>

        {/* Memo */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3">메모</h3>
          <textarea
            rows={4}
            placeholder="오늘의 컨디션, 특이사항, 내일 계획..."
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none resize-none focus:ring-2 focus:ring-black/20"
          />
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {saved ? '저장됨 ✓' : '생활 기록 저장'}
        </button>
      </div>
    </div>
  );
}
