'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ZoomConfig {
  meetingNumber: string;
  password: string;
  userName: string;
  sdkKey: string;
  signature: string;
  role: number;
}

interface Props {
  config: ZoomConfig;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: string) => void;
  containerClassName?: string;
}

export function ZoomMeeting({ config, onJoined, onLeft, onError, containerClassName = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'joined' | 'error' | 'idle'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initZoom() {
      try {
        // Dynamic import to avoid SSR issues
        const { ZoomMtg } = await import('@zoom/meetingsdk');

        ZoomMtg.setZoomJSLib('https://source.zoom.us/3.1.6/lib', '/av');
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        if (!containerRef.current || !mounted) return;

        const container = containerRef.current;
        // Override Zoom's internal root container
        const zoomRoot = document.getElementById('zmmtg-root');
        if (zoomRoot) {
          zoomRoot.style.display = 'block';
          container.appendChild(zoomRoot);
        }

        ZoomMtg.init({
          leaveUrl: window.location.href,
          success: () => {
            ZoomMtg.join({
              signature: config.signature,
              sdkKey: config.sdkKey,
              meetingNumber: config.meetingNumber,
              passWord: config.password,
              userName: config.userName,
              userEmail: '',
              success: () => {
                if (mounted) {
                  setStatus('joined');
                  onJoined?.();
                }
              },
              error: (err: any) => {
                const msg = err?.reason || '회의 참가에 실패했습니다';
                if (mounted) {
                  setStatus('error');
                  setErrorMsg(msg);
                  onError?.(msg);
                }
              },
            });
          },
          error: (err: any) => {
            const msg = err?.reason || 'Zoom 초기화 실패';
            if (mounted) {
              setStatus('error');
              setErrorMsg(msg);
              onError?.(msg);
            }
          },
        });
      } catch (e: any) {
        if (mounted) {
          setStatus('error');
          setErrorMsg(e.message || 'Zoom SDK 로드 실패');
          onError?.(e.message);
        }
      }
    }

    initZoom();
    return () => {
      mounted = false;
      try {
        const { ZoomMtg } = require('@zoom/meetingsdk');
        ZoomMtg.leaveMeeting({});
      } catch {}
    };
  }, []);

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-gray-900 rounded-2xl p-8 ${containerClassName}`}>
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        <p className="text-gray-500 text-xs text-center">
          Zoom SDK 키 설정이 필요합니다.<br />
          .env.local에 ZOOM_SDK_KEY / ZOOM_SDK_SECRET을 추가하세요.
        </p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-gray-900 rounded-2xl ${containerClassName}`}>
        <Loader2 size={28} className="text-white animate-spin" />
        <p className="text-gray-400 text-sm">Zoom 회의 연결 중...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-gray-900 rounded-2xl overflow-hidden ${containerClassName}`}
      id="zoom-meeting-container"
    />
  );
}
