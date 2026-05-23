'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './dashboard.module.css';
import PlotlyTrendChart, { PlotlyKpiDonut } from './plotly-chart';

interface ApplicantListItem {
  reference_no: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position_applied: string;
  application_status: string;
  department: string;
  current_stage: string;
  created_at: string;
  stages?: any[];
}

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

interface PositionSummary {
  total: number;
  pending: number;
  ongoing: number;
  qualified: number;
  reprofile: number;
  pooling: number;
  failed: number;
}

interface StageSummary {
  taken: number;
  pending: number;
  passed: number;
  failed: number;
  retakes: number;
}

interface GenderByPosition {
  male: number;
  female: number;
}

interface AgeBandSummary {
  age20s: number;
  age30s: number;
  age40s: number;
  age50Plus: number;
}

interface HeightBandSummary {
  below160: number;
  height160170: number;
  height170180: number;
  height180Plus: number;
}

interface AgeGenderByPosition {
  [position: string]: {
    age20s: { male: number; female: number };
    age30s: { male: number; female: number };
    age40s: { male: number; female: number };
    age50Plus: { male: number; female: number };
  };
}

interface HeightGenderByPosition {
  [position: string]: {
    below160: { male: number; female: number };
    height160170: { male: number; female: number };
    height170180: { male: number; female: number };
    height180Plus: { male: number; female: number };
  };
}

interface DeptData {
  positions: { [posName: string]: PositionSummary };
  genderByPosition: { [posName: string]: GenderByPosition };
  stageMath: StageSummary;
  stageTable: StageSummary;
  stageCounts: { [stageName: string]: number };
  ageBands: AgeBandSummary;
  heightBands: HeightBandSummary;
  ageGenderByPosition: AgeGenderByPosition;
  heightGenderByPosition: HeightGenderByPosition;
  total: number;
  pending: number;
  ongoing: number;
  qualified: number;
  reprofile: number;
  pooling: number;
  failed: number;
}

interface DashboardData {
  [deptName: string]: DeptData;
}

interface MathExamAttempt {
  reference_no: string;
  status: string | null;
  attempt_count?: number | null;
  submitted_at?: string | null;
  started_at?: string | null;
  created_at?: string | null;
}

interface TrendDataPoint {
  label: string;
  count: number;
  qualified: number;
  failed: number;
  pooling: number;
  date: string;
}

function getMathAttemptTimestamp(attempt: MathExamAttempt): number {
  const ts = attempt.submitted_at || attempt.started_at || attempt.created_at;
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLatestMathAttempts(attempts: MathExamAttempt[]): Record<string, MathExamAttempt> {
  const latestByRef: Record<string, MathExamAttempt> = {};

  attempts.forEach((attempt) => {
    const ref = attempt.reference_no;
    const existing = latestByRef[ref];
    if (!existing) {
      latestByRef[ref] = attempt;
      return;
    }

    const currentAttemptCount = attempt.attempt_count ?? 1;
    const existingAttemptCount = existing.attempt_count ?? 1;
    if (currentAttemptCount > existingAttemptCount) {
      latestByRef[ref] = attempt;
      return;
    }
    if (currentAttemptCount < existingAttemptCount) {
      return;
    }

    if (getMathAttemptTimestamp(attempt) >= getMathAttemptTimestamp(existing)) {
      latestByRef[ref] = attempt;
    }
  });

  return latestByRef;
}

function getMathRetakeRefs(attempts: MathExamAttempt[]): Set<string> {
  const latestAttempts = getLatestMathAttempts(attempts);
  return new Set(
    Object.values(latestAttempts)
      .filter((attempt) => attempt.status === 'Failed')
      .map((attempt) => attempt.reference_no)
  );
}

const CARD_COLORS: Record<string, string> = {
  default: '#1E40AF',
  pending: '#6B7280',
  ongoing: '#F59E0B',
  qualified: '#10B981',
  reprofile: '#8B5CF6',
  pooling: '#06B6D4',
  failed: '#EF4444',
};

function SummaryCard({ label, value, color = '#1E40AF', total, onClick }: { label: string; value: number; color?: string; total?: number; onClick?: () => void }) {
  const isClickable = onClick && value > 0;
  const pct = total && total > 0 ? (value / total) * 100 : 0;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`${styles.kpiCard} ${isClickable ? styles.kpiClickable : ''}`}
      title={isClickable ? `Click to view ${label} applicants` : undefined}
    >
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={{ color }}>
        {value}
        {isClickable && <span className={styles.kpiArrow}>→</span>}
      </div>
      {total !== undefined && total > 0 && (
        <div className={styles.kpiBar}>
          <div className={styles.kpiBarTrack}>
            <div className={styles.kpiBarFill} style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <span className={styles.kpiBarLabel}>{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}

function PositionSection({ title, summary, onStatusClick }: { title: string; summary: PositionSummary; onStatusClick?: (status: string) => void }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1E40AF' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        <SummaryCard label="Total" value={summary.total} total={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} color={CARD_COLORS.pending} total={summary.total} onClick={onStatusClick ? () => onStatusClick('Pending') : undefined} />
        <SummaryCard label="Ongoing" value={summary.ongoing} color={CARD_COLORS.ongoing} total={summary.total} onClick={onStatusClick ? () => onStatusClick('Ongoing') : undefined} />
        <SummaryCard label="Qualified" value={summary.qualified} color={CARD_COLORS.qualified} total={summary.total} onClick={onStatusClick ? () => onStatusClick('Passed') : undefined} />
        <SummaryCard label="Reprofile" value={summary.reprofile} color={CARD_COLORS.reprofile} total={summary.total} onClick={onStatusClick ? () => onStatusClick('Reprofile') : undefined} />
        <SummaryCard label="Pooling" value={summary.pooling} color={CARD_COLORS.pooling} total={summary.total} onClick={onStatusClick ? () => onStatusClick('For Pooling') : undefined} />
        <SummaryCard label="Failed" value={summary.failed} color={CARD_COLORS.failed} total={summary.total} onClick={onStatusClick ? () => onStatusClick('Failed') : undefined} />
      </div>
    </div>
  );
}

function StageSection({ title, summary, onStageClick }: { title: string; summary: StageSummary; onStageClick?: (stage: string, result: string) => void }) {
  const showRetakes = title === 'Math Exam';
  return (
    <div style={{ marginTop: '14px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#6b7280' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: showRetakes ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
        <SummaryCard label="Taken" value={summary.taken} total={summary.taken + summary.pending || 1} />
        <SummaryCard label="Pending" value={summary.pending} color={CARD_COLORS.pending} total={summary.taken + summary.pending || 1} onClick={onStageClick ? () => onStageClick(title, 'Pending') : undefined} />
        <SummaryCard label="Passed" value={summary.passed} color={CARD_COLORS.qualified} total={summary.taken || 1} onClick={onStageClick ? () => onStageClick(title, 'Passed') : undefined} />
        <SummaryCard label="Failed" value={summary.failed} color={CARD_COLORS.failed} total={summary.taken || 1} onClick={onStageClick ? () => onStageClick(title, 'Failed') : undefined} />
        {showRetakes && (
          <SummaryCard label="Retakes" value={summary.retakes} color={CARD_COLORS.reprofile} total={summary.taken || 1} onClick={onStageClick ? () => onStageClick(title, 'Retake') : undefined} />
        )}
      </div>
    </div>
  );
}

function GenderRow({ label, male, female }: { label: string; male: number; female: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#1E40AF' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
        <span style={{ color: '#3B82F6' }}>M {male}</span>
        <span style={{ color: '#EC4899' }}>F {female}</span>
      </span>
    </div>
  );
}

function AgeBandRow({ label, value, isLast = false }: { label: string; value: number; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: isLast ? 'none' : '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#1E40AF' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF' }}>{value}</span>
    </div>
  );
}

function HeightBandRow({ label, value, isLast = false }: { label: string; value: number; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: isLast ? 'none' : '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#1E40AF' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF' }}>{value}</span>
    </div>
  );
}

function AgeGenderMatrix({ data }: { data: AgeGenderByPosition }) {
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  
  const positions = Object.keys(data).sort();
  
  if (positions.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No data available</p>;
  }

  const totals = {
    age20s: { male: 0, female: 0 },
    age30s: { male: 0, female: 0 },
    age40s: { male: 0, female: 0 },
    age50Plus: { male: 0, female: 0 },
  };

  positions.forEach(pos => {
    const p = data[pos];
    totals.age20s.male += p.age20s.male;
    totals.age20s.female += p.age20s.female;
    totals.age30s.male += p.age30s.male;
    totals.age30s.female += p.age30s.female;
    totals.age40s.male += p.age40s.male;
    totals.age40s.female += p.age40s.female;
    totals.age50Plus.male += p.age50Plus.male;
    totals.age50Plus.female += p.age50Plus.female;
  });
  
  const cellPadding = isMobile ? '4px 2px' : '8px 6px';
  const fontSize = isMobile ? '9px' : '12px';
  const colWidth = isMobile ? '28px' : '45px';
  const posWidth = isMobile ? '60px' : '100px';
  
  const cellStyle: React.CSSProperties = {
    padding: cellPadding,
    textAlign: 'center',
    fontSize,
    borderBottom: '1px solid #e5e7eb',
  };
  
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#f8fafc',
    color: '#1E40AF',
  };

  const footerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#fefce8',
    borderTop: '2px solid #F59E0B',
    color: '#1E40AF',
  };
  
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table className={styles.matrixTable} style={{ fontSize, minWidth: isMobile ? '280px' : 'auto' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left', width: posWidth }}>Position</th>
            <th style={headerCellStyle} colSpan={3}>20s</th>
            <th style={headerCellStyle} colSpan={3}>30s</th>
            <th style={headerCellStyle} colSpan={3}>40s</th>
            <th style={headerCellStyle} colSpan={3}>50+</th>
          </tr>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left' }}></th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const p = data[pos];
            const rowTotal = p.age20s.male + p.age20s.female + p.age30s.male + p.age30s.female + p.age40s.male + p.age40s.female + p.age50Plus.male + p.age50Plus.female;
            if (rowTotal === 0) return null;
            
            return (
              <tr key={pos}>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: '600', color: '#1E40AF', fontSize: isMobile ? '10px' : '12px' }}>{pos}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.age20s.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.age20s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age20s.male + p.age20s.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.age30s.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.age30s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age30s.male + p.age30s.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.age40s.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.age40s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age40s.male + p.age40s.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.age50Plus.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.age50Plus.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age50Plus.male + p.age50Plus.female}</td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...footerCellStyle, textAlign: 'left' }}>TOTAL</td>
            <td style={footerCellStyle}>{totals.age20s.male}</td>
            <td style={footerCellStyle}>{totals.age20s.female}</td>
            <td style={footerCellStyle}>{totals.age20s.male + totals.age20s.female}</td>
            <td style={footerCellStyle}>{totals.age30s.male}</td>
            <td style={footerCellStyle}>{totals.age30s.female}</td>
            <td style={footerCellStyle}>{totals.age30s.male + totals.age30s.female}</td>
            <td style={footerCellStyle}>{totals.age40s.male}</td>
            <td style={footerCellStyle}>{totals.age40s.female}</td>
            <td style={footerCellStyle}>{totals.age40s.male + totals.age40s.female}</td>
            <td style={footerCellStyle}>{totals.age50Plus.male}</td>
            <td style={footerCellStyle}>{totals.age50Plus.female}</td>
            <td style={footerCellStyle}>{totals.age50Plus.male + totals.age50Plus.female}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function HeightGenderMatrix({ data, useFeet = false }: { data: HeightGenderByPosition; useFeet?: boolean }) {
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  
  const positions = Object.keys(data).sort();
  
  if (positions.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No data available</p>;
  }

  const totals = {
    below160: { male: 0, female: 0 },
    height160170: { male: 0, female: 0 },
    height170180: { male: 0, female: 0 },
    height180Plus: { male: 0, female: 0 },
  };

  positions.forEach(pos => {
    const p = data[pos];
    totals.below160.male += p.below160.male;
    totals.below160.female += p.below160.female;
    totals.height160170.male += p.height160170.male;
    totals.height160170.female += p.height160170.female;
    totals.height170180.male += p.height170180.male;
    totals.height170180.female += p.height170180.female;
    totals.height180Plus.male += p.height180Plus.male;
    totals.height180Plus.female += p.height180Plus.female;
  });
  
  const cellPadding = isMobile ? '4px 2px' : '8px 6px';
  const fontSize = isMobile ? '9px' : '12px';
  const colWidth = isMobile ? '28px' : '45px';
  const posWidth = isMobile ? '60px' : '100px';
  
  const cellStyle: React.CSSProperties = {
    padding: cellPadding,
    textAlign: 'center',
    fontSize,
    borderBottom: '1px solid #e5e7eb',
  };
  
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#f8fafc',
    color: '#1E40AF',
  };

  const footerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#fefce8',
    borderTop: '2px solid #F59E0B',
    color: '#1E40AF',
  };
  
  const heightLabels = useFeet
    ? { below160: `<'5'2`, height160170: `5'2-5'4`, height170180: `5'5-6'0`, height180Plus: `6'1+` }
    : { below160: '<158', height160170: '158-169', height170170: '170-183', height180Plus: '183+' };

  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table className={styles.matrixTable} style={{ fontSize, minWidth: isMobile ? '280px' : 'auto' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left', width: posWidth }}>Position</th>
            <th style={headerCellStyle} colSpan={3}>{useFeet ? `<'5'2` : '<158'}</th>
            <th style={headerCellStyle} colSpan={3}>{useFeet ? `5'2-5'4` : '158-169'}</th>
            <th style={headerCellStyle} colSpan={3}>{useFeet ? `5'5-6'0` : '170-183'}</th>
            <th style={headerCellStyle} colSpan={3}>{useFeet ? `6'1+` : '183+'}</th>
          </tr>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left' }}></th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: isMobile ? '8px' : '10px', width: colWidth }}>T</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const p = data[pos];
            const rowTotal = p.below160.male + p.below160.female + p.height160170.male + p.height160170.female + p.height170180.male + p.height170180.female + p.height180Plus.male + p.height180Plus.female;
            if (rowTotal === 0) return null;
            
            return (
              <tr key={pos}>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: '600', color: '#1E40AF', fontSize: isMobile ? '10px' : '12px' }}>{pos}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.below160.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.below160.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.below160.male + p.below160.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.height160170.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.height160170.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height160170.male + p.height160170.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.height170180.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.height170180.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height170180.male + p.height170180.female}</td>
                <td style={{ ...cellStyle, color: '#3B82F6' }}>{p.height180Plus.male}</td>
                <td style={{ ...cellStyle, color: '#EC4899' }}>{p.height180Plus.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height180Plus.male + p.height180Plus.female}</td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...footerCellStyle, textAlign: 'left' }}>TOTAL</td>
            <td style={footerCellStyle}>{totals.below160.male}</td>
            <td style={footerCellStyle}>{totals.below160.female}</td>
            <td style={footerCellStyle}>{totals.below160.male + totals.below160.female}</td>
            <td style={footerCellStyle}>{totals.height160170.male}</td>
            <td style={footerCellStyle}>{totals.height160170.female}</td>
            <td style={footerCellStyle}>{totals.height160170.male + totals.height160170.female}</td>
            <td style={footerCellStyle}>{totals.height170180.male}</td>
            <td style={footerCellStyle}>{totals.height170180.female}</td>
            <td style={footerCellStyle}>{totals.height170180.male + totals.height170180.female}</td>
            <td style={footerCellStyle}>{totals.height180Plus.male}</td>
            <td style={footerCellStyle}>{totals.height180Plus.female}</td>
            <td style={footerCellStyle}>{totals.height180Plus.male + totals.height180Plus.female}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({ data }: { data: TrendDataPoint[] }) {
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const grouped = useMemo(() => {
    if (mode === 'daily') {
      return data.map(d => ({
        ...d,
        label: d.date.length === 10 ? d.date.slice(5) : d.label,
      }));
    }

    if (mode === 'weekly') {
      const weekMap: Record<string, TrendDataPoint> = {};
      data.forEach(d => {
        const dObj = new Date(d.date);
        const year = dObj.getFullYear();
        const start = new Date(year, 0, 1);
        const diff = (dObj.getTime() - start.getTime() + (start.getTimezoneOffset() - dObj.getTimezoneOffset()) * 60000) / 86400000;
        const week = Math.ceil((diff + start.getDay() + 1) / 7);
        const key = `${year}-W${week}`;
        if (!weekMap[key]) {
          weekMap[key] = { label: `W${week}`, count: 0, qualified: 0, failed: 0, pooling: 0, date: key };
        }
        weekMap[key].count += d.count;
        weekMap[key].qualified += d.qualified;
        weekMap[key].failed += d.failed;
        weekMap[key].pooling += d.pooling;
      });
      return Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date));
    }

    const monthly: Record<string, TrendDataPoint> = {};
    data.forEach(d => {
      const monthKey = d.date.slice(0, 7);
      if (!monthly[monthKey]) {
        monthly[monthKey] = { label: monthKey, count: 0, qualified: 0, failed: 0, pooling: 0, date: monthKey };
      }
      monthly[monthKey].count += d.count;
      monthly[monthKey].qualified += d.qualified;
      monthly[monthKey].failed += d.failed;
      monthly[monthKey].pooling += d.pooling;
    });
    return Object.values(monthly).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, mode]);

  if (data.length === 0) {
    return (
      <div className={styles.trendSection}>
        <div className={styles.trendEmpty}>No application trend data available</div>
      </div>
    );
  }

  const subtitle = mode === 'daily' ? 'day' : mode === 'weekly' ? 'week' : 'month';

  return (
    <div className={styles.trendSection}>
      <div className={styles.trendHeader}>
        <div>
          <h3 className={styles.trendTitle}>Applications Over Time</h3>
          <p className={styles.trendSubtitle}>Applications submitted per {subtitle}</p>
        </div>
        <div className={styles.trendToggle}>
          <button
            className={`${styles.trendToggleBtn} ${mode === 'daily' ? styles.trendToggleBtnActive : ''}`}
            onClick={() => setMode('daily')}
          >
            Daily
          </button>
          <button
            className={`${styles.trendToggleBtn} ${mode === 'weekly' ? styles.trendToggleBtnActive : ''}`}
            onClick={() => setMode('weekly')}
          >
            Weekly
          </button>
          <button
            className={`${styles.trendToggleBtn} ${mode === 'monthly' ? styles.trendToggleBtnActive : ''}`}
            onClick={() => setMode('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>
      <PlotlyTrendChart key={mode} data={grouped} />
    </div>
  );
}

interface DashboardContentProps {
  isSuperAdmin?: boolean;
}

export default function DashboardContent({ isSuperAdmin: initialSuperAdmin = false }: DashboardContentProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [deptPositions, setDeptPositions] = useState<{ [dept: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialSuperAdmin);
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([]);
  const [heightInFeet, setHeightInFeet] = useState(true);
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const [showDateFilters, setShowDateFilters] = useState(!isMobile);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [mathExamExperienceFilter, setMathExamExperienceFilter] = useState('all');

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalApplicants, setModalApplicants] = useState<ApplicantListItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotalCount, setModalTotalCount] = useState(0);
  const [modalAllApplicants, setModalAllApplicants] = useState<ApplicantListItem[]>([]);
  const MODAL_PAGE_SIZE = 50;

  const handleStatusClick = useCallback(async (status: string, department: string, position?: string, page = 1) => {
    setModalTitle(position 
      ? `${status} - ${position} in ${department}` 
      : `${status} in ${department}`);
    setModalOpen(true);
    setModalLoading(true);
    setModalPage(page);

    let query = supabase
      .from('applicants')
      .select('reference_no, first_name, last_name, middle_name, position_applied, application_status, department, current_stage, experience_level, created_at', { count: 'exact' })
      .eq('department', department)
      .order('created_at', { ascending: false });

    if (position) {
      query = query.eq('position_applied', position);
    }

    if (status === 'Passed') {
      query = query.in('application_status', ['Passed', 'Completed']);
    } else if (status === 'Failed') {
      query = query.in('application_status', ['Failed', 'Not Recommended']);
    } else {
      query = query.eq('application_status', status);
    }

    const from = (page - 1) * MODAL_PAGE_SIZE;
    const to = from + MODAL_PAGE_SIZE - 1;
    const { data, count } = await query.range(from, to);
    setModalTotalCount(count || 0);
    setModalApplicants(data || []);
    setModalLoading(false);
  }, [supabase]);

  const handleStageBreakdownClick = useCallback(async (stageName: string, department: string, page = 1) => {
    setModalTitle(`${stageName} in ${department}`);
    setModalOpen(true);
    setModalLoading(true);
    setModalPage(page);

    const from = (page - 1) * MODAL_PAGE_SIZE;
    const to = from + MODAL_PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from('applicants')
      .select('reference_no, first_name, last_name, middle_name, position_applied, application_status, department, current_stage, experience_level, created_at', { count: 'exact' })
      .eq('department', department)
      .eq('current_stage', stageName)
      .order('created_at', { ascending: false })
      .range(from, to);

    setModalTotalCount(count || 0);
    setModalApplicants(data || []);
    setModalLoading(false);
  }, [supabase]);

  const handleStageClick = useCallback(async (stage: string, result: string, department: string, page = 1) => {
    setModalTitle(`${stage} ${result} in ${department}`);
    setModalOpen(true);
    setModalLoading(true);
    setModalPage(page);

    const { data: apps } = await supabase
      .from('applicants')
      .select('reference_no, first_name, last_name, middle_name, position_applied, application_status, department, current_stage, experience_level, created_at')
      .eq('department', department)
      .limit(1000);

    const refNos = (apps || []).map(a => a.reference_no).filter(Boolean);
    
    let matchingRefs: Set<string>;
    
    if (result === 'Pending') {
      // Pending: for Math Exam, it's all Dealer applicants who haven't taken the exam yet
      // (matches the dashboard calculation: total Dealers - taken)
      if (stage === 'Math Exam') {
        const isExpDealer = (a: any) => a.experience_level === 'Experienced Dealer' || a.experience_level === 'Experienced-Dealer';
        const dealerRefs = (apps || [])
          .filter(a => {
            if (a.position_applied !== 'Dealer') return false;
            if (mathExamExperienceFilter === 'all') return true;
            if (mathExamExperienceFilter === 'experienced') return isExpDealer(a);
            if (mathExamExperienceFilter === 'non_experienced') return !isExpDealer(a);
            return true;
          })
          .map(a => a.reference_no);
        
        if (dealerRefs.length > 0) {
          const { data: completedMathExams } = await supabase
            .from('math_exam_results')
            .select('reference_no')
            .in('reference_no', dealerRefs)
            .in('status', ['Passed', 'Failed']);
          const completedRefs = new Set(completedMathExams?.map(r => r.reference_no) || []);
          matchingRefs = new Set(dealerRefs.filter(r => !completedRefs.has(r)));
        } else {
          matchingRefs = new Set();
        }
      } else if (stage === 'Table Test') {
        // Pending Table Test mirrors dashboard count:
        // experienced dealers in Table Games with no Table Test result yet.
        const experiencedDealerRefs = (apps || [])
          .filter(a =>
            a.position_applied === 'Dealer' &&
            (a.experience_level === 'Experienced Dealer' || a.experience_level === 'Experienced-Dealer')
          )
          .map(a => a.reference_no);

        if (experiencedDealerRefs.length > 0) {
          const { data: tableTestResults } = await supabase
            .from('stage_results')
            .select('reference_no')
            .in('reference_no', experiencedDealerRefs)
            .eq('stage_name', 'Table Test');
          const takenRefs = new Set(tableTestResults?.map(r => r.reference_no) || []);
          matchingRefs = new Set(experiencedDealerRefs.filter(r => !takenRefs.has(r)));
        } else {
          matchingRefs = new Set();
        }
      } else {
        // For other stages, pending = current_stage matches but no result yet
        const pendingRefNos = (apps || [])
          .filter(a => a.current_stage === stage)
          .map(a => a.reference_no);
        matchingRefs = new Set(pendingRefNos);
      }
    } else if (stage === 'Math Exam' && (result === 'Retake' || result === 'Passed' || result === 'Failed')) {
      // Filter apps by experience level first
      const isExpDealer = (a: any) => a.experience_level === 'Experienced Dealer' || a.experience_level === 'Experienced-Dealer';
      const filteredApps = (apps || []).filter(a => {
        if (a.position_applied !== 'Dealer') return false;
        if (mathExamExperienceFilter === 'all') return true;
        if (mathExamExperienceFilter === 'experienced') return isExpDealer(a);
        if (mathExamExperienceFilter === 'non_experienced') return !isExpDealer(a);
        return true;
      });
      const filteredRefNos = filteredApps.map(a => a.reference_no).filter(Boolean);
      
      const { data: mathResults } = filteredRefNos.length > 0
        ? await supabase
            .from('math_exam_results')
            .select('reference_no, status, attempt_count, submitted_at, started_at, created_at')
            .in('reference_no', filteredRefNos)
        : { data: [] };

      const allAttempts = (mathResults || []) as MathExamAttempt[];
      const latestAttempts = getLatestMathAttempts(allAttempts);

      if (result === 'Retake') {
        matchingRefs = getMathRetakeRefs(allAttempts);
      } else {
        matchingRefs = new Set(
          Object.values(latestAttempts)
            .filter((attempt) => attempt.status === result)
            .map((attempt) => attempt.reference_no)
        );
      }
    } else {
      // Other stages come from stage_results table
      const { data: stages } = refNos.length > 0
        ? await supabase
            .from('stage_results')
            .select('reference_no, stage_name, result_status')
            .in('reference_no', refNos)
            .eq('stage_name', stage)
            .eq('result_status', result)
        : { data: [] };
      matchingRefs = new Set(stages?.map(s => s.reference_no) || []);
    }
    
    const filtered = (apps || []).filter(a => matchingRefs.has(a.reference_no));

    const mapped = filtered.map(a => ({
      ...a,
      application_status: result === 'Pending' || result === 'Retake' ? 'Ongoing' : (result === 'Passed' ? 'Passed' : 'Failed')
    }));

    setModalTotalCount(mapped.length);
    setModalAllApplicants(mapped);

    const from = (page - 1) * MODAL_PAGE_SIZE;
    const to = from + MODAL_PAGE_SIZE;
    setModalApplicants(mapped.slice(from, to));
    setModalLoading(false);
  }, [supabase, mathExamExperienceFilter]);

  const closeModal = () => {
    setModalOpen(false);
    setModalApplicants([]);
    setModalTitle('');
    setModalPage(1);
    setModalTotalCount(0);
    setModalAllApplicants([]);
  };

  const handleStatusPageChange = useCallback(async (newPage: number, status: string, department: string, position?: string) => {
    setModalLoading(true);
    const from = (newPage - 1) * MODAL_PAGE_SIZE;
    const to = from + MODAL_PAGE_SIZE - 1;

    let query = supabase
      .from('applicants')
      .select('reference_no, first_name, last_name, middle_name, position_applied, application_status, department, current_stage, experience_level, created_at')
      .eq('department', department)
      .order('created_at', { ascending: false });

    if (position) {
      query = query.eq('position_applied', position);
    }

    if (status === 'Passed') {
      query = query.in('application_status', ['Passed', 'Completed']);
    } else if (status === 'Failed') {
      query = query.in('application_status', ['Failed', 'Not Recommended']);
    } else {
      query = query.eq('application_status', status);
    }

    const { data } = await query.range(from, to);
    setModalPage(newPage);
    setModalApplicants(data || []);
    setModalLoading(false);
  }, [supabase]);

  const handleStagePageChange = useCallback((newPage: number) => {
    setModalLoading(true);
    setTimeout(() => {
      const from = (newPage - 1) * MODAL_PAGE_SIZE;
      const to = from + MODAL_PAGE_SIZE;
      setModalPage(newPage);
      setModalApplicants(modalAllApplicants.slice(from, to));
      setModalLoading(false);
    }, 50);
  }, [modalAllApplicants]);

  useEffect(() => {
    const deptCookie = getCookie('allowed_departments');
    
    if (deptCookie) {
      try {
        setAllowedDepartments(JSON.parse(deptCookie));
      } catch (e) {
        setAllowedDepartments([]);
      }
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    
    const emptyPos = (): PositionSummary => ({ total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 });
    const emptyStage = (): StageSummary => ({ taken: 0, pending: 0, passed: 0, failed: 0, retakes: 0 });
    const emptyAgeBands = (): AgeBandSummary => ({ age20s: 0, age30s: 0, age40s: 0, age50Plus: 0 });
    const emptyHeightBands = (): HeightBandSummary => ({ below160: 0, height160170: 0, height170180: 0, height180Plus: 0 });

  const emptyAgeGender = () => ({
    age20s: { male: 0, female: 0 },
    age30s: { male: 0, female: 0 },
    age40s: { male: 0, female: 0 },
    age50Plus: { male: 0, female: 0 },
  });

  const emptyHeightGender = () => ({
    below160: { male: 0, female: 0 },
    height160170: { male: 0, female: 0 },
    height170180: { male: 0, female: 0 },
    height180Plus: { male: 0, female: 0 },
  });
    
    const data: DashboardData = {};
    const positionsMap: { [dept: string]: string[] } = {};
    
    // Load math exam experience filter config
    const { data: mathExamFilterData } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'MATH_EXAM_EXPERIENCE_FILTER')
      .single();
    const mathExamFilter = mathExamFilterData?.value || 'all';
    setMathExamExperienceFilter(mathExamFilter);
    
    // Query departments and their positions
    let deptQuery = supabase.from('departments').select('id, name, is_active').order('name');
    const { data: deptRows } = await deptQuery;
    
    // Filter to allowed departments - only show departments if super admin, otherwise strictly filter
    // Non-super admins without allowed departments should see nothing
    if (!isSuperAdmin && allowedDepartments.length === 0) {
      setDeptPositions({});
      setDashboardData({});
      setLoading(false);
      return;
    }
    
    const deptsToShow = isSuperAdmin
      ? (deptRows || []).filter((d: any) => d.is_active)
      : (deptRows || []).filter((d: any) => d.is_active && allowedDepartments.includes(d.name));
    
    // Get positions for each department
    for (const dept of deptsToShow) {
      const { data: posRows } = await supabase
        .from('positions')
        .select('name, is_active')
        .eq('department_id', dept.id)
        .eq('is_active', true)
        .order('name');
      
      positionsMap[dept.name] = (posRows || []).map((p: any) => p.name);
      
      data[dept.name] = {
        positions: {},
        genderByPosition: {},
        stageMath: emptyStage(),
        stageTable: emptyStage(),
        stageCounts: {},
        ageBands: emptyAgeBands(),
        heightBands: emptyHeightBands(),
        ageGenderByPosition: {},
        heightGenderByPosition: {},
        total: 0,
        pending: 0,
        ongoing: 0,
        qualified: 0,
        reprofile: 0,
        pooling: 0,
        failed: 0,
      };
      
      // Initialize position summaries
      for (const pos of posRows || []) {
        data[dept.name].positions[pos.name] = emptyPos();
        data[dept.name].genderByPosition[pos.name] = { male: 0, female: 0 };
        data[dept.name].ageGenderByPosition[pos.name] = emptyAgeGender();
        data[dept.name].heightGenderByPosition[pos.name] = emptyHeightGender();
      }
    }
    
    // Query applicants
    let appQuery = supabase
      .from('applicants')
      .select('reference_no, application_status, current_stage, position_applied, gender, birthdate, experience_level, department, height_cm, created_at')
      .in('department', deptsToShow.map(d => d.name));
    
    if (startDate) appQuery = appQuery.gte('created_at', startDate);
    if (endDate) appQuery = appQuery.lte('created_at', endDate + 'T23:59:59');
    
    const { data: appRows } = await appQuery;
    
    // Query stage results for relevant applicants
    const refNos = (appRows || []).map((r: any) => r.reference_no);
    const { data: stageRows } = refNos.length > 0
      ? await supabase.from('stage_results').select('reference_no, stage_name, result_status').in('reference_no', refNos)
      : { data: [] };
    
    const stageMap: { [refNo: string]: { [stage: string]: string } } = {};
    stageRows?.forEach((row: any) => {
      if (!stageMap[row.reference_no]) stageMap[row.reference_no] = {};
      stageMap[row.reference_no][row.stage_name] = row.result_status || '';
    });

    // Query math exam results for Dealer positions
    const { data: mathExamRows } = refNos.length > 0
      ? await supabase.from('math_exam_results').select('reference_no, status, attempt_count, submitted_at, started_at, created_at').in('reference_no', refNos)
      : { data: [] };
    
    const mathExamMap: { [refNo: string]: string } = {};
    const mathExamRetakeRefs = getMathRetakeRefs((mathExamRows || []) as MathExamAttempt[]);
    const latestMathAttempts = getLatestMathAttempts((mathExamRows || []) as MathExamAttempt[]);
    Object.values(latestMathAttempts).forEach((row) => {
      mathExamMap[row.reference_no] = row.status || '';
    });
    
    const computeAge = (bd: string) => {
      if (!bd) return 0;
      const dob = new Date(bd);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    };
    
    // Build stats
    appRows?.forEach((r: any) => {
      const dept = r.department || '';
      const deptData = data[dept];
      if (!deptData) return;
      
      const status = r.application_status || 'Pending';
      const pos = r.position_applied || 'Unknown';
      const gender = r.gender || 'Unknown';
      const age = computeAge(r.birthdate);
      
      // Overall for department
      deptData.total++;
      if (status === 'Pending') deptData.pending++;
      else if (status === 'Ongoing') deptData.ongoing++;
      else if (status === 'Passed' || status === 'Completed') deptData.qualified++;
      else if (status === 'Reprofile') deptData.reprofile++;
      else if (status === 'For Pooling') deptData.pooling++;
      else if (status === 'Failed' || status === 'Not Recommended') deptData.failed++;
      
      // Stage breakdown by current_stage
      const currentStage = r.current_stage || 'Pending';
      if (deptData.stageCounts[currentStage]) {
        deptData.stageCounts[currentStage]++;
      } else {
        deptData.stageCounts[currentStage] = 1;
      }
      
      // By position within department
      const posData = deptData.positions[pos];
      if (posData) {
        posData.total++;
        if (status === 'Pending') posData.pending++;
        else if (status === 'Ongoing') posData.ongoing++;
        else if (status === 'Passed' || status === 'Completed') posData.qualified++;
        else if (status === 'Reprofile') posData.reprofile++;
        else if (status === 'For Pooling') posData.pooling++;
        else if (status === 'Failed' || status === 'Not Recommended') posData.failed++;
      }
      
      // Gender breakdown by position
      const genderData = deptData.genderByPosition[pos];
      if (genderData && (gender === 'Male' || gender === 'Female')) {
        if (gender === 'Male') genderData.male++;
        else if (gender === 'Female') genderData.female++;
      }

      if (age >= 20 && age <= 29) deptData.ageBands.age20s++;
      else if (age >= 30 && age <= 39) deptData.ageBands.age30s++;
      else if (age >= 40 && age <= 49) deptData.ageBands.age40s++;
      else if (age >= 50) deptData.ageBands.age50Plus++;
      
      // Age + Gender breakdown by position
      const agePosData = deptData.ageGenderByPosition[pos];
      if (agePosData) {
        const isMale = gender === 'Male';
        const isFemale = gender === 'Female';
        if (age >= 20 && age <= 29) {
          if (isMale) agePosData.age20s.male++;
          else if (isFemale) agePosData.age20s.female++;
        } else if (age >= 30 && age <= 39) {
          if (isMale) agePosData.age30s.male++;
          else if (isFemale) agePosData.age30s.female++;
        } else if (age >= 40 && age <= 49) {
          if (isMale) agePosData.age40s.male++;
          else if (isFemale) agePosData.age40s.female++;
        } else if (age >= 50) {
          if (isMale) agePosData.age50Plus.male++;
          else if (isFemale) agePosData.age50Plus.female++;
        }
      }
      
      // Height band breakdown
      const height = r.height_cm;
      const isMale = gender === 'Male';
      const isFemale = gender === 'Female';
      
      if (height !== null && height !== undefined && !isNaN(height)) {
        if (height < 158) deptData.heightBands.below160++;
        else if (height >= 158 && height < 170) deptData.heightBands.height160170++;
        else if (height >= 170 && height < 183) deptData.heightBands.height170180++;
        else if (height >= 183) deptData.heightBands.height180Plus++;
        
        // Height + Gender breakdown by position
        const heightPosData = deptData.heightGenderByPosition[pos];
        if (heightPosData) {
          if (height < 158) {
            if (isMale) heightPosData.below160.male++;
            else if (isFemale) heightPosData.below160.female++;
          } else if (height >= 158 && height < 170) {
            if (isMale) heightPosData.height160170.male++;
            else if (isFemale) heightPosData.height160170.female++;
          } else if (height >= 170 && height < 183) {
            if (isMale) heightPosData.height170180.male++;
            else if (isFemale) heightPosData.height170180.female++;
          } else if (height >= 183) {
            if (isMale) heightPosData.height180Plus.male++;
            else if (isFemale) heightPosData.height180Plus.female++;
          }
        }
      }
      
      // Math Exam stats for Dealer position in all departments (filtered by experience level)
      if (pos === 'Dealer') {
        const isExpDealer = r.experience_level === 'Experienced Dealer' || r.experience_level === 'Experienced-Dealer';
        const matchesFilter = mathExamFilter === 'all' || 
          (mathExamFilter === 'experienced' && isExpDealer) ||
          (mathExamFilter === 'non_experienced' && !isExpDealer);
        
        if (matchesFilter) {
          const mathResult = mathExamMap[r.reference_no];
          if (mathResult) {
            deptData.stageMath.taken++;
            if (mathResult === 'Passed') deptData.stageMath.passed++;
            else if (mathResult === 'Failed') deptData.stageMath.failed++;
            if (mathExamRetakeRefs.has(r.reference_no)) deptData.stageMath.retakes++;
          }
        }
      }
      
      // Stage stats (only for Experienced Dealer in Table Games)
      const isExperiencedDealer = pos === 'Dealer' && (r.experience_level === 'Experienced Dealer' || r.experience_level === 'Experienced-Dealer');
      if (isExperiencedDealer && dept === 'Table Games') {
        const stages = stageMap[r.reference_no];
        if (stages) {
          const table = stages['Table Test'];
          if (table) { deptData.stageTable.taken++; if (table === 'Passed') deptData.stageTable.passed++; else if (table === 'Failed') deptData.stageTable.failed++; }
        }
      }
    });
    
    // Calculate pending Math Exams for all Dealers and pending Table Tests for Experienced Dealer in Table Games
    // For each department, calculate pending Math Exams for Dealers (filtered by experience level)
    Object.keys(data).forEach(deptName => {
      const deptData = data[deptName];
      const dealerCount = (appRows || []).filter((r: any) => {
        if (r.position_applied !== 'Dealer' || r.department !== deptName) return false;
        const isExpDealer = r.experience_level === 'Experienced Dealer' || r.experience_level === 'Experienced-Dealer';
        return mathExamFilter === 'all' || 
          (mathExamFilter === 'experienced' && isExpDealer) ||
          (mathExamFilter === 'non_experienced' && !isExpDealer);
      }).length;
      deptData.stageMath.pending = Math.max(0, dealerCount - deptData.stageMath.taken);
    });
    
    // Calculate pending Table Tests only for Table Games - Experienced Dealer
    if (data['Table Games']) {
      const expDealer = (appRows || []).filter((r: any) => 
        r.position_applied === 'Dealer' && 
        r.department === 'Table Games' &&
        (r.experience_level === 'Experienced Dealer' || r.experience_level === 'Experienced-Dealer')
      ).length;
      data['Table Games'].stageTable.pending = Math.max(0, expDealer - data['Table Games'].stageTable.taken);
    }
    
    // Compute trend data from created_at dates
    const dateCounts: Record<string, { total: number; qualified: number; failed: number; pooling: number }> = {};
    (appRows || []).forEach((r: any) => {
      if (r.created_at) {
        const d = r.created_at.slice(0, 10);
        if (!dateCounts[d]) dateCounts[d] = { total: 0, qualified: 0, failed: 0, pooling: 0 };
        dateCounts[d].total++;
        const status = r.application_status || '';
        if (status === 'Passed' || status === 'Completed') {
          dateCounts[d].qualified++;
        }
        if (status === 'Not Recommended') {
          dateCounts[d].failed++;
        }
        if (status === 'For Pooling') {
          dateCounts[d].pooling++;
        }
      }
    });

    const sortedDates = Object.keys(dateCounts).sort();
    const dailyData: TrendDataPoint[] = sortedDates.map(dateStr => ({
      label: dateStr.slice(5),
      count: dateCounts[dateStr].total,
      qualified: dateCounts[dateStr].qualified,
      failed: dateCounts[dateStr].failed,
      pooling: dateCounts[dateStr].pooling,
      date: dateStr,
    }));
    setTrendData(dailyData);
    setTrendLoading(false);

    setDeptPositions(positionsMap);
    setDashboardData(data);
    setLoading(false);
  }, [supabase, startDate, endDate, isSuperAdmin, allowedDepartments, mathExamExperienceFilter]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const clearFilters = () => { setStartDate(''); setEndDate(''); };

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dept)) newSet.delete(dept);
      else newSet.add(dept);
      return newSet;
    });
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
  }

  const deptNames = Object.keys(dashboardData);

  return (
    <div style={{ padding: isMobile ? '8px' : '0', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Header with inline filters */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: isMobile ? '12px' : '20px',
        gap: isMobile ? '10px' : '0'
      }}>
        <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '700', color: '#1E40AF', margin: 0 }}>Dashboard</h1>
        
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted small">{deptNames.length} dept{deptNames.length !== 1 ? 's' : ''}</span>
            <button 
              className="btn btn-sm btn-outline-secondary" 
              onClick={() => setShowDateFilters(!showDateFilters)}
            >
              {showDateFilters ? 'Hide Dates ▲' : 'Show Dates ▼'}
            </button>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '4px' : '8px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start date"
            className={!showDateFilters && isMobile ? 'd-none' : ''}
            style={{ 
                    padding: isMobile ? '6px 8px' : '8px 12px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    fontSize: isMobile ? '11px' : '13px', 
                    background: '#fff',
                    width: isMobile ? '100%' : 'auto'
                  }}
            />
            {!showDateFilters && isMobile && <span style={{ color: '#F59E0B', fontSize: '11px' }}>to</span>}
          {(!showDateFilters || !isMobile) && (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End date"
              className={!showDateFilters && isMobile ? 'd-none' : ''}
              style={{ 
                  padding: isMobile ? '6px 8px' : '8px 12px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  fontSize: isMobile ? '11px' : '13px', 
                  background: '#fff',
                  width: isMobile ? '100%' : 'auto'
                }}
              />
            )}
            {(startDate || endDate) && (
              <button
                onClick={clearFilters}
                style={{
                  padding: isMobile ? '6px 10px' : '8px 14px', 
                  background: '#fff', color: '#1E40AF', border: '1px solid #1E40AF',
                  borderRadius: '8px', fontSize: isMobile ? '11px' : '13px', cursor: 'pointer', fontWeight: '500',
                }}
              >
                Clear
              </button>
            )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}>
        {/* Global KPI Donut */}
        {deptNames.length > 0 && (
          <div className={styles.trendSection}>
            <div className={styles.trendHeader}>
              <div>
                <h3 className={styles.trendTitle}>Applicant Overview</h3>
                <p className={styles.trendSubtitle}>Breakdown by application status</p>
              </div>
            </div>
            <PlotlyKpiDonut
              data={{
                pending: Object.values(dashboardData).reduce((s, d) => s + d.pending, 0),
                ongoing: Object.values(dashboardData).reduce((s, d) => s + d.ongoing, 0),
                qualified: Object.values(dashboardData).reduce((s, d) => s + d.qualified, 0),
                reprofile: Object.values(dashboardData).reduce((s, d) => s + d.reprofile, 0),
                pooling: Object.values(dashboardData).reduce((s, d) => s + d.pooling, 0),
                failed: Object.values(dashboardData).reduce((s, d) => s + d.failed, 0),
              }}
              total={Object.values(dashboardData).reduce((s, d) => s + d.total, 0)}
            />
          </div>
        )}

        {/* Trend Bar Chart */}
        {!trendLoading && <TrendChart data={trendData} />}
      </div>

      {deptNames.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No departments available.
        </div>
      )}

{deptNames.map(deptName => {
        const deptData = dashboardData[deptName];
        const positions = deptPositions[deptName] || [];
        const deptHeaderColor = deptName === 'Table Games' ? '#000080' : deptName === 'Business Development' ? '#006400' : (deptName === 'Slots' || deptName === 'Slots/E-Gaming') ? '#FF8C00' : '#000080';
        const isExpanded = expandedDepts.has(deptName) || !isMobile;
        const toggleCard = () => { if (isMobile) toggleDept(deptName); };
        
        return (
          <div key={deptName} className={styles.deptCard}>
            {/* Department Header - clickable on mobile */}
            <div 
              className={`${styles.deptHeader} ${isMobile ? styles.deptHeaderMobile : ''}`}
              style={{
                background: deptHeaderColor,
                color: deptName === 'Table Games' || deptName === 'Business Development' ? '#FFD700' : deptName === 'Slots' || deptName === 'Slots/E-Gaming' ? '#000' : '#FFD700',
                cursor: isMobile ? 'pointer' : 'default',
              }}
              onClick={toggleCard}
            >
              <h2 className={styles.deptTitle} style={{ 
                color: deptName === 'Table Games' ? '#fff' : deptName === 'Business Development' ? '#fff' : (deptName === 'Slots' || deptName === 'Slots/E-Gaming') ? '#000' : '#FFD700',
              }}>
                {deptName}
                {isMobile && <span style={{ fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>}
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)', 
                gap: isMobile ? '4px' : '8px',
                marginTop: isMobile ? '8px' : '0',
                width: isMobile ? '100%' : 'auto'
              }}>
                <SummaryCard label="Total" value={deptData.total} total={deptData.total} />
                <SummaryCard label="Pending" value={deptData.pending} color={CARD_COLORS.pending} total={deptData.total} onClick={deptData.pending > 0 ? () => handleStatusClick('Pending', deptName) : undefined} />
                <SummaryCard label="Ongoing" value={deptData.ongoing} color={CARD_COLORS.ongoing} total={deptData.total} onClick={deptData.ongoing > 0 ? () => handleStatusClick('Ongoing', deptName) : undefined} />
                <SummaryCard label="Qualified" value={deptData.qualified} color={CARD_COLORS.qualified} total={deptData.total} onClick={deptData.qualified > 0 ? () => handleStatusClick('Passed', deptName) : undefined} />
                {!isMobile && <SummaryCard label="Reprofile" value={deptData.reprofile} color={CARD_COLORS.reprofile} total={deptData.total} onClick={deptData.reprofile > 0 ? () => handleStatusClick('Reprofile', deptName) : undefined} />}
                {!isMobile && <SummaryCard label="Pooling" value={deptData.pooling} color={CARD_COLORS.pooling} total={deptData.total} onClick={deptData.pooling > 0 ? () => handleStatusClick('For Pooling', deptName) : undefined} />}
                {!isMobile && <SummaryCard label="Failed" value={deptData.failed} color={CARD_COLORS.failed} total={deptData.total} onClick={deptData.failed > 0 ? () => handleStatusClick('Failed', deptName) : undefined} />}
              </div>
            </div>

            {/* Stage Breakdown - by current stage */}
            {Object.keys(deptData.stageCounts).length > 0 && (
              <div className={styles.sectionCard} style={{ padding: isMobile ? '12px' : '16px' }}>
                <h3 className={styles.sectionTitle} style={{ fontSize: isMobile ? '13px' : '15px', marginBottom: isMobile ? '10px' : '14px' }}>
                  Stage Breakdown
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px' : '10px' }}>
                  {Object.entries(deptData.stageCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stageName, count]) => (
                      <button
                        key={stageName}
                        onClick={count > 0 ? () => handleStageBreakdownClick(stageName, deptName) : undefined}
                        className={styles.stagePill}
                        style={{ opacity: count > 0 ? 1 : 0.5, cursor: count > 0 ? 'pointer' : 'default' }}
                      >
                        <span>{stageName}</span>
                        <span className={styles.stagePillCount}>{count}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
            
            {/* Position Sections - collapsible on mobile */}
            {(!isMobile || isExpanded) && (
              <>
                {/* Position Sections */}
                {positions.map(posName => {
                  const posSummary = deptData.positions[posName] || emptyPos();
                  if (posSummary.total === 0) return null;
                  
                  return (
                    <div key={posName} style={{ marginBottom: isMobile ? '12px' : '20px', marginTop: isMobile ? '12px' : '0' }}>
                      <h3 style={{ 
                        fontSize: isMobile ? '12px' : '14px', 
                        fontWeight: '700', 
                        marginBottom: isMobile ? '6px' : '10px', 
                        color: '#1E40AF' 
                      }}>{posName}</h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)', 
                        gap: isMobile ? '4px' : '8px' 
                      }}>
                        <SummaryCard label="Total" value={posSummary.total} total={posSummary.total} />
                        <SummaryCard label="Pending" value={posSummary.pending} color={CARD_COLORS.pending} total={posSummary.total} onClick={posSummary.pending > 0 ? () => handleStatusClick('Pending', deptName, posName) : undefined} />
                        <SummaryCard label="Ongoing" value={posSummary.ongoing} color={CARD_COLORS.ongoing} total={posSummary.total} onClick={posSummary.ongoing > 0 ? () => handleStatusClick('Ongoing', deptName, posName) : undefined} />
                        <SummaryCard label="Qualified" value={posSummary.qualified} color={CARD_COLORS.qualified} total={posSummary.total} onClick={posSummary.qualified > 0 ? () => handleStatusClick('Passed', deptName, posName) : undefined} />
                        {!isMobile && <SummaryCard label="Reprofile" value={posSummary.reprofile} color={CARD_COLORS.reprofile} total={posSummary.total} onClick={posSummary.reprofile > 0 ? () => handleStatusClick('Reprofile', deptName, posName) : undefined} />}
                        {!isMobile && <SummaryCard label="Pooling" value={posSummary.pooling} color={CARD_COLORS.pooling} total={posSummary.total} onClick={posSummary.pooling > 0 ? () => handleStatusClick('For Pooling', deptName, posName) : undefined} />}
                        {!isMobile && <SummaryCard label="Failed" value={posSummary.failed} color={CARD_COLORS.failed} total={posSummary.total} onClick={posSummary.failed > 0 ? () => handleStatusClick('Failed', deptName, posName) : undefined} />}
                      </div>
                      
                      {/* Stage sections only for Dealer in Table Games */}
                      {posName === 'Dealer' && deptName === 'Table Games' && (
                        <>
                          <StageSection title="Math Exam" summary={deptData.stageMath} onStageClick={(stage, result) => handleStageClick(stage, result, deptName)} />
                          <StageSection title="Table Test" summary={deptData.stageTable} onStageClick={(stage, result) => handleStageClick(stage, result, deptName)} />
                        </>
                      )}
                    </div>
                  );
                })}
                
                {/* Age & Gender / Height & Gender grids */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: isMobile ? '10px' : '20px',
                  marginTop: isMobile ? '12px' : '20px',
                }}>
                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>Age & Gender by Position</h3>
                    <AgeGenderMatrix data={deptData.ageGenderByPosition} />
                  </div>

                  <div className={styles.sectionCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Height & Gender</h3>
                      <button
                        onClick={() => setHeightInFeet(!heightInFeet)}
                        style={{
                          padding: isMobile ? '4px 8px' : '6px 12px',
                          fontSize: isMobile ? '10px' : '12px',
                          border: '1px solid #1E40AF',
                          borderRadius: '6px',
                          background: heightInFeet ? '#1E40AF' : '#fff',
                          color: heightInFeet ? '#fff' : '#1E40AF',
                          cursor: 'pointer',
                        }}
                      >
                        {heightInFeet ? 'Feet' : 'cm'}
                      </button>
                    </div>
                    <HeightGenderMatrix data={deptData.heightGenderByPosition} useFeet={heightInFeet} />
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Modal for showing applicants list */}
      {modalOpen && (
        <div className={styles.modalBackdrop} style={{ padding: isMobile ? '10px' : '20px' }} onClick={closeModal}>
          <div className={styles.modalCard} style={{ padding: isMobile ? '16px' : '24px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ marginBottom: '16px' }}>
              <h3 className={styles.modalTitle} style={{ fontSize: isMobile ? '16px' : '18px' }}>
                {modalTitle}
              </h3>
              <button onClick={closeModal} className={styles.modalClose}>
                ×
              </button>
            </div>
            
            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
            ) : modalApplicants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No applicants found</div>
            ) : (
              <div style={{ overflow: 'auto', flex: 1 }}>
                <table className={styles.tableStyled}>
                  <thead>
                    <tr>
                      <th>Reference No</th>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Current Stage</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalApplicants.map((app) => (
                      <tr key={app.reference_no}>
                        <td style={{ fontWeight: '600', color: '#1E40AF' }}>{app.reference_no}</td>
                        <td style={{ padding: '10px 8px' }}>{app.last_name?.toUpperCase()}, {app.first_name}{app.middle_name ? ' ' + app.middle_name : ''}</td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{app.position_applied}</td>
                        <td>
                          <span className={styles.statusBadge} style={{
                            backgroundColor: app.application_status === 'Passed' || app.application_status === 'Completed' ? '#d1fae5' : 
                              app.application_status === 'Failed' || app.application_status === 'Not Recommended' ? '#fee2e2' :
                              app.application_status === 'Reprofile' ? '#fef3c7' : app.application_status === 'For Pooling' ? '#cffafe' : '#dbeafe',
                            color: app.application_status === 'Passed' || app.application_status === 'Completed' ? '#065f46' : 
                              app.application_status === 'Failed' || app.application_status === 'Not Recommended' ? '#991b1b' :
                              app.application_status === 'Reprofile' ? '#92400e' : app.application_status === 'For Pooling' ? '#155e75' : '#1e40af',
                          }}>
                            {app.application_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{app.current_stage || '-'}</td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{app.created_at?.slice(0, 10) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className={styles.modalFooter} style={{ flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <div className={styles.modalInfo}>
                Showing {((modalPage - 1) * MODAL_PAGE_SIZE) + 1} - {Math.min(modalPage * MODAL_PAGE_SIZE, modalTotalCount)} of {modalTotalCount} applicant{modalTotalCount !== 1 ? 's' : ''}
              </div>
              {modalTotalCount > MODAL_PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => {
                      if (modalAllApplicants.length > 0) {
                        handleStagePageChange(modalPage - 1);
                      } else {
                        handleStatusPageChange(modalPage - 1, modalTitle.includes('Passed') ? 'Passed' : modalTitle.includes('Failed') ? 'Failed' : modalTitle.includes('Pending') ? 'Pending' : modalTitle.includes('Ongoing') ? 'Ongoing' : modalTitle.includes('Reprofile') ? 'Reprofile' : modalTitle.includes('Pooling') ? 'For Pooling' : 'Pending', modalTitle.split(' in ')[1] || '', undefined);
                      }
                    }}
                    disabled={modalPage === 1}
                    className={styles.pageBtn}
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.ceil(modalTotalCount / MODAL_PAGE_SIZE) }, (_, i) => i + 1).filter(p => {
                    const totalPages = Math.ceil(modalTotalCount / MODAL_PAGE_SIZE);
                    return p === 1 || p === totalPages || (p >= modalPage - 1 && p <= modalPage + 1);
                  }).map((p, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== p - 1) {
                      return <span key={`ellipsis-${p}`} style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          if (modalAllApplicants.length > 0) {
                            handleStagePageChange(p);
                          } else {
                            handleStatusPageChange(p, modalTitle.includes('Passed') ? 'Passed' : modalTitle.includes('Failed') ? 'Failed' : modalTitle.includes('Pending') ? 'Pending' : modalTitle.includes('Ongoing') ? 'Ongoing' : modalTitle.includes('Reprofile') ? 'Reprofile' : modalTitle.includes('Pooling') ? 'For Pooling' : 'Pending', modalTitle.split(' in ')[1] || '', undefined);
                          }
                        }}
                        className={`${styles.pageBtn} ${modalPage === p ? styles.pageBtnActive : ''}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      const totalPages = Math.ceil(modalTotalCount / MODAL_PAGE_SIZE);
                      if (modalAllApplicants.length > 0) {
                        handleStagePageChange(modalPage + 1);
                      } else {
                        handleStatusPageChange(modalPage + 1, modalTitle.includes('Passed') ? 'Passed' : modalTitle.includes('Failed') ? 'Failed' : modalTitle.includes('Pending') ? 'Pending' : modalTitle.includes('Ongoing') ? 'Ongoing' : modalTitle.includes('Reprofile') ? 'Reprofile' : modalTitle.includes('Pooling') ? 'For Pooling' : 'Pending', modalTitle.split(' in ')[1] || '', undefined);
                      }
                    }}
                    disabled={modalPage >= Math.ceil(modalTotalCount / MODAL_PAGE_SIZE)}
                    className={styles.pageBtn}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function emptyPos(): PositionSummary {
  return { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 };
}
