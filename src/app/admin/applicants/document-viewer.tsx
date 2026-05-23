'use client';

import { useState, useEffect, useCallback } from 'react';

type DocumentViewerProps = {
  url: string;
  fileName?: string;
  onClose: () => void;
};

export default function DocumentViewer({ url, fileName, onClose }: DocumentViewerProps) {
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'docx' | 'other'>('other');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ext = (fileName || url).toLowerCase().split('?')[0];
    if (ext.endsWith('.pdf')) setFileType('pdf');
    else if (/\.(png|jpg|jpeg|gif|webp)$/.test(ext)) setFileType('image');
    else if (/\.(doc|docx)$/.test(ext)) setFileType('docx');
    else setFileType('other');
    setLoading(false);
  }, [url, fileName]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        width: '90vw',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #dee2e6',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {fileName || 'Document Viewer'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#000080', textDecoration: 'none', cursor: 'pointer' }}
            >
              Open in new tab
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>
          )}
          {fileType === 'pdf' && (
            <iframe
              src={`${url}#toolbar=0`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Viewer"
              onLoad={() => setLoading(false)}
            />
          )}
          {fileType === 'image' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Resume"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onLoad={() => setLoading(false)}
              />
            </div>
          )}
          {(fileType === 'docx' || fileType === 'other') && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#666' }}>
              <span style={{ fontSize: 48 }}>{fileType === 'docx' ? '📄' : '📎'}</span>
              <p style={{ margin: 0, fontSize: 14 }}>Preview not available for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, color: '#000080', fontWeight: 600 }}
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
