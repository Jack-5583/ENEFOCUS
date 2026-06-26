'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  meetingNumber: string;
  password: string;
  userName: string;
  role: 0 | 1;
  signature: string;
  sdkKey: string;
  onLeave?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export function ZoomEmbedded({ meetingNumber, password, userName, role, signature, sdkKey, onLeave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<AnyClient>(null);
  const [status, setStatus] = useState<'loading' | 'joined' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initZoom() {
      if (!containerRef.current) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@zoom/meetingsdk/embedded');
        const ZoomMtgEmbedded = mod.default ?? mod;
        const client: AnyClient = ZoomMtgEmbedded.createClient();
        clientRef.current = client;

        const width = Math.min(containerRef.current.offsetWidth || 800, 960);

        await client.init({
          zoomAppRoot: containerRef.current,
          language: 'ko-KR',
          customize: {
            video: {
              isResizable: true,
              viewSizes: {
                default: { width, height: 480 },
                ribbon: { width, height: 480 },
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
            onLeave?.();
          }
        });
      } catch (e: unknown) {
        if (mounted) {
          setErrorMsg(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
          setStatus('error');
        }
      }
    }

    initZoom();

    return () => {
      mounted = false;
      try { clientRef.current?.leaveMeeting?.(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ minHeight: 480 }}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
          <Loader2 size={36} className="text-white animate-spin mb-3" />
          <p className="text-white text-sm">Zoom 연결 중...</p>
          <p className="text-gray-500 text-xs mt-1">{meetingNumber}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black p-6 text-center">
          <AlertCircle size={36} className="text-red-400 mb-3" />
          <p className="text-red-400 text-sm font-semibold mb-2">Zoom 연결 실패</p>
          <p className="text-gray-400 text-xs mb-4">{errorMsg}</p>
          <a
            href={`https://zoom.us/wc/${meetingNumber.replace(/\D/g, '')}/join`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
          >
            <ExternalLink size={14} />
            브라우저에서 열기
          </a>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', minHeight: 480 }} />
    </div>
  );
}
