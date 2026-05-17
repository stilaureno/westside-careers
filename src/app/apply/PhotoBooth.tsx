'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './apply.module.css';

interface PhotoBoothProps {
  onPhotoCapture: (photoUrl: string) => void;
}

export function PhotoBooth({ onPhotoCapture }: PhotoBoothProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      
      const tryPlay = () => {
        videoRef.current?.play().catch(e => console.error("Error playing video:", e));
      };
      
      if (videoRef.current.readyState >= 2) {
        tryPlay();
      } else {
        videoRef.current.onloadedmetadata = tryPlay;
        videoRef.current.oncanplay = tryPlay;
      }
      
      setTimeout(tryPlay, 100);
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 800 }, 
          height: { ideal: 800 } 
        }
      });
      
      setStream(mediaStream);
      setHasCamera(true);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setHasCamera(false);
      setError('Unable to access camera. Please allow camera permissions and try again.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    canvas.width = 400;
    canvas.height = 400;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const minDim = Math.min(videoWidth, videoHeight);
    const sx = (videoWidth - minDim) / 2;
    const sy = (videoHeight - minDim) / 2;

    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 400, 400);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoDataUrl);
    onPhotoCapture(photoDataUrl);
    stopCamera();
    setIsProcessing(false);
  }

  function retakePhoto() {
    setCapturedPhoto(null);
    startCamera();
  }

  if (capturedPhoto) {
    return (
      <div className={styles.photoBooth}>
        <div className={styles.photoPreviewContainer}>
          <img 
            src={capturedPhoto} 
            alt="Captured photo" 
            className={styles.photoPreview}
          />
        </div>
        <button 
          type="button" 
          className={styles.retakeButton}
          onClick={retakePhoto}
        >
          Retake Photo
        </button>
      </div>
    );
  }

  if (hasCamera === false) {
    return (
      <div className={styles.photoBooth}>
        <div className={styles.photoError}>
          <p>{error || 'Camera not available'}</p>
          <button 
            type="button" 
            className={styles.retryButton}
            onClick={startCamera}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.photoBooth}>
      {!stream ? (
        <div className={styles.photoStart}>
          <div className={styles.cameraIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <p className={styles.photoHint}>Take a photo for your application</p>
          <button 
            type="button" 
            className={styles.startCameraButton}
            onClick={startCamera}
          >
            Open Camera
          </button>
        </div>
      ) : (
        <>
          <div className={styles.videoContainer}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.videoPreview}
            />
            <div className={styles.frameOverlay}>
              <div className={styles.frameCorner} style={{ top: 0, left: 0 }} />
              <div className={styles.frameCorner} style={{ top: 0, right: 0 }} />
              <div className={styles.frameCorner} style={{ bottom: 0, left: 0 }} />
              <div className={styles.frameCorner} style={{ bottom: 0, right: 0 }} />
            </div>
          </div>
          <button 
            type="button" 
            className={styles.captureButton}
            onClick={capturePhoto}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Capture'}
          </button>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}