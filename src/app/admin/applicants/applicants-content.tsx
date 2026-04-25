'use client';

import { useState, useEffect, useMemo } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type SortField = 'created_at' | 'reference_no' | 'displayName' | 'position_applied' | 'experience_level' | 'current_stage' | 'application_status' | 'height_cm' | 'initialScreeningResult' | 'mathExamResult' | 'tableTestResult' | 'sweatyPalmResult' | 'finalInterviewResult' | 'remarks';
type SortDir = 'asc' | 'desc';

const POSITIONS = ['Dealer', 'Pit Supervisor', 'Pit Manager', 'Operations Manager'];

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

  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicants.length };
    POSITIONS.forEach(p => { counts[p] = 0; });
    applicants.forEach(app => {
      const p = app.position_applied;
      if (p && counts[p] !== undefined) counts[p]++;
    });
    return counts;
  }, [applicants]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicants.length };
    applicants.forEach(app => {
      const s = app.current_stage;
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [applicants]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicants.length };
    applicants.forEach(app => {
      const s = app.application_status || 'Pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [applicants]);

  const availableStages = useMemo(() => Object.keys(stageCounts).filter(s => s !== 'all').sort(), [stageCounts]);
  const availableStatuses = useMemo(() => Object.keys(statusCounts).filter(s => s !== 'all').sort(), [statusCounts]);

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

  function clearFilters() {
    setGlobalSearch('');
    setFilterPosition('');
    setFilterStage('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
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

  const hasFilters = globalSearch || filterPosition || filterStage || filterStatus || filterStartDate || filterEndDate;

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* Search and Date Filters Row */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search name, reference, or remarks..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">End Date</label>
              <input
                type="date"
                className="form-control"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              {hasFilters && (
                <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Position Filter */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small fw-medium me-2">Position:</span>
          <button
            className={`btn btn-sm ${!filterPosition ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setFilterPosition('')}
          >
            All ({positionCounts.all})
          </button>
          {POSITIONS.map(p => (
            <button
              key={p}
              className={`btn btn-sm ${filterPosition.toLowerCase() === p.toLowerCase() ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFilterPosition(filterPosition === p ? '' : p)}
            >
              {p} ({positionCounts[p]})
            </button>
          ))}
        </div>
      </div>

      {/* Stage Filter */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small fw-medium me-2">Stage:</span>
          <button
            className={`btn btn-sm ${!filterStage ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setFilterStage('')}
          >
            All
          </button>
          {availableStages.map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filterStage === s ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFilterStage(filterStage === s ? '' : s)}
            >
              {s} ({stageCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted small fw-medium me-2">Status:</span>
          <button
            className={`btn btn-sm ${!filterStatus ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setFilterStatus('')}
          >
            All
          </button>
          {availableStatuses.map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filterStatus === s ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            >
              {s} ({statusCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  {tableHeaders.map(({ key, label }) => {
                    const isSortable = key !== 'remarks';
                    const isActive = sortField === key;
                    return (
                      <th
                        key={key}
                        className={`${isSortable ? 'cursor-pointer' : ''} text-nowrap`}
                        onClick={isSortable ? () => handleSort(key as SortField) : undefined}
                        style={isSortable ? { cursor: 'pointer' } : {}}
                      >
                        {label}
                        {isSortable && (
                          <span className="ms-1" style={{ color: isActive ? '#8b1e2d' : '#ccc' }}>
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
                  <tr key={app.reference_no}>
                    <td className="text-muted">{app.created_at?.slice(0, 10) || '-'}</td>
                    <td>
                      <Link href={`/admin/applicants/${app.reference_no}`} className="text-decoration-none fw-bold" style={{ color: '#8b1e2d' }}>
                        {app.reference_no}
                      </Link>
                    </td>
                    <td>{app.displayName}</td>
                    <td className="text-muted">{app.position_applied}</td>
                    <td className="text-muted">{app.experience_level || '-'}</td>
                    <td className="text-muted">{app.current_stage || '-'}</td>
                    <td>
                      <span className={`badge rounded-pill ${
                        app.application_status === 'Passed' || app.application_status === 'Completed' ? 'bg-success' :
                        app.application_status === 'Failed' || app.application_status === 'Not Recommended' ? 'bg-danger' :
                        app.application_status === 'Reprofile' ? 'bg-warning text-dark' : 'bg-primary'
                      }`}>
                        {app.application_status || 'Pending'}
                      </span>
                    </td>
                    <td className="text-muted">{app.height_cm || '-'}</td>
                    <td className={app.initialScreeningResult === 'Passed' ? 'text-success' : app.initialScreeningResult === 'Failed' ? 'text-danger' : 'text-muted'}>
                      {app.initialScreeningResult}
                    </td>
                    <td className={app.mathExamResult === 'Passed' ? 'text-success' : app.mathExamResult === 'Failed' ? 'text-danger' : 'text-muted'}>
                      {app.mathExamResult}
                    </td>
                    <td className={app.tableTestResult === 'Passed' ? 'text-success' : app.tableTestResult === 'Failed' ? 'text-danger' : 'text-muted'}>
                      {app.tableTestResult}
                    </td>
                    <td className="text-muted">{app.sweatyPalmResult === '-' ? '-' : app.sweatyPalmResult}</td>
                    <td className={
                      app.finalInterviewResult === 'Passed' ? 'text-success' :
                      app.finalInterviewResult === 'Reprofile' ? 'text-warning' :
                      app.finalInterviewResult === 'For Pooling' ? 'text-info' :
                      app.finalInterviewResult === 'Not Recommended' ? 'text-danger' : 'text-muted'
                    }>
                      {app.finalInterviewResult}
                    </td>
                    <td className="text-muted" style={{ maxWidth: '180px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {renderFormattedMessage(app.remarks)}
                    </td>
                  </tr>
                ))}
                {filteredApplicants.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center text-muted py-4">
                      No matching applicant records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 text-muted small">
        Showing {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}
        {hasFilters && <span> (filtered)</span>}
      </div>
    </div>
  );
}