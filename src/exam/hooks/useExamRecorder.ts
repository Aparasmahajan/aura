import { useRef, useCallback, useState } from 'react';

const EXAM_BACKEND = 'http://localhost:8092/exam';
const CYCLE_MS = 30_000;

const getSupportedMimeType = (forScreen = false): string => {
  const types = forScreen
    ? ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm']
    : ['video/webm; codecs=vp9,opus', 'video/webm; codecs=vp8,opus', 'video/webm'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
};

const uploadChunk = async (
  blob: Blob,
  sessionKey: string,
  source: string,
  chunkIndex: number
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', blob, `${source}_chunk_${String(chunkIndex).padStart(4, '0')}.webm`);
  formData.append('sessionKey', sessionKey);
  formData.append('source', source);
  formData.append('chunkIndex', String(chunkIndex));
  try {
    await fetch(`${EXAM_BACKEND}/api/media/chunk`, { method: 'POST', body: formData });
  } catch (err) {
    console.error('Chunk upload failed:', err);
  }
};

const spawnRecorder = (
  stream: MediaStream,
  mimeType: string,
  source: 'camera' | 'screen',
  sessionKey: string,
  chunkIdx: { current: number }
): MediaRecorder => {
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  rec.ondataavailable = async (e) => {
    if (e.data.size > 0) {
      await uploadChunk(e.data, sessionKey, source, chunkIdx.current++);
    }
  };
  rec.start();
  return rec;
};

export type ScreenShareStatus = 'idle' | 'sharing' | 'stopped';

export const useExamRecorder = (sessionKey: string | null) => {
  const cameraRecorder = useRef<MediaRecorder | null>(null);
  const screenRecorder = useRef<MediaRecorder | null>(null);
  const cameraStream   = useRef<MediaStream | null>(null);
  const screenStream   = useRef<MediaStream | null>(null);
  const cameraChunk    = useRef(0);
  const screenChunk    = useRef(0);
  const cameraCycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenCycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [screenStatus, setScreenStatus] = useState<ScreenShareStatus>('idle');
  const [cameraError, setCameraError]   = useState<string | null>(null);
  const [screenError, setScreenError]   = useState<string | null>(null);

  const initCameraStream = useCallback(async (): Promise<boolean> => {
    cameraStream.current?.getTracks().forEach((t) => t.stop());
    cameraStream.current = null;
    try {
      cameraStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraError(null);
      return true;
    } catch (err: any) {
      setCameraError(err?.message ?? 'Camera access denied');
      return false;
    }
  }, []);

  const initScreenStream = useCallback(async (): Promise<boolean> => {
    screenStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'exclude',
      });

      const track    = stream.getVideoTracks()[0];
      const settings = track.getSettings() as any;

      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setScreenError('Please share your entire screen, not a window or browser tab.');
        return false;
      }

      screenStream.current = stream;
      setScreenStatus('sharing');
      setScreenError(null);

      track.addEventListener('ended', () => {
        setScreenStatus('stopped');
        if (screenCycleTimer.current) { clearInterval(screenCycleTimer.current); screenCycleTimer.current = null; }
        if (screenRecorder.current?.state === 'recording') screenRecorder.current.stop();
        screenStream.current = null;
      });

      return true;
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        setScreenError(err?.message ?? 'Screen share failed');
      }
      return false;
    }
  }, []);

  const restartScreenRecording = useCallback(() => {
    if (!sessionKey || !screenStream.current) return;
    if (screenCycleTimer.current) { clearInterval(screenCycleTimer.current); screenCycleTimer.current = null; }
    const mimeType = getSupportedMimeType(true);
    screenRecorder.current = spawnRecorder(screenStream.current, mimeType, 'screen', sessionKey, screenChunk);
    screenCycleTimer.current = setInterval(() => {
      if (screenRecorder.current?.state === 'recording') {
        screenRecorder.current.stop();
        screenRecorder.current = spawnRecorder(screenStream.current!, mimeType, 'screen', sessionKey, screenChunk);
      }
    }, CYCLE_MS);
  }, [sessionKey]);

  const beginRecording = useCallback(() => {
    if (!sessionKey) return;

    if (cameraStream.current) {
      const mimeType = getSupportedMimeType(false);
      cameraChunk.current = 0;
      cameraRecorder.current = spawnRecorder(cameraStream.current, mimeType, 'camera', sessionKey, cameraChunk);
      cameraCycleTimer.current = setInterval(() => {
        if (cameraRecorder.current?.state === 'recording') {
          cameraRecorder.current.stop();
          cameraRecorder.current = spawnRecorder(cameraStream.current!, mimeType, 'camera', sessionKey, cameraChunk);
        }
      }, CYCLE_MS);
    }

    if (screenStream.current) {
      const mimeType = getSupportedMimeType(true);
      screenChunk.current = 0;
      screenRecorder.current = spawnRecorder(screenStream.current, mimeType, 'screen', sessionKey, screenChunk);
      screenCycleTimer.current = setInterval(() => {
        if (screenRecorder.current?.state === 'recording') {
          screenRecorder.current.stop();
          screenRecorder.current = spawnRecorder(screenStream.current!, mimeType, 'screen', sessionKey, screenChunk);
        }
      }, CYCLE_MS);
    }
  }, [sessionKey]);

  const stopAllRecording = useCallback(() => {
    if (cameraCycleTimer.current) { clearInterval(cameraCycleTimer.current); cameraCycleTimer.current = null; }
    if (screenCycleTimer.current) { clearInterval(screenCycleTimer.current); screenCycleTimer.current = null; }
    if (cameraRecorder.current?.state === 'recording') cameraRecorder.current.stop();
    if (screenRecorder.current?.state === 'recording') screenRecorder.current.stop();
    cameraStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    cameraStream.current = null;
    screenStream.current = null;
  }, []);

  return {
    initCameraStream, initScreenStream, beginRecording,
    restartScreenRecording, stopAllRecording,
    screenStatus, cameraError, screenError, setCameraError, setScreenError,
  };
};
