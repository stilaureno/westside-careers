'use client';

import { useState, useEffect, useMemo } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type SortField = 'created_at' | 'reference_no' | 'displayName' | 'position_applied' | 'experience_level' | 'current_stage' | 'application_status' | 'height_cm' | 'initialScreeningResult' | 'mathExamResult' | 'tableTestResult' | 'sweatyPalmResult' | 'finalInterviewResult' | 'remarks';
type SortDir = 'asc' | 'desc';

export default function ApplicantsContent() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
          const s = appStages.find((x: any) => x.stage_name === stage);
          return s?.result_status || '-';
        };
        return {
          ...app,
          displayName: `${app.first_name} ${app.last_name}`,
          initialScreeningResult: getStageResult('Initial Screening'),
          mathExamResult: getStageResult('Math Exam'),
          tableTestResult: getStageResult('Table Test'),
          sweatyPalmResult: appStages.find((x: any) => x.stage_name === 'Final Interview')?.result_status || '-',
          finalInterviewResult: getStageResult('Final Interview'),
          stages: appStages,
        };
      });

      setApplicants(enriched);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const availableStages = useMemo(() => {
    const stages = new Set<string>();
    applicants.forEach(app => {
      if (app.current_stage) stages.add(app.current_stage);
    });
    return Array.from(stages).sort();
  }, [applicants]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    applicants.forEach(app => {
      if (app.application_status) statuses.add(app.application_status);
    });
    return Array.from(statuses).sort();
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    let result = applicants.filter((app) => {
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
        (!stg || (app.current_stage || '').toLowerCase() === stg) &&
        (!sts || (app.application_status || '').toLowerCase() === sts) && matchesDate;
    });

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'created_at') {
        aVal = aVal || '';
        bVal = bVal || '';
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applicants, globalSearch, filterPosition, filterStage, filterStatus, filterStartDate, filterEndDate, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const tableHeaders: { key: SortField; label: string }[] = [
    { key: 'created_at', label: 'Application Date' },
    { key: 'reference_no', label: 'Reference No' },
    { key: 'displayName', label: 'Name' },
    { key: 'position_applied', label: 'Position' },
    { key: 'experience_level', label: 'Experience' },
    { key: 'current_stage', label: 'Current Stage' },
    { key: 'application_status', label: 'Status' },
    { key: 'height_cm', label: 'Height' },
    { key: 'initialScreeningResult', label: 'Initial Screening' },
    { key: 'mathExamResult', label: 'Math Exam' },
    { key: 'tableTestResult', label: 'Table Test' },
    { key: 'sweatyPalmResult', label: 'Sweaty Palm' },
    { key: 'finalInterviewResult', label: 'Final Interview' },
    { key: 'remarks', label: 'Remarks' },
  ];

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div style={{ width: '100%', minWidth: '100%' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Applicant Summary</h1>

      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
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
            <select
              value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            >
              <option value="">All</option>
              {availableStages.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Filter by Status</label>
            <select
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px' }}
            >
              <option value="">All</option>
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ maxHeight: '560px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1400px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {tableHeaders.map(({ key, label }) => {
                  const isSortable = key !== 'remarks';
                  const isActive = sortField === key;
                  return (
                    <th
                      key={key}
                      onClick={isSortable ? () => handleSort(key as SortField) : undefined}
                      style={{
                        padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: '600',
                        whiteSpace: 'nowrap', cursor: isSortable ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      {label}
                      {isSortable && (
                        <span style={{ marginLeft: '4px', color: isActive ? '#8b1e2d' : '#9ca3af' }}>
                          {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.slice(0, 100).map((app) => (
                <tr key={app.reference_no} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{app.created_at?.slice(0, 10) || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link href={`/admin/applicants/${app.reference_no}`} style={{ color: '#8b1e2d', fontWeight: '700', textDecoration: 'none', cursor: 'pointer' }}>
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
                    {renderFormattedMessage(app.remarks)}
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