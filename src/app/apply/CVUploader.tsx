'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './apply.module.css';

interface CVUploaderProps {
  onFile: (file: File | null) => void;
}

type Mode = 'file' | 'camera';

export function CVUploader({ onFile }: CVUploaderProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const notifyFile = useCallback((f: File | null) => {
    onFile(f);
  }, [onFile]);

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      setStream(mediaStream);
      setHasCamera(true);
    } catch {
      setHasCamera(false);
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
    if (!ctx) { setIsProcessing(false); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) { setIsProcessing(false); return; }
      const file = new File([blob], `cv-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedPhoto(URL.createObjectURL(blob));
      setSelectedFile(file);
      notifyFile(file);
      stopCamera();
      setIsProcessing(false);
    }, 'image/jpeg', 0.85);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setSelectedFile(f);
    setCapturedPhoto(null);

    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }

    notifyFile(f);
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreview(null);
    setCapturedPhoto(null);
    setMode('file');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
    notifyFile(null);
  }

  if (mode === 'camera') {
    if (capturedPhoto) {
      return (
        <div className={styles.photoBooth}>
          <div className={styles.photoPreviewContainer}>
            <img src={capturedPhoto} alt="Captured CV" className={styles.photoPreview} />
          </div>
          <p style={{ fontSize: 13, color: '#166534', margin: '0 0 8px' }}>Photo captured</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="button" className={styles.retakeButton} onClick={() => { setCapturedPhoto(null); setSelectedFile(null); notifyFile(null); startCamera(); }}>
              Retake
            </button>
            <button type="button" className={styles.retakeButton} onClick={() => { setMode('file'); clearSelection(); }}>
              Upload File Instead
            </button>
          </div>
        </div>
      );
    }

    if (hasCamera === false) {
      return (
        <div className={styles.photoBooth}>
          <div className={styles.photoError}>
            <p>Camera not available</p>
            <button type="button" className={styles.retryButton} onClick={startCamera}>Try Again</button>
            <button type="button" className={styles.retakeButton} onClick={() => { setMode('file'); }}>
              Upload File Instead
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
            <p className={styles.photoHint}>Take a photo of your resume/CV</p>
            <button type="button" className={styles.startCameraButton} onClick={startCamera}>
              Open Camera
            </button>
            <button type="button" className={styles.retakeButton} onClick={() => setMode('file')}>
              Upload File Instead
            </button>
          </div>
        ) : (
          <>
            <div className={styles.videoContainer}>
              <video ref={videoRef} autoPlay playsInline muted className={styles.videoPreview} />
              <div className={styles.frameOverlay}>
                <div className={styles.frameCorner} style={{ top: 0, left: 0 }} />
                <div className={styles.frameCorner} style={{ top: 0, right: 0 }} />
                <div className={styles.frameCorner} style={{ bottom: 0, left: 0 }} />
                <div className={styles.frameCorner} style={{ bottom: 0, right: 0 }} />
              </div>
            </div>
            <button type="button" className={styles.captureButton} onClick={capturePhoto} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Capture'}
            </button>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  const isFileActive = mode === 'file';

  return (
    <div className={styles.photoBooth}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className={isFileActive ? styles.startCameraButton : styles.retakeButton}
          onClick={() => setMode('file')}
          style={{ flex: 1 }}
        >
          Upload File
        </button>
        <button
          type="button"
          className={!isFileActive ? styles.startCameraButton : styles.retakeButton}
          onClick={() => setMode('camera')}
          style={{ flex: 1 }}
        >
          Take Photo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <div className={styles.photoStart}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className={styles.photoHint}>Select your resume/CV file (PDF, DOC, DOCX)</p>
          <button type="button" className={styles.startCameraButton} onClick={() => fileInputRef.current?.click()}>
            Choose File
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          {preview ? (
            <div className={styles.photoPreviewContainer} style={{ margin: '0 auto 12px' }}>
              <img src={preview} alt="CV preview" className={styles.photoPreview} />
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>{selectedFile.name}</p>
            </div>
          )}
          <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>
            File will be uploaded when you submit
          </p>
          <button type="button" className={styles.retakeButton} onClick={clearSelection} style={{ marginTop: 8 }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
