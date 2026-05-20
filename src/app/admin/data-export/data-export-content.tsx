'use client';

import { useState } from 'react';
import { exportTableAsCsv, type ExportResult } from '@/lib/actions/export';
import type { ExportableTable } from '@/lib/db/export';

interface TableInfo {
  name: ExportableTable;
  label: string;
  description: string;
}

const TABLES: TableInfo[] = [
  {
    name: 'applicants',
    label: 'Applicants',
    description: 'All applicant records with personal information, position, status',
  },
  {
    name: 'stage_results',
    label: 'Stage Results',
    description: 'Interview and assessment results for all applicants',
  },
  {
    name: 'math_exam_results',
    label: 'Math Exam Results',
    description: 'Math proficiency exam attempts, scores, and outcomes',
  },
];

export default function DataExportContent() {
  const [exporting, setExporting] = useState<ExportableTable | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async (tableName: ExportableTable) => {
    setExporting(tableName);
    setMessage(null);

    try {
      const result: ExportResult = await exportTableAsCsv(tableName);

      if (result.success && result.csv && result.filename) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: `Successfully exported ${result.filename}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Export failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
        Data Export
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Download database tables as CSV files. This data is for administrative use only.
      </p>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {TABLES.map((table) => (
          <div
            key={table.name}
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {table.label}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {table.description}
                </p>
              </div>
              <button
                onClick={() => handleExport(table.name)}
                disabled={exporting === table.name}
                style={{
                  padding: '10px 20px',
                  background: exporting === table.name ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: exporting === table.name ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  minWidth: '140px',
                }}
              >
                {exporting === table.name ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}