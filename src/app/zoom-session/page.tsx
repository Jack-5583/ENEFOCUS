'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ── types ──────────────────────────────────────────────────────────────────
interface ZoomError {
  type?: string;
  reason?: string;
  errorCode?: number;
  url?: string;
}

function parseZoomError(e: unknown): ZoomError {
  if (e && typeof e === 'object') return e as ZoomError;
  if (e instanceof Error) return { reason: e.message };
  return { reason: String(e) };
}

// ── script loader ──────────────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Script load failed: ${src}`));
    document.head.appendChild(s);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Window & { ReactWidgets?: any };

type Step = '스크립트 로딩' | 'SDK 초기화' | '회의 연결' | '로그인 필요' | '재연결 중' | '완료' | '실패';

// ── error descriptions ─────────────────────────────────────────────────────
const ERROR_GUIDE: Record<number, { title: string; desc: string }> = {
  3712: { title: 'SDK 키 오류', desc: 'SDK Key/Secret이 올바르지 않습니다.\nVERCEL 환경변수 ZOOM_SDK_KEY / ZOOM_SDK_SECRET을 확인하세요.' },
  3001: { title: '회의를 찾을 수 없음', desc: '회의 ID가 존재하지 않거나 만료되었습니다.' },
  200:  { title: '비밀번호 오류', desc: '회의 비밀번호가 틀렸습니다.' },
};

// ── subcomponents ──────────────────────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
      <p style={{ fontSize: 14 }}>{label}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LoginRequiredView({ meetingNumber }: { meetingNumber: string }) {
  const cleanNum = meetingNumber.replace(/\D/g, '');
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>
      <p style={{ color: '#f87171', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>이 회의는 로그인이 필요합니다</p>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 20 }}>오류 코드: 3051</p>

      <div style={{ background: '#1f2937', borderRadius: 12, padding: '16px 20px', marginBottom: 20, maxWidth: 320, textAlign: 'left' }}>
        <p style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🛠 회의 호스트가 해야 할 일</p>
        <p style={{ color: '#d1d5db', fontSize: 11, lineHeight: 1.8 }}>
          Zoom 앱 → 미팅 설정 (또는 zoom.us → 설정)<br />
          → <b style={{ color: '#fff' }}>보안</b> 탭<br />
          → <b style={{ color: '#fff' }}>"인증된 사용자만 미팅에 참여"</b> OFF
        </p>
      </div>

      <a
        href={`https://zoom.us/wc/${cleanNum}/join`}
        target="_top"
        style={{ display: 'block', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, padding: '10px 24px', borderRadius: 24, textDecoration: 'none' }}
      >
        Zoom 웹 클라이언트에서 직접 참여
      </a>
    </div>
  );
}

function FailView({ err, meetingNumber }: { err: ZoomError; meetingNumber: string }) {
  const guide = err.errorCode ? ERROR_GUIDE[err.errorCode] : undefined;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#f87171', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        {guide?.title ?? 'Zoom 연결 실패'}
      </p>
      {err.errorCode && <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 10 }}>오류 코드: {err.errorCode}</p>}
      <p style={{ color: '#d1d5db', fontSize: 12, marginBottom: 20, whiteSpace: 'pre-line', lineHeight: 1.7, maxWidth: 320 }}>
        {guide?.desc ?? (err.reason ?? '알 수 없는 오류')}
      </p>
      <a
        href={`https://zoom.us/wc/${meetingNumber.replace(/\D/g, '')}/join`}
        target="_top"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, padding: '8px 20px', borderRadius: 24, textDecoration: 'none' }}
      >
        브라우저에서 열기
      </a>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
function ZoomSessionInner() {
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const [step, setStep] = useState<Step>('스크립트 로딩');
  const [zoomErr, setZoomErr] = useState<ZoomError | null>(null);

  const meetingNumber = params.get('mn') ?? '';
  const signature    = params.get('sig') ?? '';
  const sdkKey       = params.get('key') ?? '';
  const password     = params.get('pwd') ?? '';
  const userName     = params.get('un') ?? 'User';
  const role         = (Number(params.get('role') ?? 0)) as 0 | 1;

  const joinMeeting = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error('client not initialized');
    await client.join({
      signature,
      sdkKey,
      meetingNumber: meetingNumber.replace(/\D/g, ''),
      password,
      userName,
      role,
    });
    if (!mountedRef.current) return;
    setStep('완료');
    client.on('connection-change', (payload: { state: string }) => {
      if (payload.state === 'Closed' || payload.state === 'Fail') {
        window.parent?.postMessage({ type: 'zoom-leave' }, '*');
      }
    });
  }, [signature, sdkKey, meetingNumber, password, userName, role]);

  const handleJoinError = useCallback((e: unknown) => {
    const err = parseZoomError(e);
    console.error('[Zoom] join error:', err);
    if (!mountedRef.current) return;
    if (err.errorCode === 3051) {
      setStep('로그인 필요');
      setZoomErr(err);
      window.parent?.postMessage({ type: 'zoom-login-required' }, '*');
    } else {
      setStep('실패');
      setZoomErr(err);
      window.parent?.postMessage({ type: 'zoom-error', message: `[${err.errorCode ?? '?'}] ${err.reason ?? '알 수 없는 오류'}` }, '*');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function run() {
      // 1. Load SDK scripts
      try {
        await loadScript('/zoom-sdk/react.js');
        await loadScript('/zoom-sdk/react-dom.js');
        await loadScript('/zoom-sdk/zoom-embedded.js');
      } catch (e) {
        if (!mountedRef.current) return;
        setStep('실패');
        setZoomErr(parseZoomError(e));
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ZoomMtgEmbedded = (window as any).ReactWidgets;
      if (!ZoomMtgEmbedded?.createClient) {
        if (!mountedRef.current) return;
        setStep('실패');
        setZoomErr({ reason: 'window.ReactWidgets 없음 — public/zoom-sdk/ 파일 확인 필요' });
        return;
      }

      // 2. Init SDK
      if (!mountedRef.current) return;
      setStep('SDK 초기화');
      try {
        const client = ZoomMtgEmbedded.createClient();
        await client.init({
          zoomAppRoot: containerRef.current!,
          language: 'ko-KR',
          customize: {
            video: {
              isResizable: true,
              viewSizes: {
                default: { width: window.innerWidth, height: window.innerHeight },
                ribbon:  { width: window.innerWidth, height: window.innerHeight },
              },
            },
          },
        });
        clientRef.current = client;
      } catch (e) {
        console.error('[Zoom] init error:', e);
        if (!mountedRef.current) return;
        setStep('실패');
        setZoomErr(parseZoomError(e));
        return;
      }

      // 3. Join
      if (!mountedRef.current) return;
      setStep('회의 연결');
      joinMeeting().catch(handleJoinError);
    }

    run();
    return () => { mountedRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSpinning = ['스크립트 로딩', 'SDK 초기화', '회의 연결', '재연결 중'].includes(step);
  const spinLabel = step === '재연결 중' ? 'Zoom 로그인 후 재연결' : `${step}`;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {isSpinning && <Spinner label={`${spinLabel} 중...`} />}
      {step === '로그인 필요' && (
        <LoginRequiredView meetingNumber={meetingNumber} />
      )}
      {step === '실패' && zoomErr && (
        <FailView err={zoomErr} meetingNumber={meetingNumber} />
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default function ZoomSessionPage() {
  return (
    <Suspense fallback={
      <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
        로딩 중...
      </div>
    }>
      <ZoomSessionInner />
    </Suspense>
  );
}
