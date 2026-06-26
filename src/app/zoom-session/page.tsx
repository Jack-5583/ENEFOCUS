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

function ZoomSessionInner() {
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'joined' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const meetingNumber = params.get('mn') ?? '';
  const signature    = params.get('sig') ?? '';
  const sdkKey       = params.get('key') ?? '';
  const password     = params.get('pwd') ?? '';
  const userName     = params.get('un') ?? 'User';
  const role         = (Number(params.get('role') ?? 0)) as 0 | 1;

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!containerRef.current) return;
      try {
        // Load via script tags to bypass Turbopack's CJS resolver,
        // which fails to resolve require("react") inside the Zoom UMD bundle.
        // The global (window) branch of the UMD reads window.React / window.ReactDOM.
        await loadScript('/zoom-sdk/react.js');
        await loadScript('/zoom-sdk/react-dom.js');
        await loadScript('/zoom-sdk/zoom-embedded.js');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ZoomMtgEmbedded = (window as any).ReactWidgets;
        if (!ZoomMtgEmbedded?.createClient) {
          throw new Error('Zoom SDK 로드 실패 (ReactWidgets undefined)');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client: any = ZoomMtgEmbedded.createClient();

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

        await client.join({
          signature,
          sdkKey,
          meetingNumber: meetingNumber.replace(/\D/g, ''),
          password,
          userName,
          role,
        });

        if (mounted) setStatus('joined');

        client.on('connection-change', (payload: { state: string }) => {
          if (payload.state === 'Closed' || payload.state === 'Fail') {
            window.parent?.postMessage({ type: 'zoom-leave' }, '*');
          }
        });
      } catch (e: unknown) {
        if (mounted) {
          const msg = e instanceof Error ? e.message : '알 수 없는 오류';
          setErrorMsg(msg);
          setStatus('error');
          window.parent?.postMessage({ type: 'zoom-error', message: msg }, '*');
        }
      }
    }

    init();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Zoom 연결 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Zoom 연결 실패</p>
          <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 16 }}>{errorMsg}</p>
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
