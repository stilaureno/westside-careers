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

interface DeptData {
  positions: { [posName: string]: PositionSummary };
  genderByPosition: { [posName: string]: GenderByPosition };
  stageMath: StageSummary;
  stageTable: StageSummary;
  ageBands: AgeBandSummary;
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

export default function DashboardContent() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [deptPositions, setDeptPositions] = useState<{ [dept: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([]);

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
      }
    }
    
    // Query applicants
    let appQuery = supabase
      .from('applicants')
      .select('reference_no, application_status, current_stage, position_applied, gender, birthdate, experience_level, department')
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
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#000080', marginBottom: '20px' }}>Dashboard</h1>

      {/* Date Filter */}
      <div style={{
        background: '#000080', border: '1px solid #FFD700', borderRadius: '18px',
        padding: '16px', marginBottom: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#FFD700' }}>Dashboard Date Filter</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Start Date</label>
            <input
              type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>End Date</label>
            <input
              type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <button onClick={clearFilters} style={{
            padding: '10px 18px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb',
            borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
          }}>Clear Filter</button>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
          Filters the dashboard counts based on applicant application date.
        </p>
      </div>

      {deptNames.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No departments available.
        </div>
      )}

{deptNames.map(deptName => {
        const deptData = dashboardData[deptName];
        const positions = deptPositions[deptName] || [];
        const deptHeaderColor = deptName === 'Table Games' ? '#800000' : deptName === 'Slots' ? '#FF8C00' : '#000080';
        
        return (
          <div key={deptName} style={{
            background: '#f0f4f8', border: '1px solid #FFD700', borderRadius: '18px', padding: '20px', marginBottom: '20px',
          }}>
            {/* Department Header */}
            <div style={{
              background: deptHeaderColor, color: '#FFD700', borderRadius: '12px', padding: '16px',
              marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: deptName === 'Table Games' ? '#fff' : deptName === 'Slots' ? '#000' : '#FFD700' }}>{deptName}</h2>
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
              {/* Gender Breakdown by Position */}
              <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Gender Breakdown by Position</h3>
                {positions.map(posName => {
                  const genderData = deptData.genderByPosition[posName];
                  if (!genderData || (genderData.male === 0 && genderData.female === 0)) return null;
                  return (
                    <GenderRow 
                      key={posName} 
                      label={posName} 
                      male={genderData.male} 
                      female={genderData.female} 
                    />
                  );
                })}
              </div>

              <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Age Band Breakdown</h3>
                <AgeBandRow label="20s" value={deptData.ageBands.age20s} />
                <AgeBandRow label="30s" value={deptData.ageBands.age30s} />
                <AgeBandRow label="40s" value={deptData.ageBands.age40s} />
                <AgeBandRow label="50 and above" value={deptData.ageBands.age50Plus} isLast />
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
