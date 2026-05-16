'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ApplicantListItem } from '@/lib/db/applicants';

interface ExamEligibleApplicant extends ApplicantListItem {
  exam_authorized: string;
  mathExamScore?: number;
  mathExamTerminationReason?: string;
  isPenAndPaper?: boolean;
  attemptCount?: number;
}

export default function ExamEligibleApplicants({ 
  isSuperAdmin, 
  allowedDepartments 
}: { 
  isSuperAdmin: boolean;
  allowedDepartments: string[];
}) {
  const [applicants, setApplicants] = useState<ExamEligibleApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefNos, setSelectedRefNos] = useState<Set<string>>(new Set());
  const [authorizing, setAuthorizing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [examAuthFilter, setExamAuthFilter] = useState<'all' | 'authorized' | 'not-authorized'>('not-authorized');
  const [sortField, setSortField] = useState<'created_at' | 'reference_no' | 'displayName' | 'initialScreeningResult' | 'mathExamResult'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const supabase = createClient();

  const fetchApplicants = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Step 1: Fetch all Dealer applicants (1 query)
      const { data: allApplicants, error } = await supabase
        .from('applicants')
        .select(`
          applicant_id,
          reference_no,
          first_name,
          middle_name,
          last_name,
          contact_number,
          currently_employed,
          position_applied,
          experience_level,
          application_status,
          current_stage,
          department,
          gender,
          birthdate,
          created_at,
          exam_authorized
        `)
        .eq('position_applied', 'Dealer');

      if (error) {
        setMessage({ text: `Error loading applicants: ${error.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      if (!allApplicants?.length) {
        setApplicants([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch all Initial Screening stage results in ONE query (1 query instead of N)
      const referenceNumbers = allApplicants.map((app) => app.reference_no).filter(Boolean);
      const { data: stageResults } = referenceNumbers.length > 0
        ? await supabase
            .from('stage_results')
            .select('reference_no, stage_name, result_status')
            .in('reference_no', referenceNumbers)
            .eq('stage_name', 'Initial Screening')
        : { data: [] };

      // Step 3: Fetch all math exam results (including pen_and_paper flag)
      const { data: examResults } = referenceNumbers.length > 0
        ? await supabase
            .from('math_exam_results')
            .select('reference_no, score, termination_reason, pen_and_paper, attempt_count')
            .in('reference_no', referenceNumbers)
        : { data: [] };

      // Step 4: Fetch Pen & Paper Test stage results
      const { data: penAndPaperResults } = referenceNumbers.length > 0
        ? await supabase
            .from('stage_results')
            .select('reference_no, stage_name, result_status, score, passing_score, max_score')
            .in('reference_no', referenceNumbers)
            .eq('stage_name', 'Pen & Paper Test')
        : { data: [] };

      // Build exam results map (prefer Pen & Paper scores over online exam)
      const examMap: Record<string, { score: number; termination_reason: string | null; isPenAndPaper: boolean; attemptCount: number }> = {};
      (examResults || []).forEach((e: any) => {
        examMap[e.reference_no] = { 
          score: e.score, 
          termination_reason: e.termination_reason,
          isPenAndPaper: e.pen_and_paper || false,
          attemptCount: e.attempt_count || 1
        };
      });

      // Override with Pen & Paper scores if available
      (penAndPaperResults || []).forEach((pp: any) => {
        examMap[pp.reference_no] = { 
          score: pp.score, 
          termination_reason: null,
          isPenAndPaper: true,
          attemptCount: (examMap[pp.reference_no]?.attemptCount || 0) + 1
        };
      });

      // Step 3: Build a set of reference numbers that passed Initial Screening
      const passedScreeningRefs = new Set(
        stageResults
          ?.filter((s) => s.result_status === 'Passed')
          .map((s) => s.reference_no) ?? []
      );

      // Step 4: Filter and map applicants in memory
      const filtered: ExamEligibleApplicant[] = allApplicants
        .filter((app) => passedScreeningRefs.has(app.reference_no))
        .map((app) => {
          const exam = examMap[app.reference_no];
          return {
          applicant_id: app.applicant_id,
          reference_no: app.reference_no,
          first_name: app.first_name,
          middle_name: app.middle_name,
          last_name: app.last_name,
          contact_number: app.contact_number,
          currently_employed: app.currently_employed,
          displayName: [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(' '),
          position_applied: app.position_applied,
          experience_level: app.experience_level,
          application_status: app.application_status,
          current_stage: app.current_stage,
          department: app.department,
          gender: app.gender,
          birthdate: app.birthdate,
          created_at: app.created_at,
          exam_authorized: app.exam_authorized || 'No',
          initialScreeningResult: 'Passed',
          mathExamResult: exam ? (exam.score >= (exam.isPenAndPaper ? 30 : 8) ? 'Passed' : 'Failed') : '',
          mathExamScore: exam?.score,
          mathExamTerminationReason: exam?.termination_reason ?? undefined,
          isPenAndPaper: exam?.isPenAndPaper,
          attemptCount: exam?.attemptCount,
          tableTestResult: '',
          sweatyPalmResult: '',
          finalInterviewResult: '',
          remarks: '',
          stages: [],
        };});

      // Filter by allowed departments if not superadmin
      let result = filtered;
      if (!isSuperAdmin && allowedDepartments.length > 0) {
        result = result.filter((app) => {
          const dept = app.department || '';
          return allowedDepartments.includes(dept);
        });
      }

      setApplicants(result);
    } catch (err) {
      setMessage({ text: 'Error loading eligible applicants', type: 'error' });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants(true);
  }, [isSuperAdmin, allowedDepartments]);

  // Auto-refresh every 1 minute (background, no loading indicator)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchApplicants(false);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const filteredApplicants = useMemo(() => {
    let result = applicants.filter((app) => {
      if (!globalSearch) return true;
      const search = globalSearch.toLowerCase();
      return (
        (app.reference_no || '').toLowerCase().includes(search) ||
        (app.displayName || '').toLowerCase().includes(search) ||
        (app.first_name || '').toLowerCase().includes(search) ||
        (app.last_name || '').toLowerCase().includes(search)
      );
    });

    if (examAuthFilter !== 'all') {
      result = result.filter((app) =>
        examAuthFilter === 'authorized' ? app.exam_authorized === 'Yes' : app.exam_authorized !== 'Yes'
      );
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applicants, globalSearch, examAuthFilter, sortField, sortDir]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRefNos(new Set(filteredApplicants.map(a => a.reference_no)));
    } else {
      setSelectedRefNos(new Set());
    }
  };

  const handleSelectOne = (refNo: string, checked: boolean) => {
    const updated = new Set(selectedRefNos);
    if (checked) {
      updated.add(refNo);
    } else {
      updated.delete(refNo);
    }
    setSelectedRefNos(updated);
  };

  const handleAllowExam = async () => {
    if (selectedRefNos.size === 0) {
      setMessage({ text: 'Please select at least one applicant', type: 'error' });
      return;
    }

    setAuthorizing(true);
    setMessage(null);

    try {
      const refNosArray = Array.from(selectedRefNos);
      const results = await Promise.all(
        refNosArray.map(refNo =>
          supabase
            .from('applicants')
            .update({ exam_authorized: 'Yes', updated_at: new Date().toISOString() })
            .eq('reference_no', refNo)
        )
      );

      const hasError = results.some(r => r.error);
      if (hasError) {
        setMessage({ text: 'Some applicants failed to authorize. Please try again.', type: 'error' });
      } else {
        setMessage({ text: `Successfully authorized ${refNosArray.length} applicant(s) to take the exam!`, type: 'success' });
        setSelectedRefNos(new Set());
        await fetchApplicants(true);
      }
    } catch (err) {
      setMessage({ text: 'Error authorizing exam access', type: 'error' });
    } finally {
      setAuthorizing(false);
    }
  };

  const handleSort = (field: 'created_at' | 'reference_no' | 'displayName' | 'initialScreeningResult' | 'mathExamResult') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const nonAuthorizedCount = filteredApplicants.filter(a => a.exam_authorized !== 'Yes').length;
  const authorizedCount = filteredApplicants.filter(a => a.exam_authorized === 'Yes').length;

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Loading exam-eligible applicants...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      {/* Header */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h5 className="mb-0">Exam-Eligible Applicants</h5>
              <small className="text-muted">
                Dealer applicants who completed Initial Screening
              </small>
            </div>
            <div className="col-md-6 text-end">
              <div className="badge bg-info me-2">
                Total: {filteredApplicants.length}
              </div>
              <div className="badge bg-warning me-2">
                Not Authorized: {nonAuthorizedCount}
              </div>
              <div className="badge bg-success">
                Authorized: {authorizedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row align-items-end g-3">
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1">Search (Name, Reference No)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted mb-1">Exam Auth</label>
              <select
                className="form-select form-select-sm"
                value={examAuthFilter}
                onChange={(e) => setExamAuthFilter(e.target.value as 'all' | 'authorized' | 'not-authorized')}
              >
                <option value="all">All</option>
                <option value="authorized">Authorized (Yes)</option>
                <option value="not-authorized">Not Authorized (No)</option>
              </select>
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAllowExam}
                disabled={selectedRefNos.size === 0 || authorizing}
              >
                {authorizing ? 'Authorizing...' : `Allow Exam (${selectedRefNos.size} selected)`}
              </button>
            </div>
          </div>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mt-3 py-2 mb-0`}>
              {message.text}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-sm table-hover mb-0" style={{ fontSize: '13px' }}>
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedRefNos.size === filteredApplicants.length && filteredApplicants.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="form-check-input"
                />
              </th>
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('reference_no')}
              >
                Ref No {sortField === 'reference_no' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('displayName')}
              >
                Name {sortField === 'displayName' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th>Position</th>
              <th>Experience</th>
              <th>Department</th>
              <th>Status</th>
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => handleSort('mathExamResult')}
              >
                Math Score {sortField === 'mathExamResult' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ width: '100px' }}>Exam Auth</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplicants.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                  No exam-eligible applicants found
                </td>
              </tr>
            ) : (
              filteredApplicants.map((app) => (
                <tr key={app.reference_no} style={{ backgroundColor: app.exam_authorized === 'Yes' ? '#f0f8ff' : 'white' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedRefNos.has(app.reference_no)}
                      onChange={(e) => handleSelectOne(app.reference_no, e.target.checked)}
                      className="form-check-input"
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>{app.reference_no}</td>
                  <td>{app.displayName}</td>
                  <td>{app.position_applied}</td>
                  <td>{app.experience_level}</td>
                  <td>{app.department}</td>
                  <td>
                    <span
                      className={`badge bg-${
                        app.application_status === 'Passed' ? 'success' :
                        app.application_status === 'Failed' ? 'danger' :
                        app.application_status === 'Completed' ? 'success' :
                        'warning'
                      }`}
                    >
                      {app.application_status || 'Pending'}
                    </span>
                  </td>
                  <td
                    title={app.mathExamTerminationReason ? `Terminated: ${app.mathExamTerminationReason}` : app.isPenAndPaper ? 'Pen & Paper Test (Pass: 30/50)' : 'Online Math Exam (Pass: 8/10)'}
                  >
                    {app.mathExamScore !== undefined ? (
                      <span className={app.mathExamScore >= (app.isPenAndPaper ? 30 : 8) ? 'text-success fw-bold' : app.mathExamScore < (app.isPenAndPaper ? 30 : 8) ? 'text-danger fw-bold' : ''}>
                        {app.isPenAndPaper ? `${app.mathExamScore}/50` : `${app.mathExamScore}/10`}
                        {app.isPenAndPaper && <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '9px' }}>P&P</span>}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span
                      className={`badge bg-${app.exam_authorized === 'Yes' ? 'success' : 'secondary'}`}
                    >
                      {app.exam_authorized === 'Yes' ? '✓ Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredApplicants.length > 0 && (
        <div className="card-footer bg-light text-muted small py-2">
          Showing {filteredApplicants.length} of {applicants.length} applicant(s)
        </div>
      )}
    </div>
  );
}
