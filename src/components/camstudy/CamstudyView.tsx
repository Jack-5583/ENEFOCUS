'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, VideoOff, LogOut, Clock, Camera, Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateId, formatDurationShort, formatDuration, getToday, subjectColorMap } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CameraCapture, type CameraCaptureHandle } from './CameraCapture';

const CAPTURE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface ZoomForm {
  meetingId: string;
  password: string;
  displayName: string;
  linkedTodoId: string;
  role: 0 | 1;
}

export function CamstudyView() {
  const {
    activeZoomSession, setActiveZoomSession, addZoomSession, updateZoomSession,
    zoomSessions, todos, subjects, studySessions, addStudySession, updateStudySession,
    activeSessionId, activeTodoId, timerStartedAt, setActiveTimer, updateTodo,
    addProofPhoto, proofPhotos,
  } = useStore();

  const [form, setForm] = useState<ZoomForm>({
    meetingId: '',
    password: '',
    displayName: '김성현',
    linkedTodoId: '',
    role: 0,
  });
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [savedRooms, setSavedRooms] = useState<Array<{ name: string; id: string; pw: string }>>([]);
  const [showSavedRooms, setShowSavedRooms] = useState(false);
  const [showZoomFrame, setShowZoomFrame] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState(0);
  const [zoomDemoMode, setZoomDemoMode] = useState(false);
  const [zoomSignature, setZoomSignature] = useState('');

  const cameraRef = useRef<CameraCaptureHandle>(null);
  const sessionStartRef = useRef<number>(0);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const today = getToday();
  const todayTodos = todos.filter((t) => t.date === today && t.status !== 'completed');
  const isInSession = !!activeZoomSession;

  // Load saved rooms
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ene-saved-rooms');
      if (stored) setSavedRooms(JSON.parse(stored));
    } catch {}
  }, []);

  // Session elapsed timer
  useEffect(() => {
    if (!isInSession) return;
    const interval = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInSession]);

  // Auto-capture logic
  function startAutoCapture() {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    setNextCaptureIn(CAPTURE_INTERVAL_MS / 1000);

    captureTimerRef.current = setInterval(() => {
      performCapture('auto');
      setNextCaptureIn(CAPTURE_INTERVAL_MS / 1000);
    }, CAPTURE_INTERVAL_MS);

    // Countdown timer
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setNextCaptureIn((prev) => Math.max(0, prev - 1));
    }, 1000);
  }

  function stopAutoCapture() {
    if (captureTimerRef.current) { clearInterval(captureTimerRef.current); captureTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setNextCaptureIn(0);
  }

  const performCapture = useCallback((source: 'auto' | 'manual') => {
    const url = cameraRef.current?.capture();
    if (!url) return;

    const currentTodoId = useStore.getState().activeTodoId || activeZoomSession?.linkedTodoId;
    const currentSessionId = useStore.getState().activeSessionId;

    const photo = {
      id: generateId(),
      userId: 'demo-user',
      todoId: currentTodoId || undefined,
      studySessionId: currentSessionId || undefined,
      imageUrl: url,
      source: source === 'auto' ? ('webcam_snapshot' as const) : ('webcam_snapshot' as const),
      capturedAt: new Date().toISOString(),
      memo: source === 'auto' ? `자동 캡처 #${captureCount + 1}` : '수동 캡처',
    };
    addProofPhoto(photo);
    setLastCapture(url);
    setCaptureCount((c) => c + 1);
    return url;
  }, [activeZoomSession, captureCount, addProofPhoto]);

  async function fetchZoomSignature(meetingNumber: string) {
    try {
      const res = await fetch('/api/zoom/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingNumber, role: form.role }),
      });
      const data = await res.json();
      if (data.demoMode) { setZoomDemoMode(true); return null; }
      setZoomSignature(data.signature);
      return { signature: data.signature, sdkKey: data.sdkKey };
    } catch { return null; }
  }

  async function joinSession() {
    if (!form.meetingId.trim()) return;
    const now = Date.now();
    sessionStartRef.current = now;
    setSessionElapsed(0);
    setCaptureCount(0);
    setLastCapture(null);

    // Try to get Zoom signature
    const zoomCreds = await fetchZoomSignature(form.meetingId.replace(/\D/g, ''));

    const sessionId = generateId();
    const session = {
      id: sessionId,
      userId: 'demo-user',
      meetingId: form.meetingId,
      meetingName: savedRooms.find((r) => r.id === form.meetingId)?.name || `회의 ${form.meetingId}`,
      joinedAt: new Date(now).toISOString(),
      linkedTodoId: form.linkedTodoId || undefined,
      createdAt: new Date(now).toISOString(),
    };
    addZoomSession(session);
    setActiveZoomSession(session);

    // Start linked study session
    if (form.linkedTodoId) {
      const todo = todos.find((t) => t.id === form.linkedTodoId);
      if (todo) {
        if (activeSessionId && timerStartedAt) {
          updateStudySession(activeSessionId, {
            endedAt: new Date().toISOString(),
            durationSeconds: Math.floor((Date.now() - timerStartedAt) / 1000),
          });
        }
        const studySessionId = generateId();
        addStudySession({
          id: studySessionId,
          userId: 'demo-user',
          todoId: form.linkedTodoId,
          subjectId: todo.subjectId,
          startedAt: new Date(now).toISOString(),
          durationSeconds: 0,
          source: 'zoom',
          isCamstudy: true,
          zoomSessionId: sessionId,
        });
        setActiveTimer(studySessionId, form.linkedTodoId, now);
        updateTodo(form.linkedTodoId, { status: 'in-progress' });
      }
    }

    if (zoomCreds) {
      setShowZoomFrame(true);
    }

    if (autoCapture) startAutoCapture();
  }

  function leaveSession() {
    if (!activeZoomSession) return;
    const dur = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    updateZoomSession(activeZoomSession.id, {
      leftAt: new Date().toISOString(),
      durationSeconds: dur,
    });
    if (activeSessionId && timerStartedAt) {
      updateStudySession(activeSessionId, {
        endedAt: new Date().toISOString(),
        durationSeconds: Math.floor((Date.now() - timerStartedAt) / 1000),
      });
      setActiveTimer(null, null, null);
    }
    stopAutoCapture();
    setShowZoomFrame(false);
    setActiveZoomSession(null);
    setSessionElapsed(0);
  }

  function saveRoom() {
    if (!form.meetingId.trim()) return;
    const name = prompt('이 방의 이름을 입력하세요 (예: 상산 집중방)');
    if (!name) return;
    const rooms = [...savedRooms, { name, id: form.meetingId, pw: form.password }];
    setSavedRooms(rooms);
    localStorage.setItem('ene-saved-rooms', JSON.stringify(rooms));
  }

  function deleteRoom(idx: number) {
    const rooms = savedRooms.filter((_, i) => i !== idx);
    setSavedRooms(rooms);
    localStorage.setItem('ene-saved-rooms', JSON.stringify(rooms));
  }

  const recentSessions = zoomSessions
    .filter((z) => z.joinedAt.startsWith(today))
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  const todayCaptures = proofPhotos.filter((p) =>
    p.source === 'webcam_snapshot' && p.capturedAt.startsWith(today)
  );

  const activeLinkedTodo = todos.find((t) => t.id === (activeZoomSession?.linkedTodoId || form.linkedTodoId));
  const activeSubject = activeLinkedTodo ? subjects.find((s) => s.id === activeLinkedTodo.subjectId) : null;
  const colors = activeSubject ? subjectColorMap[activeSubject.color] : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <h2 className="text-2xl font-black text-gray-900 mb-6">캠스터디</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Join/Session panel */}
        <div className="lg:col-span-3 space-y-4">
          {!isInSession ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">캠스터디 입장</h3>
                {savedRooms.length > 0 && (
                  <button
                    onClick={() => setShowSavedRooms(!showSavedRooms)}
                    className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-800"
                  >
                    저장된 방 ({savedRooms.length})
                    {showSavedRooms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {/* Saved rooms */}
              {showSavedRooms && (
                <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                  {savedRooms.map((room, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        className="flex-1 text-left p-2 bg-white rounded-lg text-sm hover:bg-gray-50 border border-gray-100"
                        onClick={() => {
                          setForm((f) => ({ ...f, meetingId: room.id, password: room.pw }));
                          setShowSavedRooms(false);
                        }}
                      >
                        <span className="font-medium text-gray-900">{room.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{room.id}</span>
                      </button>
                      <button
                        onClick={() => deleteRoom(idx)}
                        className="text-red-400 hover:text-red-600 text-xs px-2"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="회의 ID"
                  placeholder="000-000-0000"
                  value={form.meetingId}
                  onChange={(e) => setForm((f) => ({ ...f, meetingId: e.target.value }))}
                />
                <Input
                  label="비밀번호"
                  type="password"
                  placeholder="(없으면 비워두기)"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>

              <Input
                label="표시 이름"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연결할 투두 (선택)</label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-900 outline-none"
                  value={form.linkedTodoId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedTodoId: e.target.value }))}
                >
                  <option value="">과목 미연결 (나중에 연결 가능)</option>
                  {todayTodos.map((t) => {
                    const sub = subjects.find((s) => s.id === t.subjectId);
                    return (
                      <option key={t.id} value={t.id}>
                        [{sub?.name || ''}] {t.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">참가 역할</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2 ${form.role === 0 ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}
                    onClick={() => setForm((f) => ({ ...f, role: 0 }))}
                  >
                    참가자
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2 ${form.role === 1 ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}
                    onClick={() => setForm((f) => ({ ...f, role: 1 }))}
                  >
                    호스트
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="autoCapture"
                  checked={autoCapture}
                  onChange={(e) => setAutoCapture(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="autoCapture" className="text-sm text-gray-700">
                  30분마다 자동 인증 캡처
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  fullWidth
                  size="lg"
                  onClick={joinSession}
                  disabled={!form.meetingId.trim()}
                >
                  <Video size={20} />
                  캠스터디 입장
                </Button>
                {form.meetingId && (
                  <Button
                    variant="subtle"
                    size="lg"
                    onClick={saveRoom}
                    className="shrink-0"
                  >
                    저장
                  </Button>
                )}
              </div>

              {zoomDemoMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Zoom SDK 데모 모드:</strong> .env.local에
                    <code className="bg-amber-100 px-1 rounded ml-1">ZOOM_SDK_KEY</code>와
                    <code className="bg-amber-100 px-1 rounded ml-1">ZOOM_SDK_SECRET</code>을
                    설정하면 실제 Zoom 회의에 참가할 수 있습니다.
                    현재는 카메라 + 시간 기록 기능으로 동작합니다.
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active session */
            <div className="space-y-4">
              {/* Session header */}
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: colors ? `linear-gradient(135deg, ${colors.bg.replace('bg-', '')} 0%, #000 100%)` : '#000' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider font-bold">캠스터디 진행 중</p>
                    <p className="font-bold text-lg">{activeZoomSession.meetingName || activeZoomSession.meetingId}</p>
                    {activeLinkedTodo && (
                      <p className="text-white/70 text-sm">{activeSubject?.name} · {activeLinkedTodo.title}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">경과 시간</p>
                    <p className="text-3xl font-black font-mono tabular-nums">{formatDurationShort(sessionElapsed)}</p>
                  </div>
                </div>

                {/* Auto-capture status */}
                {autoCapture && (
                  <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm text-white/80">자동 캡처 ON</span>
                      <span className="text-xs text-white/50">({captureCount}회 캡처)</span>
                    </div>
                    {nextCaptureIn > 0 && (
                      <span className="text-xs text-white/60">
                        다음 캡처: {Math.floor(nextCaptureIn / 60)}분 {nextCaptureIn % 60}초 후
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => performCapture('manual')}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center"
                  >
                    <Camera size={16} />
                    지금 캡처
                  </button>
                  <button
                    onClick={leaveSession}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 rounded-full px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center"
                  >
                    <LogOut size={16} />
                    퇴장
                  </button>
                </div>
              </div>

              {/* Camera preview */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden">
                <div className="p-3 bg-gray-800 flex items-center justify-between">
                  <span className="text-white text-sm font-medium">내 카메라</span>
                  <span className="text-xs text-gray-400">인증 캡처에 사용</span>
                </div>
                <div className="p-3">
                  <CameraCapture
                    ref={cameraRef}
                    autoStart
                    onCapture={(url) => {
                      setLastCapture(url);
                    }}
                    showControls={false}
                    className="rounded-xl overflow-hidden"
                  />
                </div>

                {/* Camera controls */}
                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={() => performCapture('manual')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    <Camera size={14} />
                    수동 캡처
                  </button>
                  <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">
                    캡처: {captureCount}회
                  </div>
                </div>
              </div>

              {/* Latest capture preview */}
              {lastCapture && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">최근 캡처</p>
                  <img
                    src={lastCapture}
                    alt="최근 캡처"
                    className="w-full rounded-xl object-cover max-h-40"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Stats & History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today camstudy summary */}
          <div className="bg-black text-white rounded-2xl p-5">
            <h3 className="font-bold text-white mb-4">오늘 캠스터디 요약</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-xs mb-1">총 캠스터디</p>
                <p className="text-xl font-black">
                  {formatDuration(
                    recentSessions.reduce((a, z) => a + (z.durationSeconds || 0), 0) + (isInSession ? sessionElapsed : 0)
                  )}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-xs mb-1">인증 캡처</p>
                <p className="text-xl font-black">{todayCaptures.length}<span className="text-gray-400 text-sm">장</span></p>
              </div>
            </div>

            {/* Capture gallery */}
            {todayCaptures.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2">오늘의 캡처 사진</p>
                <div className="grid grid-cols-4 gap-1">
                  {todayCaptures.slice(-8).map((p) => (
                    <img
                      key={p.id}
                      src={p.imageUrl}
                      alt=""
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Session history */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">오늘의 세션 기록</h3>
            {recentSessions.length === 0 && !isInSession ? (
              <p className="text-gray-400 text-sm text-center py-4">아직 캠스터디 기록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {isInSession && (
                  <div className="flex items-center gap-3 p-3 bg-black rounded-xl">
                    <div className="p-2 bg-yellow-500/20 rounded-full shrink-0">
                      <Video size={14} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white">{activeZoomSession?.meetingId}</p>
                      <p className="text-xs text-gray-400">진행 중 · {formatDurationShort(sessionElapsed)}</p>
                    </div>
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">LIVE</span>
                  </div>
                )}
                {recentSessions.map((z) => {
                  const linkedTodo = todos.find((t) => t.id === z.linkedTodoId);
                  const sub = linkedTodo ? subjects.find((s) => s.id === linkedTodo.subjectId) : null;
                  const sessionColors = sub ? subjectColorMap[sub.color] : null;
                  return (
                    <div key={z.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`p-2 rounded-full shrink-0 ${sessionColors ? sessionColors.light : 'bg-gray-100'}`}>
                        <Video size={14} className={sessionColors ? sessionColors.text : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{z.meetingName || z.meetingId}</p>
                        {linkedTodo && (
                          <p className="text-xs text-gray-500">{sub?.name} · {linkedTodo.title}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(z.joinedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          {z.leftAt && ` ~ ${new Date(z.leftAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                      {z.durationSeconds ? (
                        <span className="text-sm font-bold text-gray-900 shrink-0">{formatDuration(z.durationSeconds)}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Camera not in session */}
          {!isInSession && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">카메라 미리보기 (테스트)</p>
              <CameraCapture
                showControls
                onCapture={(url) => {
                  addProofPhoto({
                    id: generateId(),
                    userId: 'demo-user',
                    imageUrl: url,
                    source: 'webcam_snapshot',
                    capturedAt: new Date().toISOString(),
                    memo: '테스트 캡처',
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
