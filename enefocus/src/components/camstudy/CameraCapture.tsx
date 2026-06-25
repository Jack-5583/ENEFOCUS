'use client';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, VideoOff } from 'lucide-react';

export interface CameraCaptureHandle {
  capture: () => string | null;
  getStream: () => MediaStream | null;
}

interface Props {
  autoStart?: boolean;
  deviceId?: string;
  onCapture?: (dataUrl: string) => void;
  className?: string;
  showControls?: boolean;
}

export const CameraCapture = forwardRef<CameraCaptureHandle, Props>(
  ({ autoStart = false, deviceId, onCapture, className = '', showControls = true }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState(deviceId || '');

    useImperativeHandle(ref, () => ({
      capture: () => {
        if (!videoRef.current || !streamRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.85);
      },
      getStream: () => streamRef.current,
    }));

    async function enumerateDevices() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const cams = devs.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
        if (!selectedDevice && cams.length > 0) {
          setSelectedDevice(cams[0].deviceId);
        }
      } catch {}
    }

    const startCamera = useCallback(async (devId?: string) => {
      setError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const constraints: MediaStreamConstraints = {
          video: devId ? { deviceId: { exact: devId } } : { facingMode: 'user' },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsReady(true);
        await enumerateDevices();
      } catch (e: any) {
        setError(e.message || '카메라를 열 수 없습니다');
        setIsReady(false);
      }
    }, []);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsReady(false);
    }, []);

    useEffect(() => {
      if (autoStart) startCamera(deviceId);
      return () => stopCamera();
    }, [autoStart, deviceId]);

    function handleCapture() {
      if (!videoRef.current || !streamRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      onCapture?.(url);
    }

    async function switchCamera(devId: string) {
      setSelectedDevice(devId);
      await startCamera(devId);
    }

    return (
      <div className={`relative flex flex-col gap-2 ${className}`}>
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <VideoOff size={32} className="text-gray-600" />
              <button
                onClick={() => startCamera(selectedDevice)}
                className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                카메라 시작
              </button>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button
                onClick={() => startCamera(selectedDevice)}
                className="text-white text-xs underline"
              >
                다시 시도
              </button>
            </div>
          )}
          {isReady && (
            <>
              <div className="absolute top-3 left-3 bg-red-500 rounded-full w-2 h-2 animate-pulse" />
              <div className="absolute top-3 right-3 text-xs text-white bg-black/60 rounded-full px-2 py-0.5">LIVE</div>
            </>
          )}
        </div>

        {showControls && (
          <div className="flex gap-2">
            {devices.length > 1 && (
              <select
                className="flex-1 bg-gray-800 text-white text-xs rounded-xl px-3 py-2 outline-none"
                value={selectedDevice}
                onChange={(e) => switchCamera(e.target.value)}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `카메라 ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
            {isReady && onCapture && (
              <button
                onClick={handleCapture}
                className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors shrink-0"
              >
                <Camera size={14} />
                캡처
              </button>
            )}
            <button
              onClick={() => isReady ? stopCamera() : startCamera(selectedDevice)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs transition-colors"
            >
              {isReady ? '중지' : '시작'}
            </button>
          </div>
        )}
      </div>
    );
  }
);
CameraCapture.displayName = 'CameraCapture';
