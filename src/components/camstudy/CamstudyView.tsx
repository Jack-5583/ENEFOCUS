'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, LogOut, Camera, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateId, formatDurationShort, formatDuration, getToday, subjectColorMap } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CameraCapture, type CameraCaptureHandle } from './CameraCapture';
import { uploadPhoto } from '@/lib/photoStorage';

const CAPTURE_INTERVAL_MS = 30 * 60 * 1000;

interface SavedRoom {
  id: string;
  name: string;
  url: string;
  linkedTodoId?: string;
}

export function CamstudyView() {
  const {
    activeZoomSession, setActiveZoomSession, addZoomSession, updateZoomSession,
    zoomSessions, todos, subjects, addStudySession, updateStudySession,
    activeSessionId, timerStartedAt, setActiveTimer, updateTodo,
    addProofPhoto, proofPhotos,
  } = useStore();

  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', url: '', linkedTodoId: '' });
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [autoCapture, setAutoCapture] = useState(true);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState(0);

  const cameraRef = useRef<CameraCaptureHandle>(null);
  const sessionStartRef = useRef<number>(0);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const today = getToday();
  const todayTodos = todos.filter((t) => t.date === today && t.status !== 'completed');
  const isInSession = !!activeZoomSession;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ene-saved-rooms-v2');
      if (stored) setSavedRooms(JSON.parse(stored));
    } catch {}
  }, []);

  function persistRooms(rooms: SavedRoom[]) {
    setSavedRooms(rooms);
    localStorage.setItem('ene-saved-rooms-v2', JSON.stringify(rooms));
  }

  useEffect(() => {
    if (!isInSession) return;
    const interval = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInSession]);

  const performCapture = useCallback(async () => {
    const url = cameraRef.current?.capture();
    if (!url) return;
    const state = useStore.getState();
    const currentTodoId = state.activeTodoId || state.activeZoomSession?.linkedTodoId;
    const currentSessionId = state.activeSessionId;
    const now = new Date().toISOString();
    const { url: storedUrl, storageType } = await uploadPhoto(url, 'demo-user', now);
    state.addProofPhoto({
      id: generateId(),
      userId: 'demo-user',
      todoId: currentTodoId || undefined,
      studySessionId: currentSessionId || undefined,
      imageUrl: storedUrl,
      storageType,
      source: 'webcam_snapshot',
      capturedAt: now,
    });
    setLastCapture(storedUrl);
    setCaptureCount((c) => c + 1);
  }, []);

  function startAutoCapture() {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    setNextCaptureIn(CAPTURE_INTERVAL_MS / 1000);
    captureTimerRef.current = setInterval(() => {
      performCapture();
      setNextCaptureIn(CAPTURE_INTERVAL_MS / 1000);
    }, CAPTURE_INTERVAL_MS);
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

  async function startSession(room: SavedRoom) {
    const now = Date.now();
    sessionStartRef.current = now;
    setSessionElapsed(0);
    setCaptureCount(0);
    setLastCapture(null);

    window.open(room.url, '_blank', 'noopener,noreferrer');

    const sessionId = generateId();
    const linkedTodoId = room.linkedTodoId || undefined;
    const session = {
      id: sessionId,
      userId: 'demo-user',
      meetingId: room.id,
      meetingName: room.name,
      joinedAt: new Date(now).toISOString(),
      linkedTodoId,
      createdAt: new Date(now).toISOString(),
    };
    addZoomSession(session);
    setActiveZoomSession(session);

    if (linkedTodoId) {
      const todo = todos.find((t) => t.id === linkedTodoId);
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

    if (autoCapture) startAutoCapture();
  }

  function endSession() {
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
    setActiveZoomSession(null);
    setSessionElapsed(0);
  }

  function addRoom() {
    if (!newRoom.name.trim() || !newRoom.url.trim()) return;
    let url = newRoom.url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const room: SavedRoom = {
      id: generateId(),
      name: newRoom.name.trim(),
      url,
      linkedTodoId: newRoom.linkedTodoId || undefined,
    };
    persistRooms([...savedRooms, room]);
    setNewRoom({ name: '', url: '', linkedTodoId: '' });
    setShowAddRoom(false);
  }

  function deleteRoom(id: string) {
    persistRooms(savedRooms.filter((r) => r.id !== id));
  }

  const recentSessions = zoomSessions
    .filter((z) => z.joinedAt.startsWith(today))
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  const todayCaptures = proofPhotos.filter((p) =>
    p.source === 'webcam_snapshot' && p.capturedAt.startsWith(today)
  );

  const activeLinkedTodo = todos.find((t) => t.id === activeZoomSession?.linkedTodoId);
  const activeSubject = activeLinkedTodo ? subjects.find((s) => s.id === activeLinkedTodo.subjectId) : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <h2 className="text-2xl font-black text-gray-900 mb-6">캠스터디</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-3 space-y-4">
          {!isInSession ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">캠스터디 방 목록</h3>
                <Button size="sm" variant="subtle" onClick={() => setShowAddRoom(!showAddRoom)}>
                  <Plus size={14} />
                  방 추가
                </Button>
              </div>

              {showAddRoom && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">새 방 추가</h4>
                  <Input
                    label="방 이름"
                    placeholder="상산 집중방 1"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom((r) => ({ ...r, name: e.target.value }))}
                  />
                  <Input
                    label="회의 URL"
                    placeholder="https://zoom.us/j/... 또는 meet.google.com/..."
                    value={newRoom.url}
                    onChange={(e) => setNewRoom((r) => ({ ...r, url: e.target.value }))}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연결할 투두 (선택)</label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none"
                      value={newRoom.linkedTodoId}
                      onChange={(e) => setNewRoom((r) => ({ ...r, linkedTodoId: e.target.value }))}
                    >
                      <option value="">미연결</option>
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      fullWidth
                      onClick={addRoom}
                      disabled={!newRoom.name.trim() || !newRoom.url.trim()}
                    >
                      추가
                    </Button>
                    <Button size="sm" variant="subtle" onClick={() => setShowAddRoom(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

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

              {savedRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Video size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">저장된 방이 없습니다</p>
                  <p className="text-xs mt-1">Zoom, Google Meet 등의 회의 링크를 저장해두세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRooms.map((room) => {
                    const linkedTodo = todos.find((t) => t.id === room.linkedTodoId);
                    const sub = linkedTodo ? subjects.find((s) => s.id === linkedTodo.subjectId) : null;
                    return (
                      <div key={room.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{room.name}</p>
                          <p className="text-xs text-gray-400 truncate">{room.url}</p>
                          {linkedTodo && (
                            <p className="text-xs text-gray-500 mt-0.5">{sub?.name} · {linkedTodo.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => startSession(room)}>
                            <ExternalLink size={14} />
                            시작
                          </Button>
                          <button
                            onClick={() => deleteRoom(room.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Active session */
            <div className="space-y-4">
              <div className="bg-black rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider font-bold">캠스터디 진행 중</p>
                    <p className="font-bold text-lg">{activeZoomSession.meetingName}</p>
                    {activeLinkedTodo && (
                      <p className="text-white/70 text-sm">{activeSubject?.name} · {activeLinkedTodo.title}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">경과 시간</p>
                    <p className="text-3xl font-black font-mono tabular-nums">{formatDurationShort(sessionElapsed)}</p>
                  </div>
                </div>

                {autoCapture && (
                  <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm text-white/80">자동 캡처 ON</span>
                      <span className="text-xs text-white/50">({captureCount}회)</span>
                    </div>
                    {nextCaptureIn > 0 && (
                      <span className="text-xs text-white/60">
                        다음: {Math.floor(nextCaptureIn / 60)}분 {nextCaptureIn % 60}초 후
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={performCapture}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center"
                  >
                    <Camera size={16} />
                    지금 캡처
                  </button>
                  <button
                    onClick={endSession}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 rounded-full px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center"
                  >
                    <LogOut size={16} />
                    종료
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl overflow-hidden">
                <div className="p-3 bg-gray-800 flex items-center justify-between">
                  <span className="text-white text-sm font-medium">내 카메라</span>
                  <span className="text-xs text-gray-400">인증 캡처에 사용</span>
                </div>
                <div className="p-3">
                  <CameraCapture
                    ref={cameraRef}
                    autoStart
                    showControls={false}
                    className="rounded-xl overflow-hidden"
                  />
                </div>
                <div className="px-3 pb-3">
                  <button
                    onClick={performCapture}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    <Camera size={14} />
                    수동 캡처 ({captureCount}회 완료)
                  </button>
                </div>
              </div>

              {lastCapture && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">최근 캡처</p>
                  <img src={lastCapture} alt="최근 캡처" className="w-full rounded-xl object-cover max-h-40" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
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

            {todayCaptures.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2">오늘의 캡처 사진</p>
                <div className="grid grid-cols-4 gap-1">
                  {todayCaptures.slice(-8).map((p) => (
                    <img key={p.id} src={p.imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

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
                      <p className="font-medium text-sm text-white">{activeZoomSession.meetingName}</p>
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

          {!isInSession && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">카메라 미리보기</p>
              <CameraCapture
                showControls
                onCapture={async (url) => {
                  const now = new Date().toISOString();
                  const { url: storedUrl, storageType } = await uploadPhoto(url, 'demo-user', now);
                  addProofPhoto({
                    id: generateId(),
                    userId: 'demo-user',
                    imageUrl: storedUrl,
                    storageType,
                    source: 'webcam_snapshot',
                    capturedAt: now,
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
