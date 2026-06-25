'use client';
import { useState, useCallback } from 'react';
import { AlertTriangle, Coffee, PlayCircle } from 'lucide-react';
import { useInactivityCheck } from '@/hooks/useInactivityCheck';
import { useStore } from '@/lib/store';
import { generateId } from '@/lib/utils';

export function InactivityModal() {
  const [show, setShow] = useState(false);
  const { activeTodoId, activeSessionId, updateStudySession, setActiveTimer, addStudySession } = useStore();

  const handleInactive = useCallback(() => {
    setShow(true);
  }, []);

  useInactivityCheck(handleInactive);

  function handleContinue() {
    setShow(false);
  }

  function handleMarkInactive() {
    // End the current session — timer stops and time is discarded / not counted
    if (activeSessionId) {
      updateStudySession(activeSessionId, {
        endedAt: new Date().toISOString(),
        note: '자리비움 처리됨',
      });
    }
    setActiveTimer(null, null, null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={28} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-1">30분 동안 활동이 없었어요</h3>
            <p className="text-sm text-gray-500">
              자리를 비웠나요? 비공부 시간으로 처리하거나<br />
              계속 공부 중이라면 그냥 계속을 눌러주세요.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-full py-3 font-medium text-sm hover:bg-gray-800 transition-colors"
            >
              <PlayCircle size={18} />
              계속 공부 중이에요
            </button>
            <button
              onClick={handleMarkInactive}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-full py-3 font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              <Coffee size={18} />
              자리 비움으로 처리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
