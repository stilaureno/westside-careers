'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardSummary, PositionSummary, StageSummary, GenderByPosition } from '@/types';

function SummaryCard({ label, value, color = '#1f2937' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
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
      <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} color="#6b7280" />
        <SummaryCard label="Ongoing" value={summary.ongoing} color="#d97706" />
        <SummaryCard label="Qualified" value={summary.qualified} color="#166534" />
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600' }}>{male} / {female}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('applicants')
      .select('application_status, current_stage, position_applied, gender, birthdate, experience_level');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

    const { data: rows } = await query;

    const emptyPos = (): PositionSummary => ({ total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 });
    const emptyStage = (): StageSummary => ({ taken: 0, pending: 0, passed: 0, failed: 0 });
    const emptyGender = (): GenderByPosition => ({
      dealerNonExpMale: 0, dealerNonExpFemale: 0,
      dealerExpMale: 0, dealerExpFemale: 0,
      pitSupervisorMale: 0, pitSupervisorFemale: 0,
      pitManagerMale: 0, pitManagerFemale: 0,
      operationsManagerMale: 0, operationsManagerFemale: 0,
    });

    const s: DashboardSummary = {
      total: rows?.length || 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0,
      byPosition: {}, byGender: {}, byAgeBand: {},
      dealer: emptyPos(), pitSupervisor: emptyPos(), pitManager: emptyPos(), operationsManager: emptyPos(),
      mathExam: emptyStage(), tableTest: emptyStage(),
      genderByPosition: emptyGender(),
      age20s: 0, age30s: 0, age40s: 0, age50Plus: 0,
    };

    // Get stage results
    const { data: stageRows } = await supabase.from('stage_results').select('reference_no, stage_name, result_status');
    const stageMap: Record<string, Record<string, string>> = {};
    stageRows?.forEach((row) => {
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

    rows?.forEach((r) => {
      const status = r.application_status || 'Pending';
      const pos = r.position_applied || 'Unknown';
      const exp = r.experience_level || 'Non-Experienced';
      const gender = r.gender || 'Unknown';
      const age = computeAge(r.birthdate);

      if (status === 'Pending') s.pending++;
      else if (status === 'Ongoing') s.ongoing++;
      else if (status === 'Passed' || status === 'Completed') s.qualified++;
      else if (status === 'Reprofile') s.reprofile++;
      else if (status === 'For Pooling') s.pooling++;
      else if (status === 'Failed' || status === 'Not Recommended') s.failed++;

      s.byPosition[pos] = (s.byPosition[pos] || 0) + 1;
      if (gender === 'Male' || gender === 'Female') s.byGender[gender] = (s.byGender[gender] || 0) + 1;

      if (age >= 20 && age < 30) s.age20s++;
      else if (age >= 30 && age < 40) s.age30s++;
      else if (age >= 40 && age < 50) s.age40s++;
      else if (age >= 50) s.age50Plus++;

      let posSum: PositionSummary;
      if (pos === 'Dealer') posSum = s.dealer;
      else if (pos === 'Pit Supervisor') posSum = s.pitSupervisor;
      else if (pos === 'Pit Manager') posSum = s.pitManager;
      else if (pos === 'Operations Manager') posSum = s.operationsManager;
      else return;

      posSum.total++;
      if (status === 'Pending') posSum.pending++;
      else if (status === 'Ongoing') posSum.ongoing++;
      else if (status === 'Passed' || status === 'Completed') posSum.qualified++;
      else if (status === 'Reprofile') posSum.reprofile++;
      else if (status === 'For Pooling') posSum.pooling++;
      else if (status === 'Failed' || status === 'Not Recommended') posSum.failed++;

      if (pos === 'Dealer') {
        if (exp === 'Experienced Dealer') {
          if (gender === 'Male') s.genderByPosition.dealerExpMale++;
          else if (gender === 'Female') s.genderByPosition.dealerExpFemale++;
        } else {
          if (gender === 'Male') s.genderByPosition.dealerNonExpMale++;
          else if (gender === 'Female') s.genderByPosition.dealerNonExpFemale++;
        }
      } else if (pos === 'Pit Supervisor') {
        if (gender === 'Male') s.genderByPosition.pitSupervisorMale++;
        else if (gender === 'Female') s.genderByPosition.pitSupervisorFemale++;
      } else if (pos === 'Pit Manager') {
        if (gender === 'Male') s.genderByPosition.pitManagerMale++;
        else if (gender === 'Female') s.genderByPosition.pitManagerFemale++;
      } else if (pos === 'Operations Manager') {
        if (gender === 'Male') s.genderByPosition.operationsManagerMale++;
        else if (gender === 'Female') s.genderByPosition.operationsManagerFemale++;
      }
    });

    // Stage-specific stats
    Object.values(stageMap).forEach((stages) => {
      const math = stages['Math Exam'];
      const table = stages['Table Test'];
      if (math) { s.mathExam.taken++; if (math === 'Passed') s.mathExam.passed++; else if (math === 'Failed') s.mathExam.failed++; }
      if (table) { s.tableTest.taken++; if (table === 'Passed') s.tableTest.passed++; else if (table === 'Failed') s.tableTest.failed++; }
    });
    const dealerCount = s.dealer.total;
    s.mathExam.pending = Math.max(0, dealerCount - s.mathExam.taken);
    s.tableTest.pending = Math.max(0, dealerCount - s.tableTest.taken);

    setSummary(s);
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const clearFilters = () => { setStartDate(''); setEndDate(''); };

  if (!summary) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Dashboard</h1>

      {/* Date Filter */}
      <div style={{
        background: '#fff7f8', border: '1px solid #f3cdd3', borderRadius: '18px',
        padding: '16px', marginBottom: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Dashboard Date Filter</div>
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

      {/* Overall Summary */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Overall Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Pending" value={summary.pending} color="#6b7280" />
          <SummaryCard label="Ongoing" value={summary.ongoing} color="#d97706" />
          <SummaryCard label="Qualified" value={summary.qualified} color="#166534" />
          <SummaryCard label="Reprofile" value={summary.reprofile} color="#7c3aed" />
          <SummaryCard label="Pooling" value={summary.pooling} color="#0891b2" />
          <SummaryCard label="Not Recommended" value={summary.failed} color="#991b1b" />
        </div>
      </div>

      {/* Dealer */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <PositionSection title="Dealer" summary={summary.dealer} />
        <StageSection title="Math Exam" summary={summary.mathExam} />
        <StageSection title="Table Test" summary={summary.tableTest} />
      </div>

      {/* Other Positions */}
      <PositionSection title="Pit Supervisor" summary={summary.pitSupervisor} />
      <PositionSection title="Pit Manager" summary={summary.pitManager} />
      <PositionSection title="Operations Manager" summary={summary.operationsManager} />

      {/* Gender by Position */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Gender Breakdown by Position</h3>
        <GenderRow label="Dealer - Non-Experienced" male={summary.genderByPosition.dealerNonExpMale} female={summary.genderByPosition.dealerNonExpFemale} />
        <GenderRow label="Dealer - Experienced" male={summary.genderByPosition.dealerExpMale} female={summary.genderByPosition.dealerExpFemale} />
        <GenderRow label="Pit Supervisor" male={summary.genderByPosition.pitSupervisorMale} female={summary.genderByPosition.pitSupervisorFemale} />
        <GenderRow label="Pit Manager" male={summary.genderByPosition.pitManagerMale} female={summary.genderByPosition.pitManagerFemale} />
        <GenderRow label="Operations Manager" male={summary.genderByPosition.operationsManagerMale} female={summary.genderByPosition.operationsManagerFemale} />
      </div>

      {/* Age Bands */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Age Band Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <SummaryCard label="20s" value={summary.age20s} />
          <SummaryCard label="30s" value={summary.age30s} />
          <SummaryCard label="40s" value={summary.age40s} />
          <SummaryCard label="50 and above" value={summary.age50Plus} color="#991b1b" />
        </div>
      </div>
    </div>
  );
}