'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface ZoomError {
  type?: string;
  reason?: string;
  errorCode?: number;
  url?: string;      // auth redirect URL present on errorCode 3051
  message?: string;
}

function parseZoomError(e: unknown): ZoomError {
  if (e && typeof e === 'object') return e as ZoomError;
  if (e instanceof Error) return { reason: e.message };
  return { reason: String(e) };
}

type Step = '스크립트 로딩' | 'SDK 초기화' | '회의 연결' | '완료' | '실패';

const ERROR_GUIDE: Record<number, { title: string; desc: string }> = {
  3051: {
    title: 'Zoom 계정 로그인 필요',
    desc: '이 회의는 "인증된 사용자만 참여" 설정이 켜져 있습니다.\n아래 버튼으로 Zoom 계정에 로그인하거나,\n회의 호스트에게 해당 설정을 꺼달라고 요청하세요.',
  },
  3712: {
    title: 'SDK 키 오류',
    desc: 'SDK Key/Secret이 올바르지 않습니다.\nVercel 환경변수 ZOOM_SDK_KEY / ZOOM_SDK_SECRET을 확인하세요.',
  },
  3001: {
    title: '회의를 찾을 수 없음',
    desc: '회의 ID가 존재하지 않거나 만료되었습니다.\n회의 ID를 다시 확인해 주세요.',
  },
  200:  {
    title: '비밀번호 오류',
    desc: '회의 비밀번호가 틀렸습니다.',
  },
};

function ZoomErrorView({ err, meetingNumber }: { err: ZoomError; meetingNumber: string }) {
  const guide = err.errorCode ? ERROR_GUIDE[err.errorCode] : undefined;
  const cleanNum = meetingNumber.replace(/\D/g, '');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#f87171', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
        {guide?.title ?? 'Zoom 연결 실패'}
      </p>
      {err.errorCode && (
        <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 10 }}>오류 코드: {err.errorCode}</p>
      )}
      <p style={{ color: '#d1d5db', fontSize: 12, marginBottom: 20, whiteSpace: 'pre-line', lineHeight: 1.7, maxWidth: 320 }}>
        {guide?.desc ?? (err.reason ?? '알 수 없는 오류')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260 }}>
        {/* 3051: Zoom auth redirect URL */}
        {err.errorCode === 3051 && err.url && (
          <a
            href={err.url}
            target="_top"
            style={{ display: 'block', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 0', borderRadius: 12, textDecoration: 'none' }}
          >
            Zoom 계정으로 로그인
          </a>
        )}
        <a
          href={`https://zoom.us/wc/${cleanNum}/join`}
          target="_top"
          style={{ display: 'block', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, padding: '8px 0', borderRadius: 12, textDecoration: 'none' }}
        >
          브라우저에서 열기
        </a>
      </div>
    </div>
  );
}

function ZoomSessionInner() {
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('스크립트 로딩');
  const [zoomErr, setZoomErr] = useState<ZoomError | null>(null);

  const meetingNumber = params.get('mn') ?? '';
  const signature    = params.get('sig') ?? '';
  const sdkKey       = params.get('key') ?? '';
  const password     = params.get('pwd') ?? '';
  const userName     = params.get('un') ?? 'User';
  const role         = (Number(params.get('role') ?? 0)) as 0 | 1;

  useEffect(() => {
    let mounted = true;

    async function run() {
      const fail = (where: Step, e: unknown) => {
        console.error('[Zoom]', where, e);
        if (!mounted) return;
        const err = parseZoomError(e);
        const msg = `[${where}] ${err.reason ?? JSON.stringify(e)}`;
        setStep('실패');
        setZoomErr(err);
        window.parent?.postMessage({ type: 'zoom-error', message: msg }, '*');
      };

      if (!containerRef.current) { fail('SDK 초기화', 'containerRef is null'); return; }

      // ── 1. 스크립트 로딩 ──
      try {
        await loadScript('/zoom-sdk/react.js');
        await loadScript('/zoom-sdk/react-dom.js');
        await loadScript('/zoom-sdk/zoom-embedded.js');
      } catch (e) { fail('스크립트 로딩', e); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ZoomMtgEmbedded = (window as any).ReactWidgets;
      if (!ZoomMtgEmbedded?.createClient) {
        fail('스크립트 로딩', 'window.ReactWidgets.createClient 없음');
        return;
      }

      // ── 2. SDK 초기화 ──
      if (!mounted) return;
      setStep('SDK 초기화');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let client: any;
      try {
        client = ZoomMtgEmbedded.createClient();
        await client.init({
          zoomAppRoot: containerRef.current,
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
      } catch (e) { fail('SDK 초기화', e); return; }

      // ── 3. 회의 연결 ──
      if (!mounted) return;
      setStep('회의 연결');
      try {
        await client.join({
          signature,
          sdkKey,
          meetingNumber: meetingNumber.replace(/\D/g, ''),
          password,
          userName,
          role,
        });
      } catch (e) { fail('회의 연결', e); return; }

      if (!mounted) return;
      setStep('완료');
      client.on('connection-change', (payload: { state: string }) => {
        if (payload.state === 'Closed' || payload.state === 'Fail') {
          window.parent?.postMessage({ type: 'zoom-leave' }, '*');
        }
      });
    }

    run();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = step !== '완료' && step !== '실패';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>{step} 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {step === '실패' && zoomErr && (
        <ZoomErrorView err={zoomErr} meetingNumber={meetingNumber} />
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
