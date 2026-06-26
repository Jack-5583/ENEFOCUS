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

export function ZoomEmbedded({ meetingNumber, password, userName, role, signature, sdkKey, onLeave }: Props) {
  const [iframeReady, setIframeReady] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanNumber = meetingNumber.replace(/\D/g, '');

  const src = `/zoom-session?mn=${encodeURIComponent(cleanNumber)}&sig=${encodeURIComponent(signature)}&key=${encodeURIComponent(sdkKey)}&pwd=${encodeURIComponent(password)}&un=${encodeURIComponent(userName)}&role=${role}`;

  useEffect(() => {
    function handleMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      if (ev.data?.type === 'zoom-leave') {
        onLeave?.();
      }
      if (ev.data?.type === 'zoom-error') {
        setError(String(ev.data.message ?? '메시지 없음'));
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLeave]);

  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ minHeight: 480 }}>
      {!iframeReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
          <Loader2 size={36} className="text-white animate-spin mb-3" />
          <p className="text-white text-sm">Zoom 연결 중...</p>
          <p className="text-gray-500 text-xs mt-1">{cleanNumber}</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black p-6 text-center">
          <AlertCircle size={36} className="text-red-400 mb-3" />
          <p className="text-red-400 text-sm font-semibold mb-2">Zoom 연결 실패</p>
          <pre className="text-gray-400 text-xs mb-4 max-w-xs text-left whitespace-pre-wrap break-all bg-white/5 p-2 rounded-lg max-h-40 overflow-auto">{error}</pre>
          <a
            href={`https://zoom.us/wc/${cleanNumber}/join`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
          >
            <ExternalLink size={14} />
            브라우저에서 열기
          </a>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        style={{ width: '100%', minHeight: 480, border: 'none', display: error ? 'none' : 'block' }}
        onLoad={() => setIframeReady(true)}
        title="Zoom Meeting"
      />
    </div>
  );
}
