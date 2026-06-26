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

function dumpError(e: unknown): string {
  if (e === undefined) return 'undefined';
  if (e === null) return 'null';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try { return JSON.stringify(e, null, 2); } catch { return String(e); }
}

type Step = '스크립트 로딩' | 'SDK 초기화' | '회의 연결' | '완료' | '실패';

function ZoomSessionInner() {
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('스크립트 로딩');
  const [errorDetail, setErrorDetail] = useState('');

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
        const detail = `[${where}]\n${dumpError(e)}`;
        console.error('[Zoom]', where, e);
        if (!mounted) return;
        setStep('실패');
        setErrorDetail(detail);
        window.parent?.postMessage({ type: 'zoom-error', message: detail }, '*');
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
      {step === '실패' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, padding: 24 }}>
          <p style={{ color: '#f87171', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Zoom 연결 실패</p>
          <pre style={{ color: '#fca5a5', fontSize: 11, background: '#1f1f1f', padding: 12, borderRadius: 8, maxWidth: '90%', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 16 }}>
            {errorDetail}
          </pre>
          <a
            href={`https://zoom.us/wc/${meetingNumber.replace(/\D/g, '')}/join`}
            target="_top"
            style={{ color: '#fff', fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: 24, textDecoration: 'none' }}
          >
            브라우저에서 열기
          </a>
        </div>
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
