'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, LogOut, Camera, Plus, Trash2, ExternalLink, Link2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { generateId, formatDurationShort, formatDuration, getToday, subjectColorMap } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CameraCapture, type CameraCaptureHandle } from './CameraCapture';
import { ZoomEmbedded } from './ZoomEmbedded';
import { uploadPhoto } from '@/lib/photoStorage';

const CAPTURE_INTERVAL_MS = 30 * 60 * 1000;

interface ZoomRoom {
  id: string;
  name: string;
  type: 'zoom';
  meetingId: string;
  password: string;
  role: 0 | 1;
  linkedTodoId?: string;
}

interface ExternalRoom {
  id: string;
  name: string;
  type: 'external';
  url: string;
  linkedTodoId?: string;
}

type SavedRoom = ZoomRoom | ExternalRoom;

interface ZoomCreds {
  signature: string;
  sdkKey: string;
}

export function CamstudyView() {
  const {
    activeZoomSession, setActiveZoomSession, addZoomSession, updateZoomSession,
    zoomSessions, todos, subjects, addStudySession, updateStudySession,
    activeSessionId, timerStartedAt, setActiveTimer, updateTodo,
    addProofPhoto, proofPhotos, user,
  } = useStore();

  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addType, setAddType] = useState<'zoom' | 'external'>('zoom');
  const [newZoom, setNewZoom] = useState({ name: '', meetingId: '', password: '', role: 0 as 0 | 1, linkedTodoId: '' });
  const [newExternal, setNewExternal] = useState({ name: '', url: '', linkedTodoId: '' });

  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [autoCapture, setAutoCapture] = useState(true);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState(0);
  const [zoomCreds, setZoomCreds] = useState<ZoomCreds | null>(null);
  const [activeRoomType, setActiveRoomType] = useState<'zoom' | 'external'>('zoom');

  const cameraRef = useRef<CameraCaptureHandle>(null);
  const sessionStartRef = useRef<number>(0);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const today = getToday();
  const todayTodos = todos.filter((t) => t.date === today && t.status !== 'completed');
  const isInSession = !!activeZoomSession;
  const userName = user?.name ?? '학생';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ene-saved-rooms-v3');
      if (stored) setSavedRooms(JSON.parse(stored));
    } catch {}
  }, []);

  function persistRooms(rooms: SavedRoom[]) {
    setSavedRooms(rooms);
    localStorage.setItem('ene-saved-rooms-v3', JSON.stringify(rooms));
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
    const { url: storedUrl, storageType } = await uploadPhoto(url, state.user?.id ?? 'demo-user', now);
    state.addProofPhoto({
      id: generateId(),
      userId: state.user?.id ?? 'demo-user',
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
    setActiveRoomType(room.type);

    let creds: ZoomCreds | null = null;

    if (room.type === 'zoom') {
      try {
        const res = await fetch('/api/zoom/signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingNumber: room.meetingId.replace(/\D/g, ''), role: room.role }),
        });
        const data = await res.json();
        if (!data.demoMode) creds = { signature: data.signature, sdkKey: data.sdkKey };
      } catch {}
    } else {
      window.open(room.url, '_blank', 'noopener,noreferrer');
    }

    setZoomCreds(creds);

    const sessionId = generateId();
    const linkedTodoId = room.linkedTodoId || undefined;
    const meetingName = room.name;
    const meetingId = room.type === 'zoom' ? room.meetingId : room.url;

    const session = {
      id: sessionId,
      userId: user?.id ?? 'demo-user',
      meetingId,
      meetingName,
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
          userId: user?.id ?? 'demo-user',
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
    setZoomCreds(null);
    setSessionElapsed(0);
  }

  function addRoom() {
    if (addType === 'zoom') {
      if (!newZoom.name.trim() || !newZoom.meetingId.trim()) return;
      const room: ZoomRoom = {
        id: generateId(),
        name: newZoom.name.trim(),
        type: 'zoom',
        meetingId: newZoom.meetingId.trim(),
        password: newZoom.password,
        role: newZoom.role,
        linkedTodoId: newZoom.linkedTodoId || undefined,
      };
      persistRooms([...savedRooms, room]);
      setNewZoom({ name: '', meetingId: '', password: '', role: 0, linkedTodoId: '' });
    } else {
      if (!newExternal.name.trim() || !newExternal.url.trim()) return;
      let url = newExternal.url.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      const room: ExternalRoom = {
        id: generateId(),
        name: newExternal.name.trim(),
        type: 'external',
        url,
        linkedTodoId: newExternal.linkedTodoId || undefined,
      };
      persistRooms([...savedRooms, room]);
      setNewExternal({ name: '', url: '', linkedTodoId: '' });
    }
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

  const showEmbeddedZoom = isInSession && activeRoomType === 'zoom' && zoomCreds;
  const activeRoom = isInSession
    ? savedRooms.find((r) =>
        r.type === 'zoom'
          ? r.meetingId === activeZoomSession?.meetingId
          : r.url === activeZoomSession?.meetingId
      )
    : null;

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <h2 className="text-2xl font-black text-gray-900 mb-6">캠스터디</h2>

      {!isInSession ? (
        /* ── 방 목록 ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${addType === 'zoom' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}
                      onClick={() => setAddType('zoom')}
                    >
                      Zoom 방
                    </button>
                    <button
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${addType === 'external' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}
                      onClick={() => setAddType('external')}
                    >
                      외부 링크
                    </button>
                  </div>

                  {addType === 'zoom' ? (
                    <>
                      <Input
                        label="방 이름"
                        placeholder="상산 집중방 1"
                        value={newZoom.name}
                        onChange={(e) => setNewZoom((r) => ({ ...r, name: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="회의 ID"
                          placeholder="000-000-0000"
                          value={newZoom.meetingId}
                          onChange={(e) => setNewZoom((r) => ({ ...r, meetingId: e.target.value }))}
                        />
                        <Input
                          label="비밀번호"
                          type="password"
                          placeholder="(없으면 비워두기)"
                          value={newZoom.password}
                          onChange={(e) => setNewZoom((r) => ({ ...r, password: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                        <div className="flex gap-2">
                          {(['참가자', '호스트'] as const).map((label, idx) => (
                            <button
                              key={label}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${newZoom.role === idx ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}
                              onClick={() => setNewZoom((r) => ({ ...r, role: idx as 0 | 1 }))}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Input
                        label="방 이름"
                        placeholder="Google Meet 집중방"
                        value={newExternal.name}
                        onChange={(e) => setNewExternal((r) => ({ ...r, name: e.target.value }))}
                      />
                      <Input
                        label="회의 URL"
                        placeholder="https://meet.google.com/..."
                        value={newExternal.url}
                        onChange={(e) => setNewExternal((r) => ({ ...r, url: e.target.value }))}
                      />
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연결할 투두 (선택)</label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none"
                      value={addType === 'zoom' ? newZoom.linkedTodoId : newExternal.linkedTodoId}
                      onChange={(e) =>
                        addType === 'zoom'
                          ? setNewZoom((r) => ({ ...r, linkedTodoId: e.target.value }))
                          : setNewExternal((r) => ({ ...r, linkedTodoId: e.target.value }))
                      }
                    >
                      <option value="">미연결</option>
                      {todayTodos.map((t) => {
                        const sub = subjects.find((s) => s.id === t.subjectId);
                        return <option key={t.id} value={t.id}>[{sub?.name}] {t.title}</option>;
                      })}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" fullWidth onClick={addRoom}>추가</Button>
                    <Button size="sm" variant="subtle" onClick={() => setShowAddRoom(false)}>취소</Button>
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
                <div className="text-center py-10 text-gray-400">
                  <Video size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">저장된 방이 없습니다</p>
                  <p className="text-xs mt-1">Zoom 회의 ID 또는 Google Meet 링크를 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRooms.map((room) => {
                    const linkedTodo = todos.find((t) => t.id === room.linkedTodoId);
                    const sub = linkedTodo ? subjects.find((s) => s.id === linkedTodo.subjectId) : null;
                    const colors = sub ? subjectColorMap[sub.color] : null;
                    return (
                      <div key={room.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className={`p-2 rounded-full shrink-0 ${colors ? colors.light : 'bg-gray-200'}`}>
                          {room.type === 'zoom'
                            ? <Video size={16} className={colors ? colors.text : 'text-gray-500'} />
                            : <Link2 size={16} className={colors ? colors.text : 'text-gray-500'} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">{room.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.type === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                              {room.type === 'zoom' ? 'Zoom' : '외부'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {room.type === 'zoom' ? `ID: ${room.meetingId}` : room.url}
                          </p>
                          {linkedTodo && (
                            <p className="text-xs text-gray-500 mt-0.5">{sub?.name} · {linkedTodo.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => startSession(room)}>
                            시작
                          </Button>
                          <button onClick={() => deleteRoom(room.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 요약 + 카메라 */}
          <div className="space-y-4">
            <div className="bg-black text-white rounded-2xl p-5">
              <h3 className="font-bold mb-4">오늘 캠스터디 요약</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">총 시간</p>
                  <p className="text-lg font-black">{formatDuration(recentSessions.reduce((a, z) => a + (z.durationSeconds || 0), 0))}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">인증 캡처</p>
                  <p className="text-lg font-black">{todayCaptures.length}<span className="text-gray-400 text-sm">장</span></p>
                </div>
              </div>
              {todayCaptures.length > 0 && (
                <div className="grid grid-cols-4 gap-1">
                  {todayCaptures.slice(-8).map((p) => (
                    <img key={p.id} src={p.imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">카메라 미리보기</p>
              <CameraCapture showControls onCapture={async (url) => {
                const now = new Date().toISOString();
                const { url: su, storageType } = await uploadPhoto(url, user?.id ?? 'demo-user', now);
                addProofPhoto({ id: generateId(), userId: user?.id ?? 'demo-user', imageUrl: su, storageType, source: 'webcam_snapshot', capturedAt: now });
              }} />
            </div>
          </div>
        </div>
      ) : (
        /* ── 세션 중 ── */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Zoom / 외부 영역 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 세션 헤더 */}
            <div className="bg-black rounded-2xl p-4 text-white flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider">캠스터디 진행 중</p>
                <p className="font-bold text-lg">{activeZoomSession?.meetingName}</p>
                {activeLinkedTodo && (
                  <p className="text-white/70 text-sm">{activeSubject?.name} · {activeLinkedTodo.title}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white/60 text-xs">경과 시간</p>
                  <p className="text-3xl font-black font-mono tabular-nums">{formatDurationShort(sessionElapsed)}</p>
                </div>
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  종료
                </button>
              </div>
            </div>

            {/* Zoom 임베드 또는 외부 안내 */}
            {showEmbeddedZoom && activeRoom?.type === 'zoom' ? (
              <ZoomEmbedded
                meetingNumber={(activeRoom as ZoomRoom).meetingId}
                password={(activeRoom as ZoomRoom).password}
                userName={userName}
                role={(activeRoom as ZoomRoom).role}
                signature={zoomCreds.signature}
                sdkKey={zoomCreds.sdkKey}
                onLeave={endSession}
              />
            ) : (
              <div className="bg-gray-900 rounded-2xl p-8 text-center text-gray-400">
                {activeRoomType === 'zoom' ? (
                  <>
                    <Video size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Zoom SDK 자격증명 미설정</p>
                    <p className="text-xs mt-1">ZOOM_SDK_KEY / ZOOM_SDK_SECRET 환경변수를 설정하세요</p>
                    <a
                      href={`https://zoom.us/wc/${activeZoomSession?.meetingId?.replace(/\D/g, '')}/join`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-white text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
                    >
                      <ExternalLink size={14} />
                      브라우저에서 줌 열기
                    </a>
                  </>
                ) : (
                  <>
                    <ExternalLink size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">외부 회의가 새 탭에서 열렸습니다</p>
                    <p className="text-xs mt-1">회의가 끝나면 종료를 눌러주세요</p>
                  </>
                )}
              </div>
            )}

            {/* 자동 캡처 상태 */}
            {autoCapture && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-gray-600">자동 캡처 ON ({captureCount}회)</span>
                </div>
                {nextCaptureIn > 0 && (
                  <span className="text-xs text-gray-400">
                    다음: {Math.floor(nextCaptureIn / 60)}분 {nextCaptureIn % 60}초 후
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 카메라 + 기록 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 카메라 */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden">
              <div className="p-3 bg-gray-800 flex items-center justify-between">
                <span className="text-white text-sm font-medium">내 카메라 (인증용)</span>
              </div>
              <div className="p-3">
                <CameraCapture ref={cameraRef} autoStart showControls={false} className="rounded-xl overflow-hidden" />
              </div>
              <div className="px-3 pb-3">
                <button
                  onClick={performCapture}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <Camera size={14} />
                  지금 캡처 ({captureCount}회)
                </button>
              </div>
            </div>

            {lastCapture && (
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">최근 캡처</p>
                <img src={lastCapture} alt="최근 캡처" className="w-full rounded-xl object-cover max-h-32" />
              </div>
            )}

            {/* 오늘 세션 기록 */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">오늘 세션</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-black rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <p className="text-white text-xs flex-1">{activeZoomSession?.meetingName}</p>
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">LIVE</span>
                </div>
                {recentSessions.map((z) => {
                  const linkedTodo = todos.find((t) => t.id === z.linkedTodoId);
                  const sub = linkedTodo ? subjects.find((s) => s.id === linkedTodo.subjectId) : null;
                  return (
                    <div key={z.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                      <Video size={12} className="text-gray-400 shrink-0" />
                      <span className="flex-1 text-gray-700 truncate">{z.meetingName}</span>
                      {z.durationSeconds ? <span className="text-gray-500 shrink-0">{formatDuration(z.durationSeconds)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
