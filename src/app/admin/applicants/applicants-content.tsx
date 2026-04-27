'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { renderFormattedMessage } from '@/components/formatted-message';
import { createClient } from '@/lib/supabase/client';
import ApplicantModal from './applicant-modal';
import type { ApplicantListItem } from '@/lib/db/applicants';

type SortField = 'created_at' | 'reference_no' | 'displayName' | 'position_applied' | 'experience_level' | 'current_stage' | 'application_status' | 'height_cm' | 'initialScreeningResult' | 'mathExamResult' | 'tableTestResult' | 'sweatyPalmResult' | 'finalInterviewResult' | 'remarks';
type SortDir = 'asc' | 'desc';

const POSITIONS = ['Dealer', 'Pit Supervisor', 'Pit Manager', 'Operations Manager'];

// Map config field_key to data key
const COLUMN_KEY_MAP: Record<string, keyof ApplicantListItem | 'displayName'> = {
  'applicants_table_created_at': 'created_at',
  'applicants_table_reference_no': 'reference_no',
  'applicants_table_displayName': 'displayName',
  'applicants_table_position_applied': 'position_applied',
  'applicants_table_experience_level': 'experience_level',
  'applicants_table_current_stage': 'current_stage',
  'applicants_table_application_status': 'application_status',
  'applicants_table_height_cm': 'height_cm',
  'applicants_table_initialScreeningResult': 'initialScreeningResult',
  'applicants_table_mathExamResult': 'mathExamResult',
  'applicants_table_tableTestResult': 'tableTestResult',
  'applicants_table_sweatyPalmResult': 'sweatyPalmResult',
  'applicants_table_finalInterviewResult': 'finalInterviewResult',
  'applicants_table_remarks': 'remarks',
};

type ApplicantsContentProps = {
  initialApplicants: ApplicantListItem[];
  isSuperAdmin: boolean;
  allowedDepartments: string[];
  columnVisibility?: string[] | null;
};

export default function ApplicantsContent({
  initialApplicants,
  isSuperAdmin,
  allowedDepartments,
  columnVisibility,
}: ApplicantsContentProps) {
  const [applicants, setApplicants] = useState<ApplicantListItem[]>(initialApplicants);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  // Use custom column visibility from props, or load from DB
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (columnVisibility && columnVisibility.length > 0) {
      return new Set(columnVisibility);
    }
    return new Set(Object.keys(COLUMN_KEY_MAP));
  });

  const today = new Date().toISOString().split('T')[0];

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRefNo, setSelectedRefNo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [25, 50, 100];

  // Load column visibility from database (only for super admins or if no prop provided)
  useEffect(() => {
    async function loadColumnVisibility() {
      // If we have columnVisibility from props (per-admin customization), use it
      if (columnVisibility && columnVisibility.length > 0) {
        console.log('[DEBUG] Using columnVisibility from props:', columnVisibility);
        setVisibleColumns(new Set(columnVisibility));
        return;
      }
      
      // Otherwise, load from visible_fields (global default, mainly for super admins)
      const { data } = await supabase
        .from('visible_fields')
        .select('field_key, is_visible')
        .eq('location', 'applicants_table');
      
      if (data) {
        const visible = new Set<string>();
        data.forEach((f: any) => {
          if (f.is_visible) visible.add(f.field_key);
        });
        setVisibleColumns(visible);
      }
    }
    loadColumnVisibility();
  }, [columnVisibility]);

  const loadApplicants = useCallback(async () => {
    setLoading(true);

    let applicantsQuery = supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!isSuperAdmin) {
      if (allowedDepartments.length === 0) {
        setApplicants([]);
        setLoading(false);
        return;
      }

      applicantsQuery = applicantsQuery.in('department', allowedDepartments);
    }

    const { data: apps } = await applicantsQuery;
    const referenceNumbers = (apps || []).map((app) => app.reference_no).filter(Boolean);
    const { data: stages } = referenceNumbers.length > 0
      ? await supabase
          .from('stage_results')
          .select('reference_no, stage_name, stage_sequence, result_status, current_stage_label, remarks')
          .in('reference_no', referenceNumbers)
      : { data: [] };

    const stageMap: Record<string, ApplicantListItem['stages']> = {};
    stages?.forEach((s) => {
      if (!stageMap[s.reference_no]) stageMap[s.reference_no] = [];
      stageMap[s.reference_no].push(s);
    });

    const enriched = (apps || []).map((app) => {
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
  }, [allowedDepartments, isSuperAdmin, supabase]);

  const filteredByDate = useMemo(() => {
    const start = filterStartDate;
    const end = filterEndDate;
    return applicants.filter((app) => {
      const created = (app.created_at || '').slice(0, 10);
      return (!start || created >= start) && (!end || created <= end);
    });
  }, [applicants, filterStartDate, filterEndDate]);

  const filteredBySearch = useMemo(() => {
    const g = globalSearch.toLowerCase();
    if (!g) return filteredByDate;
    return filteredByDate.filter((app) => {
      const name = (app.displayName || '').toLowerCase();
      const ref = (app.reference_no || '').toLowerCase();
      const rem = (app.remarks || '').toLowerCase();
      return name.includes(g) || ref.includes(g) || rem.includes(g);
    });
  }, [filteredByDate, globalSearch]);

  const applicantsForCounts = useMemo(() => {
    if (!isSuperAdmin && allowedDepartments.length > 0) {
      return filteredBySearch.filter((app) => {
        const dept = app.department || '';
        return allowedDepartments.includes(dept);
      });
    }
    return filteredBySearch;
  }, [filteredBySearch, isSuperAdmin, allowedDepartments]);

  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicantsForCounts.length };
    POSITIONS.forEach(p => { counts[p] = 0; });
    applicantsForCounts.forEach((app) => {
      const p = app.position_applied;
      if (p && counts[p] !== undefined) counts[p]++;
    });
    return counts;
  }, [applicantsForCounts]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicantsForCounts.length };
    applicantsForCounts.forEach((app) => {
      const s = app.current_stage;
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [applicantsForCounts]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applicantsForCounts.length };
    applicantsForCounts.forEach((app) => {
      const s = app.application_status || 'Pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [applicantsForCounts]);

  const availableStages = useMemo(() => Object.keys(stageCounts).filter(s => s !== 'all').sort(), [stageCounts]);
  const availableStatuses = useMemo(() => Object.keys(statusCounts).filter(s => s !== 'all').sort(), [statusCounts]);

  const filteredApplicants = useMemo(() => {
    let result = filteredBySearch.filter((app) => {
      const pos = filterPosition.toLowerCase();
      const stg = filterStage.toLowerCase();
      const sts = filterStatus.toLowerCase();

      return (!pos || (app.position_applied || '').toLowerCase() === pos) &&
        (!stg || (app.current_stage || '').toLowerCase() === stg) &&
        (!sts || (app.application_status || '').toLowerCase() === sts);
    });

    if (!isSuperAdmin && allowedDepartments.length > 0) {
      result = result.filter((app) => {
        const dept = app.department || '';
        return allowedDepartments.includes(dept);
      });
    }

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
  }, [filteredBySearch, filterPosition, filterStage, filterStatus, sortField, sortDir, isSuperAdmin, allowedDepartments]);

  // Pagination logic
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredApplicants.length / pageSize);
  const paginatedApplicants = pageSize === 0 
    ? filteredApplicants 
    : filteredApplicants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPosition, filterStage, filterStatus, filterStartDate, filterEndDate, globalSearch]);

  // Keyboard navigation for pagination
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (pageSize === 0 || totalPages <= 1) return;
      
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
    setFilterStartDate(today);
    setFilterEndDate(today);
  }

  function openModal(refNo: string) {
    setSelectedRefNo(refNo);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedRefNo('');
  }

  const getPositionLabel = (value: string) => {
    if (!value) return `All (${positionCounts.all})`;
    const count = positionCounts[value] || 0;
    return `${value} (${count})`;
  };

  const getStageLabel = (value: string) => {
    if (!value) return 'All Stages';
    const count = stageCounts[value] || 0;
    return `${value} (${count})`;
  };

  const getStatusLabel = (value: string) => {
    if (!value) return 'All Status';
    const count = statusCounts[value] || 0;
    return `${value} (${count})`;
  };

  const tableHeaders: { key: SortField; label: string; fieldKey: string }[] = [
    { key: 'created_at', label: 'Application Date', fieldKey: 'applicants_table_created_at' },
    { key: 'reference_no', label: 'Reference No', fieldKey: 'applicants_table_reference_no' },
    { key: 'displayName', label: 'Name', fieldKey: 'applicants_table_displayName' },
    { key: 'position_applied', label: 'Position', fieldKey: 'applicants_table_position_applied' },
    { key: 'experience_level', label: 'Experience', fieldKey: 'applicants_table_experience_level' },
    { key: 'current_stage', label: 'Current Stage', fieldKey: 'applicants_table_current_stage' },
    { key: 'application_status', label: 'Status', fieldKey: 'applicants_table_application_status' },
    { key: 'height_cm', label: 'Height', fieldKey: 'applicants_table_height_cm' },
    { key: 'initialScreeningResult', label: 'Initial Screening', fieldKey: 'applicants_table_initialScreeningResult' },
    { key: 'mathExamResult', label: 'Math Exam', fieldKey: 'applicants_table_mathExamResult' },
    { key: 'tableTestResult', label: 'Table Test', fieldKey: 'applicants_table_tableTestResult' },
    { key: 'sweatyPalmResult', label: 'Sweaty Palm', fieldKey: 'applicants_table_sweatyPalmResult' },
    { key: 'finalInterviewResult', label: 'Final Interview', fieldKey: 'applicants_table_finalInterviewResult' },
    { key: 'remarks', label: 'Remarks', fieldKey: 'applicants_table_remarks' },
  ];

  const hasFilters = globalSearch || filterPosition || filterStage || filterStatus || filterStartDate !== today || filterEndDate !== today;

  if (loading) {
    return (
      <div className="container-fluid py-4" style={{ minHeight: 'calc(100vh - 240px)' }}>
        <div className="text-center text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      {/* Filters Row */}
      <div className="card mb-3 shadow-sm" style={{ minHeight: '118px' }}>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, reference, remarks..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Position</label>
              <select
                className="form-select form-select-sm"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
              >
                <option value="">{getPositionLabel('')}</option>
                {POSITIONS.map(p => (
                  <option key={p} value={p}>{getPositionLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Stage</label>
              <select
                className="form-select form-select-sm"
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
              >
                <option value="">{getStageLabel('')}</option>
                {availableStages.map(s => (
                  <option key={s} value={s}>{getStageLabel(s)}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Status</label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">{getStatusLabel('')}</option>
                {availableStatuses.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">Start Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted mb-1">End Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            {hasFilters && (
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-sm btn-danger w-100" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card shadow-sm" style={{ minHeight: '540px' }}>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0">
              <thead className="table-light">
                <tr>
                  {tableHeaders.filter(h => visibleColumns.has(h.fieldKey)).map(({ key, label }) => {
                    const isSortable = key !== 'remarks';
                    const isActive = sortField === key;
                    return (
                      <th
                        key={key}
                        className={`${isSortable ? 'cursor-pointer' : ''} text-nowrap`}
                        onClick={isSortable ? () => handleSort(key as SortField) : undefined}
                        style={isSortable ? { cursor: 'pointer', fontSize: '12px', fontWeight: '600' } : { fontSize: '12px', fontWeight: '600' }}
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
                {paginatedApplicants.map((app) => (
                  <tr key={app.reference_no}>
                    {visibleColumns.has('applicants_table_created_at') && <td className="text-muted" style={{ fontSize: '12px' }}>{app.created_at?.slice(0, 10) || '-'}</td>}
                    {visibleColumns.has('applicants_table_reference_no') && (
                      <td style={{ fontSize: '12px' }}>
                        <button className="btn btn-link p-0 fw-bold text-decoration-none" style={{ color: '#8b1e2d' }} onClick={() => openModal(app.reference_no)}>
                          {app.reference_no}
                        </button>
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_displayName') && <td style={{ fontSize: '12px' }}>{app.displayName}</td>}
                    {visibleColumns.has('applicants_table_position_applied') && <td className="text-muted" style={{ fontSize: '12px' }}>{app.position_applied}</td>}
                    {visibleColumns.has('applicants_table_experience_level') && <td className="text-muted" style={{ fontSize: '12px' }}>{app.experience_level || '-'}</td>}
                    {visibleColumns.has('applicants_table_current_stage') && <td className="text-muted" style={{ fontSize: '12px' }}>{app.current_stage || '-'}</td>}
                    {visibleColumns.has('applicants_table_application_status') && (
                      <td style={{ fontSize: '12px' }}>
                        <span className={`badge rounded-pill ${
                          app.application_status === 'Passed' || app.application_status === 'Completed' ? 'bg-success' :
                          app.application_status === 'Failed' || app.application_status === 'Not Recommended' ? 'bg-danger' :
                          app.application_status === 'Reprofile' ? 'bg-warning text-dark' : 'bg-primary'
                        }`}>
                          {app.application_status || 'Pending'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_height_cm') && <td className="text-muted" style={{ fontSize: '12px' }}>{app.height_cm ? `${app.height_cm}cm` : '-'}</td>}
                    {visibleColumns.has('applicants_table_initialScreeningResult') && (
                      <td className={app.initialScreeningResult === 'Passed' ? 'text-success' : app.initialScreeningResult === 'Failed' ? 'text-danger' : 'text-muted'} style={{ fontSize: '12px' }}>
                        {app.initialScreeningResult}
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_mathExamResult') && (
                      <td className={app.mathExamResult === 'Passed' ? 'text-success' : app.mathExamResult === 'Failed' ? 'text-danger' : 'text-muted'} style={{ fontSize: '12px' }}>
                        {app.mathExamResult}
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_tableTestResult') && (
                      <td className={app.tableTestResult === 'Passed' ? 'text-success' : app.tableTestResult === 'Failed' ? 'text-danger' : 'text-muted'} style={{ fontSize: '12px' }}>
                        {app.tableTestResult}
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_sweatyPalmResult') && (
                      <td className="text-muted" style={{ fontSize: '12px' }}>{app.sweatyPalmResult === '-' ? '-' : app.sweatyPalmResult}</td>
                    )}
                    {visibleColumns.has('applicants_table_finalInterviewResult') && (
                      <td className={
                        app.finalInterviewResult === 'Passed' ? 'text-success' :
                        app.finalInterviewResult === 'Reprofile' ? 'text-warning' :
                        app.finalInterviewResult === 'For Pooling' ? 'text-info' :
                        app.finalInterviewResult === 'Not Recommended' ? 'text-danger' : 'text-muted'
                      } style={{ fontSize: '12px' }}>
                        {app.finalInterviewResult}
                      </td>
                    )}
                    {visibleColumns.has('applicants_table_remarks') && (
                      <td className="text-muted" style={{ maxWidth: '180px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '12px' }}>
                        {renderFormattedMessage(app.remarks)}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredApplicants.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.size} className="text-center text-muted py-4">
                      No matching applicant records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 d-flex justify-content-between align-items-center">
        <div className="text-muted small">
          Showing {paginatedApplicants.length} of {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}
          {hasFilters && <span> (filtered)</span>}
        </div>
        
        {/* Pagination Controls */}
        <div className="d-flex align-items-center gap-2">
          {/* Page Size Dropdown */}
          <div className="d-flex align-items-center gap-1">
            <span className="text-muted small">Show:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: '80px' }}
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={0}>* All</option>
            </select>
          </div>

          {/* Page Navigation */}
          {pageSize !== 0 && totalPages > 1 && (
            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ««
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                «
              </button>
              <span className="text-muted small mx-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                »
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                »»
              </button>
            </div>
          )}
        </div>
      </div>

      <ApplicantModal referenceNo={selectedRefNo} isOpen={modalOpen} onClose={closeModal} onSaved={loadApplicants} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
