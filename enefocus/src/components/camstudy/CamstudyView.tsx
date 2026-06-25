'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Camera, LogOut, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateId, formatDurationShort, formatDuration, getToday } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function CamstudyView() {
  const {
    activeZoomSession, setActiveZoomSession, addZoomSession, updateZoomSession,
    zoomSessions, todos, subjects, studySessions, addStudySession, updateStudySession,
    activeSessionId, activeTodoId, timerStartedAt, setActiveTimer, updateTodo,
    addProofPhoto,
  } = useStore();

  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('김성현');
  const [linkedTodoId, setLinkedTodoId] = useState('');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);

  const today = getToday();
  const todayTodos = todos.filter((t) => t.date === today && t.status !== 'completed');
  const isInSession = !!activeZoomSession;

  // Elapsed timer
  useEffect(() => {
    if (!isInSession) return;
    const interval = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInSession]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Camera not available:', e);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !streamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.8);

    const photo = {
      id: generateId(),
      userId: 'demo-user',
      todoId: activeZoomSession?.linkedTodoId || linkedTodoId || undefined,
      studySessionId: activeSessionId || undefined,
      imageUrl: url,
      source: 'webcam_snapshot' as const,
      capturedAt: new Date().toISOString(),
      memo: '캠스터디 자동 캡처',
    };
    addProofPhoto(photo);
    return url;
  }

  async function joinSession() {
    if (!meetingId) return;
    const now = Date.now();
    sessionStartRef.current = now;
    setSessionElapsed(0);

    const sessionId = generateId();
    const session = {
      id: sessionId,
      userId: 'demo-user',
      meetingId,
      meetingName: `회의 ${meetingId}`,
      joinedAt: new Date(now).toISOString(),
      linkedTodoId: linkedTodoId || undefined,
      createdAt: new Date(now).toISOString(),
    };
    addZoomSession(session);
    setActiveZoomSession(session);

    // Start study session if todo linked
    if (linkedTodoId) {
      const todo = todos.find((t) => t.id === linkedTodoId);
      if (todo) {
        if (activeSessionId) {
          updateStudySession(activeSessionId, {
            endedAt: new Date().toISOString(),
            durationSeconds: Math.floor((Date.now() - (timerStartedAt || Date.now())) / 1000),
          });
        }
        const studySessionId = generateId();
        addStudySession({
          id: studySessionId,
          userId: 'demo-user',
          todoId: linkedTodoId,
          subjectId: todo.subjectId,
          startedAt: new Date(now).toISOString(),
          durationSeconds: 0,
          source: 'zoom',
          isCamstudy: true,
          zoomSessionId: sessionId,
        });
        setActiveTimer(studySessionId, linkedTodoId, now);
        updateTodo(linkedTodoId, { status: 'in-progress' });
      }
    }

    if (camOn) {
      await startCamera();
      // Auto-capture every 30 minutes
      captureIntervalRef.current = setInterval(() => {
        capturePhoto();
      }, 30 * 60 * 1000);
    }
  }

  function leaveSession() {
    if (!activeZoomSession) return;
    const dur = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    updateZoomSession(activeZoomSession.id, {
      leftAt: new Date().toISOString(),
      durationSeconds: dur,
    });

    if (activeSessionId && timerStartedAt) {
      const studyDur = Math.floor((Date.now() - timerStartedAt) / 1000);
      updateStudySession(activeSessionId, {
        endedAt: new Date().toISOString(),
        durationSeconds: studyDur,
      });
      setActiveTimer(null, null, null);
    }

    stopCamera();
    setActiveZoomSession(null);
    setSessionElapsed(0);
  }

  const recentSessions = zoomSessions
    .filter((z) => z.joinedAt.startsWith(today))
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <h2 className="text-2xl font-black text-gray-900 mb-6">캠스터디</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Join panel */}
        <div className="space-y-4">
          {!isInSession ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">캠스터디 입장</h3>

              <Input
                label="회의 ID"
                placeholder="000-000-0000"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              />
              <Input
                label="비밀번호 (선택)"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="표시 이름"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연결할 투두 (선택)</label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-900 outline-none"
                  value={linkedTodoId}
                  onChange={(e) => setLinkedTodoId(e.target.value)}
                >
                  <option value="">과목 미연결</option>
                  {todayTodos.map((t) => {
                    const sub = subjects.find((s) => s.id === t.subjectId);
                    return <option key={t.id} value={t.id}>[{sub?.name}] {t.title}</option>;
                  })}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={camOn} onChange={(e) => setCamOn(e.target.checked)} className="w-4 h-4 rounded" />
                  <Video size={16} className="text-gray-600" />
                  <span className="text-sm">카메라</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} className="w-4 h-4 rounded" />
                  <Mic size={16} className="text-gray-600" />
                  <span className="text-sm">마이크</span>
                </label>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={joinSession}
                disabled={!meetingId}
              >
                <Video size={20} />
                캠스터디 입장
              </Button>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>참고:</strong> Zoom Meeting SDK 연동은 실제 Zoom SDK 키 설정이 필요합니다.
                현재는 카메라/타이머 기능으로 동작합니다. 실제 Zoom 입장은 SDK 키 설정 후 활성화됩니다.
              </div>
            </div>
          ) : (
            <div className="bg-black rounded-2xl p-6 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">캠스터디 진행 중</p>
                  <p className="font-bold text-lg">{activeZoomSession.meetingId}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">경과 시간</p>
                  <p className="text-2xl font-black font-mono">{formatDurationShort(sessionElapsed)}</p>
                </div>
              </div>

              {/* Camera preview */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoOff size={40} className="text-gray-600" />
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-red-500 rounded-full w-2 h-2 animate-pulse" />
                <div className="absolute top-3 right-3 text-xs text-white bg-black/60 rounded-full px-2 py-0.5">LIVE</div>
              </div>

              {linkedTodoId && (
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">연결된 투두</p>
                  <p className="font-medium text-sm">{todos.find((t) => t.id === linkedTodoId)?.title}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-full py-2.5 text-sm font-medium transition-colors"
                >
                  <Camera size={16} />
                  지금 캡처
                </button>
                <button
                  onClick={leaveSession}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 rounded-full py-2.5 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  퇴장
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: today's camstudy sessions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">오늘의 캠스터디 기록</h3>
            {recentSessions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">아직 캠스터디 기록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((z) => {
                  const linkedTodo = todos.find((t) => t.id === z.linkedTodoId);
                  const sub = linkedTodo ? subjects.find((s) => s.id === linkedTodo.subjectId) : null;
                  return (
                    <div key={z.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-black rounded-full shrink-0">
                        <Video size={16} className="text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{z.meetingId}</p>
                        {linkedTodo && (
                          <p className="text-xs text-gray-500">{sub?.name} · {linkedTodo.title}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(z.joinedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          {z.leftAt && ` ~ ${new Date(z.leftAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                      {z.durationSeconds && (
                        <span className="text-sm font-bold text-gray-900 shrink-0">
                          {formatDuration(z.durationSeconds)}
                        </span>
                      )}
                      {!z.leftAt && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold shrink-0">LIVE</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">캠스터디 기능</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 shrink-0" />
                입장 시 공부시간 자동 기록 시작
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 shrink-0" />
                30분마다 카메라 자동 캡처 → 인증 사진으로 저장
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 shrink-0" />
                "지금 캡처" 버튼으로 수동 인증 사진 저장
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 shrink-0" />
                타임라인에 금색 테두리로 표시
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
