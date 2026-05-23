'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './apply.module.css';

interface CVUploaderProps {
  onUpload: (url: string) => void;
}

type Mode = 'file' | 'camera';

export function CVUploader({ onUpload }: CVUploaderProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      setStream(mediaStream);
      setHasCamera(true);
      setError(null);
    } catch {
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
    if (!ctx) { setIsProcessing(false); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
    setIsProcessing(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);

    if (selected.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  async function handleUpload(dataUrl?: string) {
    setUploading(true);
    setError(null);

    try {
      let uploadFile: File;

      if (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        uploadFile = new File([blob], `cv-${Date.now()}.jpg`, { type: 'image/jpeg' });
      } else if (file) {
        uploadFile = file;
      } else {
        throw new Error('No file selected');
      }

      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('folder', 'resumes');

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(data.error || 'Upload failed');

      setUploadedUrl(data.url);
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setUploadedUrl(null);
    setCapturedPhoto(null);
    setError(null);
    setMode('file');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (uploadedUrl) {
    return (
      <div className={styles.photoBooth}>
        <div className={styles.photoPreviewContainer}>
          {file && file.type.startsWith('image/') ? (
            <img src={preview || ''} alt="CV" className={styles.photoPreview} />
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="CV" className={styles.photoPreview} />
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              {file?.name} uploaded
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>Resume uploaded successfully</p>
        <button type="button" className={styles.retakeButton} onClick={reset}>
          Replace Resume
        </button>
      </div>
    );
  }

  if (mode === 'camera') {
    if (capturedPhoto) {
      return (
        <div className={styles.photoBooth}>
          <div className={styles.photoPreviewContainer}>
            <img src={capturedPhoto} alt="Captured CV" className={styles.photoPreview} />
          </div>
          <button
            type="button"
            className={styles.captureButton}
            onClick={() => handleUpload(capturedPhoto)}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          <button type="button" className={styles.retakeButton} onClick={() => { setCapturedPhoto(null); startCamera(); }}>
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
            <button type="button" className={styles.retryButton} onClick={startCamera}>Try Again</button>
            <button type="button" className={styles.retakeButton} onClick={() => { setMode('file'); setError(null); }}>
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

      {!file ? (
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
              <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>{file.name}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="button" className={styles.captureButton} onClick={() => handleUpload()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>
            <button type="button" className={styles.retakeButton} onClick={() => { setFile(null); setPreview(null); }}>
              Remove
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: '#991b1b', margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}
