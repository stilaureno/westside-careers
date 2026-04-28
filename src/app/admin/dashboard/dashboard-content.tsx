'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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

function SummaryCard({ label, value, color = '#000080' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: '#f8f9fa', border: '1px solid #FFD700', borderRadius: '14px',
      padding: '12px', textAlign: 'center', minHeight: '88px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.3 }}>{label}</p>
      <strong style={{ fontSize: '20px', color }}>{value}</strong>
    </div>
  );
}

function PositionSection({ title, summary }: { title: string; summary: PositionSummary }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#000080' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} color="#6b7280" />
        <SummaryCard label="Ongoing" value={summary.ongoing} color="#d97706" />
        <SummaryCard label="Qualified" value={summary.qualified} color="#DAA520" />
        <SummaryCard label="Reprofile" value={summary.reprofile} color="#7c3aed" />
        <SummaryCard label="Pooling" value={summary.pooling} color="#0891b2" />
        <SummaryCard label="Failed" value={summary.failed} color="#991b1b" />
      </div>
    </div>
  );
}

function StageSection({ title, summary }: { title: string; summary: StageSummary }) {
  return (
    <div style={{ marginTop: '14px' }}>
      <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#6b7280' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <SummaryCard label="Taken" value={summary.taken} />
        <SummaryCard label="Pending" value={summary.pending} color="#6b7280" />
        <SummaryCard label="Passed" value={summary.passed} color="#166534" />
        <SummaryCard label="Failed" value={summary.failed} color="#991b1b" />
      </div>
    </div>
  );
}

function GenderRow({ label, male, female }: { label: string; male: number; female: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#000080' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
        <span style={{ color: '#FFD700' }}>M {male}</span>
        <span style={{ color: '#FFA07A' }}>F {female}</span>
      </span>
    </div>
  );
}

function AgeBandRow({ label, value, isLast = false }: { label: string; value: number; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: isLast ? 'none' : '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#000080' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#000080' }}>{value}</span>
    </div>
  );
}

function HeightBandRow({ label, value, isLast = false }: { label: string; value: number; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: isLast ? 'none' : '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#000080' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#000080' }}>{value}</span>
    </div>
  );
}

function AgeGenderMatrix({ data }: { data: AgeGenderByPosition }) {
  const positions = Object.keys(data).sort();
  
  if (positions.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No data available</p>;
  }
  
  const cellStyle: React.CSSProperties = {
    padding: '8px 6px',
    textAlign: 'center',
    fontSize: '12px',
    borderBottom: '1px solid #e5e7eb',
  };
  
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#f8f9fa',
    color: '#000080',
  };
  
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left', width: '100px' }}>Position</th>
            <th style={headerCellStyle} colSpan={3}>20s</th>
            <th style={headerCellStyle} colSpan={3}>30s</th>
            <th style={headerCellStyle} colSpan={3}>40s</th>
            <th style={headerCellStyle} colSpan={3}>50+</th>
          </tr>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left' }}></th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const p = data[pos];
            const rowTotal = p.age20s.male + p.age20s.female + p.age30s.male + p.age30s.female + p.age40s.male + p.age40s.female + p.age50Plus.male + p.age50Plus.female;
            if (rowTotal === 0) return null;
            
            return (
              <tr key={pos}>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: '600', color: '#000080' }}>{pos}</td>
                <td style={{ ...cellStyle, color: '#FFD700' }}>{p.age20s.male}</td>
                <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.age20s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age20s.male + p.age20s.female}</td>
                <td style={{ ...cellStyle, color: '#FFD700' }}>{p.age30s.male}</td>
                <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.age30s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age30s.male + p.age30s.female}</td>
                <td style={{ ...cellStyle, color: '#FFD700' }}>{p.age40s.male}</td>
                <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.age40s.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age40s.male + p.age40s.female}</td>
                <td style={{ ...cellStyle, color: '#FFD700' }}>{p.age50Plus.male}</td>
                <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.age50Plus.female}</td>
                <td style={{ ...cellStyle, fontWeight: '600' }}>{p.age50Plus.male + p.age50Plus.female}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HeightGenderMatrix({ data, useFeet = false }: { data: HeightGenderByPosition; useFeet?: boolean }) {
  const positions = Object.keys(data).sort();
  
  if (positions.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>No data available</p>;
  }
  
  const cmToFeetRange = (cm: number): { feet: number; inches: number } => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  
  const formatHeight = (cm: number): string => {
    const { feet, inches } = cmToFeetRange(cm);
    return `${feet}'${inches}`;
  };
  
  const getFeetDisplay = (data: HeightGenderByPosition) => {
    const result: { [pos: string]: { range52to54: { male: number; female: number }; range55to57: { male: number; female: number }; range58to60: { male: number; female: number }; range61Plus: { male: number; female: number } } } = {};
    
    for (const pos of Object.keys(data)) {
      result[pos] = {
        range52to54: { male: 0, female: 0 },
        range55to57: { male: 0, female: 0 },
        range58to60: { male: 0, female: 0 },
        range61Plus: { male: 0, female: 0 },
      };
      
      const p = data[pos];
      
      // below160 (<158 cm = below 5'2)
      result[pos].range52to54.male += p.below160.male;
      result[pos].range52to54.female += p.below160.female;
      
      // height160170 (158-169 cm = 5'2 - 5'7)
      result[pos].range55to57.male += p.height160170.male;
      result[pos].range55to57.female += p.height160170.female;
      
      // height170180 (170-183 cm = 5'7 - 6'0)
      result[pos].range58to60.male += p.height170180.male;
      result[pos].range58to60.female += p.height170180.female;
      
      // height180Plus (183+ cm = 6'0+)
      result[pos].range61Plus.male += p.height180Plus.male;
      result[pos].range61Plus.female += p.height180Plus.female;
    }
    
    return result;
  };
  
  const feetData = useFeet ? getFeetDisplay(data) : null;
  
  const cellStyle: React.CSSProperties = {
    padding: '8px 6px',
    textAlign: 'center',
    fontSize: '12px',
    borderBottom: '1px solid #e5e7eb',
  };
  
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: '700',
    background: '#f8f9fa',
    color: '#000080',
  };
  
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left', width: '100px' }}>Position</th>
            {useFeet ? (
              <>
                <th style={headerCellStyle} colSpan={3}>{`5'2 - 5'4`}</th>
                <th style={headerCellStyle} colSpan={3}>{`5'5 - 5'7`}</th>
                <th style={headerCellStyle} colSpan={3}>{`5'8 - 6'0`}</th>
                <th style={headerCellStyle} colSpan={3}>6&apos;1+</th>
              </>
            ) : (
              <>
                <th style={headerCellStyle} colSpan={3}>{'<158'}</th>
                <th style={headerCellStyle} colSpan={3}>158-169</th>
                <th style={headerCellStyle} colSpan={3}>170-183</th>
                <th style={headerCellStyle} colSpan={3}>{'183+'}</th>
              </>
            )}
          </tr>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left' }}></th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>M</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>F</th>
            <th style={{ ...headerCellStyle, fontSize: '10px', width: '45px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const p = data[pos];
            const rowTotal = p.below160.male + p.below160.female + p.height160170.male + p.height160170.female + p.height170180.male + p.height170180.female + p.height180Plus.male + p.height180Plus.female;
            if (rowTotal === 0) return null;
            
            const fd = feetData?.[pos];
            
            return (
              <tr key={pos}>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: '600', color: '#000080' }}>{pos}</td>
                {useFeet && fd ? (
                  <>
                    <td style={{ ...cellStyle, color: '#FFD700' }}>{fd.range52to54.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{fd.range52to54.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{fd.range52to54.male + fd.range52to54.female}</td>
                    <td style={{ ...cellStyle, color: '#FFD700' }}>{fd.range55to57.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{fd.range55to57.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{fd.range55to57.male + fd.range55to57.female}</td>
                    <td style={{ ...cellStyle, color: '#FFD700' }}>{fd.range58to60.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{fd.range58to60.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{fd.range58to60.male + fd.range58to60.female}</td>
                    <td style={{ ...cellStyle, color: '#FFD700' }}>{fd.range61Plus.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{fd.range61Plus.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{fd.range61Plus.male + fd.range61Plus.female}</td>
                  </>
                ) : (
                  <>
                    <td style={{ ...cellStyle, color: '#0066CC' }}>{p.below160.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.below160.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{p.below160.male + p.below160.female}</td>
                    <td style={{ ...cellStyle, color: '#0066CC' }}>{p.height160170.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.height160170.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height160170.male + p.height160170.female}</td>
                    <td style={{ ...cellStyle, color: '#0066CC' }}>{p.height170180.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.height170180.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height170180.male + p.height170180.female}</td>
                    <td style={{ ...cellStyle, color: '#0066CC' }}>{p.height180Plus.male}</td>
                    <td style={{ ...cellStyle, color: '#FFA07A' }}>{p.height180Plus.female}</td>
                    <td style={{ ...cellStyle, fontWeight: '600' }}>{p.height180Plus.male + p.height180Plus.female}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardContent() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [deptPositions, setDeptPositions] = useState<{ [dept: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([]);
  const [heightInFeet, setHeightInFeet] = useState(false);

  useEffect(() => {
    const superAdminCookie = getCookie('super_admin_session');
    const deptCookie = getCookie('allowed_departments');
    
    setIsSuperAdmin(superAdminCookie === 'super');
    
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
    const emptyStage = (): StageSummary => ({ taken: 0, pending: 0, passed: 0, failed: 0 });
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
      .select('reference_no, application_status, current_stage, position_applied, gender, birthdate, experience_level, department, height_cm')
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
      
      // Stage stats (only for Dealer position in Table Games)
      if (pos === 'Dealer' && dept === 'Table Games') {
        const stages = stageMap[r.reference_no];
        if (stages) {
          const math = stages['Math Exam'];
          const table = stages['Table Test'];
          if (math) { deptData.stageMath.taken++; if (math === 'Passed') deptData.stageMath.passed++; else if (math === 'Failed') deptData.stageMath.failed++; }
          if (table) { deptData.stageTable.taken++; if (table === 'Passed') deptData.stageTable.passed++; else if (table === 'Failed') deptData.stageTable.failed++; }
        }
      }
    });
    
    // Calculate pending stages for Table Games Dealer
    if (data['Table Games']) {
      const dealerPos = data['Table Games'].positions['Dealer'];
      if (dealerPos) {
        data['Table Games'].stageMath.pending = Math.max(0, dealerPos.total - data['Table Games'].stageMath.taken);
        data['Table Games'].stageTable.pending = Math.max(0, dealerPos.total - data['Table Games'].stageTable.taken);
      }
    }
    
    setDeptPositions(positionsMap);
    setDashboardData(data);
    setLoading(false);
  }, [supabase, startDate, endDate, isSuperAdmin, allowedDepartments]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const clearFilters = () => { setStartDate(''); setEndDate(''); };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
  }

  const deptNames = Object.keys(dashboardData);

  return (
    <div style={{ padding: '0' }}>
      {/* Header with inline filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#000080', margin: 0 }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start date"
            style={{ padding: '8px 12px', border: '1px solid #FFD700', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
          />
          <span style={{ color: '#FFD700', fontSize: '13px' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End date"
            style={{ padding: '8px 12px', border: '1px solid #FFD700', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
          />
          {(startDate || endDate) && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 14px', background: '#fff', color: '#8b1e2d', border: '1px solid #8b1e2d',
                borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {deptNames.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No departments available.
        </div>
      )}

{deptNames.map(deptName => {
        const deptData = dashboardData[deptName];
        const positions = deptPositions[deptName] || [];
        const deptHeaderColor = deptName === 'Table Games' ? '#800000' : deptName === 'Business Development' ? '#006400' : (deptName === 'Slots' || deptName === 'Slots/E-Gaming') ? '#FF8C00' : '#000080';
        
        return (
          <div key={deptName} style={{
            background: '#f0f4f8', border: '1px solid #FFD700', borderRadius: '18px', padding: '20px', marginBottom: '20px',
          }}>
            {/* Department Header */}
            <div style={{
              background: deptHeaderColor, color: '#FFD700', borderRadius: '12px', padding: '16px',
              marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: deptName === 'Table Games' ? '#fff' : deptName === 'Business Development' ? '#fff' : (deptName === 'Slots' || deptName === 'Slots/E-Gaming') ? '#000' : '#FFD700' }}>{deptName}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                <SummaryCard label="Total" value={deptData.total} />
                <SummaryCard label="Pending" value={deptData.pending} color="#6b7280" />
                <SummaryCard label="Ongoing" value={deptData.ongoing} color="#d97706" />
                <SummaryCard label="Qualified" value={deptData.qualified} color="#FFD700" />
                <SummaryCard label="Reprofile" value={deptData.reprofile} color="#d8b4fe" />
                <SummaryCard label="Pooling" value={deptData.pooling} color="#67e8f9" />
                <SummaryCard label="Failed" value={deptData.failed} color="#fca5a5" />
              </div>
            </div>
            
            {/* Position Sections */}
            {positions.map(posName => {
              const posSummary = deptData.positions[posName] || emptyPos();
              if (posSummary.total === 0) return null;
              
              return (
                <div key={posName} style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#000080' }}>{posName}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                    <SummaryCard label="Total" value={posSummary.total} />
                    <SummaryCard label="Pending" value={posSummary.pending} color="#6b7280" />
                    <SummaryCard label="Ongoing" value={posSummary.ongoing} color="#d97706" />
                    <SummaryCard label="Qualified" value={posSummary.qualified} color="#DAA520" />
                    <SummaryCard label="Reprofile" value={posSummary.reprofile} color="#7c3aed" />
                    <SummaryCard label="Pooling" value={posSummary.pooling} color="#0891b2" />
                    <SummaryCard label="Failed" value={posSummary.failed} color="#991b1b" />
                  </div>
                  
                  {/* Stage sections only for Dealer in Table Games */}
                  {posName === 'Dealer' && deptName === 'Table Games' && (
                    <>
                      <StageSection title="Math Exam" summary={deptData.stageMath} />
                      <StageSection title="Table Test" summary={deptData.stageTable} />
                    </>
                  )}
                </div>
              );
            })}
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginTop: '20px',
            }}>
              <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Age & Gender by Position</h3>
                <AgeGenderMatrix data={deptData.ageGenderByPosition} />
              </div>

              <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Height & Gender by Position</h3>
                  <button
                    onClick={() => setHeightInFeet(!heightInFeet)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid #000080',
                      borderRadius: '6px',
                      background: heightInFeet ? '#000080' : '#fff',
                      color: heightInFeet ? '#FFD700' : '#000080',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    {heightInFeet ? "Show in cm" : "Show in ft/in"}
                  </button>
                </div>
                <HeightGenderMatrix data={deptData.heightGenderByPosition} useFeet={heightInFeet} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function emptyPos(): PositionSummary {
  return { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 };
}
