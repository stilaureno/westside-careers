'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardSummary, Applicant, PositionSummary, StageSummary, GenderByPosition } from '@/types';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session';

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

function LoadingSpinner() {
  return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '14px' }}>Loading...</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isApplicantsRoute = pathname.startsWith('/admin/applicants');
  const isDashboardRoute = pathname === '/admin' || pathname.startsWith('/admin/dashboard');

  useEffect(() => {
    const cookies = document.cookie.split('; ').find(c => c.startsWith(ADMIN_SESSION_COOKIE + '='));
    if (!cookies || !cookies.includes('authenticated')) {
      router.replace('/admin/login');
    }
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc' }}>
      {/* Header with Tabs */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/WESTSIDE LOGO COLORED.png"
            alt="Logo"
            style={{ width: '50px', height: '50px' }}
          />
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#8b1e2d' }}>Westside Careers Admin</span>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px' }}>
          <Link
            href="/admin/dashboard"
            style={{
              padding: '10px 20px',
              background: isDashboardRoute ? '#8b1e2d' : 'transparent',
              color: isDashboardRoute ? '#fff' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textDecoration: 'none',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/applicants"
            style={{
              padding: '10px 20px',
              background: isApplicantsRoute ? '#8b1e2d' : 'transparent',
              color: isApplicantsRoute ? '#fff' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textDecoration: 'none',
            }}
          >
            Applicants
          </Link>
        </div>

        <form action="/admin/logout" method="post">
          <button type="submit" style={{
            padding: '8px 16px', background: '#fff', color: '#1f2937',
            border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px',
            cursor: 'pointer', fontWeight: '600',
          }}>Logout</button>
        </form>
      </div>

      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

// Inline Dashboard Content (copied from dashboard/page.tsx but optimized)
function DashboardContent() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();

  const loadDashboard = async () => {
    setLoading(true);
    let query = supabase
      .from('applicants')
      .select('application_status, current_stage, position_applied, gender, birthdate, experience_level');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

    const { data: rows } = await query;

    const emptyPos = () => ({ total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 });
    const emptyStage = () => ({ taken: 0, pending: 0, passed: 0, failed: 0 });
    const emptyGender = () => ({
      dealerNonExpMale: 0, dealerNonExpFemale: 0,
      dealerExpMale: 0, dealerExpFemale: 0,
      pitSupervisorMale: 0, pitSupervisorFemale: 0,
      pitManagerMale: 0, pitManagerFemale: 0,
      operationsManagerMale: 0, operationsManagerFemale: 0,
    });

    const s: any = {
      total: rows?.length || 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0,
      byPosition: {}, byGender: {}, byAgeBand: {},
      dealer: emptyPos(), pitSupervisor: emptyPos(), pitManager: emptyPos(), operationsManager: emptyPos(),
      mathExam: emptyStage(), tableTest: emptyStage(),
      genderByPosition: emptyGender(),
      age20s: 0, age30s: 0, age40s: 0, age50Plus: 0,
    };

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

    rows?.forEach((r: any) => {
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

      let posSum: any;
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

    Object.values(stageMap).forEach((stages: any) => {
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
  };

  useEffect(() => { loadDashboard(); }, [startDate, endDate]);

  const clearFilters = () => { setStartDate(''); setEndDate(''); };

  if (loading || !summary) {
    return <LoadingSpinner />;
  }

  return (
    <div>
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
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>Dealer</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <SummaryCard label="Total" value={summary.dealer.total} />
          <SummaryCard label="Pending" value={summary.dealer.pending} color="#6b7280" />
          <SummaryCard label="Ongoing" value={summary.dealer.ongoing} color="#d97706" />
          <SummaryCard label="Qualified" value={summary.dealer.qualified} color="#166534" />
          <SummaryCard label="Reprofile" value={summary.dealer.reprofile} color="#7c3aed" />
          <SummaryCard label="Pooling" value={summary.dealer.pooling} color="#0891b2" />
          <SummaryCard label="Failed" value={summary.dealer.failed} color="#991b1b" />
        </div>

        <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#6b7280' }}>Math Exam</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <SummaryCard label="Taken" value={summary.mathExam.taken} />
          <SummaryCard label="Pending" value={summary.mathExam.pending} color="#6b7280" />
          <SummaryCard label="Passed" value={summary.mathExam.passed} color="#166534" />
          <SummaryCard label="Failed" value={summary.mathExam.failed} color="#991b1b" />
        </div>

        <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#6b7280' }}>Table Test</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <SummaryCard label="Taken" value={summary.tableTest.taken} />
          <SummaryCard label="Pending" value={summary.tableTest.pending} color="#6b7280" />
          <SummaryCard label="Passed" value={summary.tableTest.passed} color="#166534" />
          <SummaryCard label="Failed" value={summary.tableTest.failed} color="#991b1b" />
        </div>
      </div>

      {/* Other Positions */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>Pit Supervisor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          <SummaryCard label="Total" value={summary.pitSupervisor.total} />
          <SummaryCard label="Pending" value={summary.pitSupervisor.pending} color="#6b7280" />
          <SummaryCard label="Ongoing" value={summary.pitSupervisor.ongoing} color="#d97706" />
          <SummaryCard label="Qualified" value={summary.pitSupervisor.qualified} color="#166534" />
          <SummaryCard label="Reprofile" value={summary.pitSupervisor.reprofile} color="#7c3aed" />
          <SummaryCard label="Pooling" value={summary.pitSupervisor.pooling} color="#0891b2" />
          <SummaryCard label="Failed" value={summary.pitSupervisor.failed} color="#991b1b" />
        </div>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>Pit Manager</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          <SummaryCard label="Total" value={summary.pitManager.total} />
          <SummaryCard label="Pending" value={summary.pitManager.pending} color="#6b7280" />
          <SummaryCard label="Ongoing" value={summary.pitManager.ongoing} color="#d97706" />
          <SummaryCard label="Qualified" value={summary.pitManager.qualified} color="#166534" />
          <SummaryCard label="Reprofile" value={summary.pitManager.reprofile} color="#7c3aed" />
          <SummaryCard label="Pooling" value={summary.pitManager.pooling} color="#0891b2" />
          <SummaryCard label="Failed" value={summary.pitManager.failed} color="#991b1b" />
        </div>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>Operations Manager</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          <SummaryCard label="Total" value={summary.operationsManager.total} />
          <SummaryCard label="Pending" value={summary.operationsManager.pending} color="#6b7280" />
          <SummaryCard label="Ongoing" value={summary.operationsManager.ongoing} color="#d97706" />
          <SummaryCard label="Qualified" value={summary.operationsManager.qualified} color="#166534" />
          <SummaryCard label="Reprofile" value={summary.operationsManager.reprofile} color="#7c3aed" />
          <SummaryCard label="Pooling" value={summary.operationsManager.pooling} color="#0891b2" />
          <SummaryCard label="Failed" value={summary.operationsManager.failed} color="#991b1b" />
        </div>
      </div>

      {/* Gender by Position */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Gender Breakdown by Position</h3>
        {[
          ['Dealer - Non-Experienced', summary.genderByPosition.dealerNonExpMale, summary.genderByPosition.dealerNonExpFemale],
          ['Dealer - Experienced', summary.genderByPosition.dealerExpMale, summary.genderByPosition.dealerExpFemale],
          ['Pit Supervisor', summary.genderByPosition.pitSupervisorMale, summary.genderByPosition.pitSupervisorFemale],
          ['Pit Manager', summary.genderByPosition.pitManagerMale, summary.genderByPosition.pitManagerFemale],
          ['Operations Manager', summary.genderByPosition.operationsManagerMale, summary.genderByPosition.operationsManagerFemale],
        ].map(([label, male, female]: any) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{label as string}</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{male} / {female}</span>
          </div>
        ))}
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

// Inline Applicants Content (copied from applicants/page.tsx but optimized)
function ApplicantsContent() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    async function load() {
      const { data: apps } = await supabase
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      const { data: stages } = await supabase
        .from('stage_results')
        .select('reference_no, stage_name, stage_sequence, result_status, current_stage_label, remarks');

      const stageMap: Record<string, any[]> = {};
      stages?.forEach((s) => {
        if (!stageMap[s.reference_no]) stageMap[s.reference_no] = [];
        stageMap[s.reference_no].push(s);
      });

      const enriched = (apps || []).map((app: any) => {
        const appStages = stageMap[app.reference_no] || [];
        const getStageResult = (stage: string) => {
          const s = appStages.find((x) => x.stage_name === stage);
          return s?.result_status || '-';
        };
        return {
          ...app,
          displayName: `${app.first_name} ${app.last_name}`,
          initialScreeningResult: getStageResult('Initial Screening'),
          mathExamResult: getStageResult('Math Exam'),
          tableTestResult: getStageResult('Table Test'),
          sweatyPalmResult: appStages.find((x) => x.stage_name === 'Final Interview')?.result_status || '-',
          finalInterviewResult: getStageResult('Final Interview'),
          stages: appStages,
        };
      });

      setApplicants(enriched);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filteredApplicants = applicants.filter((app) => {
    const g = globalSearch.toLowerCase();
    const pos = filterPosition.toLowerCase();
    const stg = filterStage.toLowerCase();
    const sts = filterStatus.toLowerCase();
    const start = filterStartDate;
    const end = filterEndDate;

    const name = (app.displayName || '').toLowerCase();
    const ref = (app.reference_no || '').toLowerCase();
    const rem = (app.remarks || '').toLowerCase();
    const created = (app.created_at || '').slice(0, 10);
    const matchesSearch = !g || name.includes(g) || ref.includes(g) || rem.includes(g);
    const matchesDate = (!start || created >= start) && (!end || created <= end);

    return matchesSearch && (!pos || (app.position_applied || '').toLowerCase() === pos) &&
      (!stg || (app.current_stage || '').toLowerCase().includes(stg)) &&
      (!sts || (app.application_status || '').toLowerCase().includes(sts)) && matchesDate;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Applicant Summary</h1>

      {/* Filters */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Search Name / Reference / Remarks</label>
            <input
              value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Filter by Position</label>
            <select
              value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            >
              <option value="">All</option>
              <option value="Dealer">Dealer</option>
              <option value="Pit Supervisor">Pit Supervisor</option>
              <option value="Pit Manager">Pit Manager</option>
              <option value="Operations Manager">Operations Manager</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Filter by Stage</label>
            <input
              value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
              placeholder="Stage name..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Filter by Status</label>
            <input
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Status..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Start Date</label>
            <input
              type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>End Date</label>
            <input
              type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ maxHeight: '560px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1400px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {[
                  'Application Date', 'Reference No', 'Name', 'Position', 'Experience', 'Current Stage', 'Status',
                  'Height', 'Initial Screening', 'Math Exam', 'Table Test', 'Sweaty Palm', 'Final Interview', 'Remarks'
                ].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.slice(0, 100).map((app) => (
                <tr key={app.reference_no} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.created_at?.slice(0, 10) || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link href={`/admin/applicants/${app.reference_no}`} style={{ color: '#8b1e2d', fontWeight: '700', textDecoration: 'none' }}>
                      {app.reference_no}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#1f2937' }}>{app.displayName}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.position_applied}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.experience_level || '-'}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.current_stage || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                      background: app.application_status === 'Passed' || app.application_status === 'Completed' ? '#ecfdf5' :
                        app.application_status === 'Failed' || app.application_status === 'Not Recommended' ? '#fef2f2' :
                          app.application_status === 'Reprofile' ? '#f3e8ff' : '#f0f4ff',
                      color: app.application_status === 'Passed' ? '#166534' :
                        app.application_status === 'Failed' ? '#991b1b' :
                          app.application_status === 'Reprofile' ? '#7c3aed' : '#163a70',
                    }}>{app.application_status || 'Pending'}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.height_cm || '-'}</td>
                  <td style={{ padding: '8px 12px', color: app.initialScreeningResult === 'Passed' ? '#166534' : app.initialScreeningResult === 'Failed' ? '#991b1b' : '#6b7280' }}>
                    {app.initialScreeningResult}
                  </td>
                  <td style={{ padding: '8px 12px', color: app.mathExamResult === 'Passed' ? '#166534' : app.mathExamResult === 'Failed' ? '#991b1b' : '#6b7280' }}>
                    {app.mathExamResult}
                  </td>
                  <td style={{ padding: '8px 12px', color: app.tableTestResult === 'Passed' ? '#166534' : app.tableTestResult === 'Failed' ? '#991b1b' : '#6b7280' }}>
                    {app.tableTestResult}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.sweatyPalmResult === '-' ? '-' : app.sweatyPalmResult}</td>
                  <td style={{ padding: '8px 12px', color: 
                    app.finalInterviewResult === 'Passed' ? '#166534' :
                    app.finalInterviewResult === 'Reprofile' ? '#7c3aed' :
                    app.finalInterviewResult === 'For Pooling' ? '#0891b2' :
                    app.finalInterviewResult === 'Not Recommended' ? '#991b1b' : '#6b7280' }}>
                    {app.finalInterviewResult}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280', maxWidth: '180px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {app.remarks || '-'}
                  </td>
                </tr>
              ))}
              {filteredApplicants.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No matching applicant records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
        Showing up to 100 recent applicants. Use filters to narrow results.
      </p>
    </div>
  );
}
