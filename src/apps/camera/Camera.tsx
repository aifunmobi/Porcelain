import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Camera.css';

export const Camera: React.FC<AppProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [, setStream] = useState<MediaStream | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const initCamera = async () => {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not available');
        setErrorMessage('Camera API not available. Make sure you\'re using HTTPS or localhost.');
        setHasPermission(false);
        return;
      }

      try {
        console.log('[Camera] Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: false,
        });
        console.log('[Camera] Camera access granted, stream:', mediaStream);
        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Ensure video plays
          videoRef.current.play().catch(e => console.error('[Camera] Video play error:', e));
        }
        setHasPermission(true);
      } catch (err) {
        console.error('[Camera] Camera access error:', err);
        const error = err as Error;
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Camera permission denied. Please allow camera access.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No camera found on this device.');
        } else if (error.name === 'NotReadableError') {
          setErrorMessage('Camera is in use by another application.');
        } else {
          setErrorMessage(`Camera error: ${error.message || 'Unknown error'}`);
        }
        setHasPermission(false);
      }
    };

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setCaptures((prev) => [dataUrl, ...prev].slice(0, 10));
      }
    }
  }, [isMirrored]);

  const handleCapture = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    // countdown === 0, schedule capture on next tick to avoid setState during render
    const captureTimer = setTimeout(() => {
      capturePhoto();
      setCountdown(null);
    }, 0);
    return () => clearTimeout(captureTimer);
  }, [countdown, capturePhoto]);

  return (
    <div className="camera">
      <div className="camera__viewfinder">
        {hasPermission === null && (
          <div className="camera__loading">
            <Icon name="camera" size={48} color="var(--color-porcelain-400)" />
            <p>Requesting camera access...</p>
          </div>
        )}
        {hasPermission === false && (
          <div className="camera__error">
            <Icon name="camera" size={48} color="var(--color-error)" />
            <p>Camera unavailable</p>
            <p className="camera__error-hint">{errorMessage || 'Please allow camera access in your browser settings'}</p>
          </div>
        )}
        {hasPermission && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera__video ${isMirrored ? 'camera__video--mirrored' : ''}`}
            />
            {countdown !== null && countdown > 0 && (
              <div className="camera__countdown">{countdown}</div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="camera__controls">
        <button
          className="camera__control-btn"
          onClick={() => setIsMirrored(!isMirrored)}
          title="Mirror"
        >
          <Icon name="refresh" size={18} />
        </button>
        <button
          className="camera__capture-btn"
          onClick={handleCapture}
          disabled={!hasPermission || countdown !== null}
        >
          <div className="camera__capture-inner" />
        </button>
        <button className="camera__control-btn" title="Settings">
          <Icon name="gear" size={18} />
        </button>
      </div>

      {captures.length > 0 && (
        <div className="camera__gallery">
          <div className="camera__gallery-header">Recent Captures</div>
          <div className="camera__gallery-grid">
            {captures.map((src, index) => (
              <div key={index} className="camera__thumbnail">
                <img src={src} alt={`Capture ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;
