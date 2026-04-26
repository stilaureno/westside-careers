'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStages, getPositionStagesData, savePositionStages, addStage, deleteStage } from '@/lib/db/positions';

interface VisibleField {
  id: string;
  field_key: string;
  field_label: string;
  is_visible: boolean;
}

interface Department {
  id: string;
  name: string;
  is_active: boolean;
}

interface Position {
  id: string;
  department_id: string;
  name: string;
  is_active: boolean;
}

interface AdminPassword {
  id: string;
  key: string;
  value: string;
  allowed_departments: string[] | null;
}

export default function SettingsContent() {
  const supabase = createClient();
  const [fields, setFields] = useState<VisibleField[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [adminPasswords, setAdminPasswords] = useState<AdminPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [newPosName, setNewPosName] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Stage management state
  const [selectedPosition, setSelectedPosition] = useState('');
  const [expLevel, setExpLevel] = useState<'Non-Experienced' | 'Experienced'>('Non-Experienced');
  const [positionStages, setPositionStages] = useState<string[]>([]);
  const [availableStages, setAvailableStages] = useState<{ id: string; name: string }[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageOrder, setNewStageOrder] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [fieldsRes, deptsRes, possRes, adminPassRes] = await Promise.all([
      supabase.from('visible_fields').select('*').order('display_order'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
      supabase.from('config').select('*').like('key', 'ADMIN_PASSWORD%').neq('key', 'SUPER_ADMIN_PASSWORD'),
    ]);
    setFields(fieldsRes.data || []);
    setDepartments(deptsRes.data || []);
    setPositions(possRes.data || []);
    setAdminPasswords(adminPassRes.data || []);
    setLoading(false);
  }

  async function toggleField(field: VisibleField) {
    setSaving(true);
    const { error } = await supabase
      .from('visible_fields')
      .update({ is_visible: !field.is_visible })
      .eq('id', field.id);

    if (!error) {
      setFields(fields.map(f => f.id === field.id ? { ...f, is_visible: !f.is_visible } : f));
    }
    setSaving(false);
  }

  async function toggleDepartment(dept: Department) {
    setSaving(true);
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id);

    if (!error) {
      setDepartments(departments.map(d => d.id === dept.id ? { ...d, is_active: !d.is_active } : d));
    }
    setSaving(false);
  }

  async function togglePosition(pos: Position) {
    setSaving(true);
    const { error } = await supabase
      .from('positions')
      .update({ is_active: !pos.is_active })
      .eq('id', pos.id);

    if (!error) {
      setPositions(positions.map(p => p.id === pos.id ? { ...p, is_active: !p.is_active } : p));
    }
    setSaving(false);
  }

  async function handlePositionChange(positionName: string) {
    setSelectedPosition(positionName);
    setExpLevel('Non-Experienced');
    if (positionName) {
      const data = await getPositionStagesData(positionName);
      setPositionStages(data['Non-Experienced'] || []);
      setAvailableStages(data.availableStages || []);
    } else {
      setPositionStages([]);
      setAvailableStages([]);
    }
  }

  async function handleExpLevelChange(level: 'Non-Experienced' | 'Experienced') {
    setExpLevel(level);
    if (selectedPosition) {
      const data = await getPositionStagesData(selectedPosition);
      setPositionStages(data[level] || []);
    }
  }

  async function toggleStageInPosition(stageName: string) {
    if (positionStages.includes(stageName)) {
      setPositionStages(positionStages.filter(s => s !== stageName));
    } else {
      setPositionStages([...positionStages, stageName]);
    }
  }

  async function saveStages() {
    if (!selectedPosition) return;
    setSaving(true);
    await savePositionStages(selectedPosition, expLevel, positionStages);
    // Reload to refresh UI
    const data = await getPositionStagesData(selectedPosition);
    setPositionStages(data[expLevel] || []);
    setAvailableStages(data.availableStages || []);
    setMessage({ text: 'Stages saved', type: 'success' });
    setSaving(false);
  }

  async function handleAddStage() {
    if (!newStageName.trim()) return;
    setSaving(true);
    const order = newStageOrder > 0 ? newStageOrder : 0;
    const result = await addStage(newStageName.trim(), order);
    if (result.success) {
      setNewStageName('');
      setNewStageOrder(0);
      await loadData();
      const stages = await getStages();
      setAvailableStages(stages.map(s => ({ id: s.id, name: s.name })));
      setMessage({ text: 'Stage added', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Failed to add stage', type: 'error' });
    }
    setSaving(false);
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('Delete this stage? It will be removed from all positions.')) return;
    setSaving(true);
    const result = await deleteStage(stageId);
    if (result.success) {
      await loadData();
      setMessage({ text: 'Stage deleted', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Failed to delete stage', type: 'error' });
    }
    setSaving(false);
  }

  async function addDepartment() {
    if (!newDeptName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('departments')
      .insert({ name: newDeptName.trim() });

    if (!error) {
      setNewDeptName('');
      await loadData();
      setMessage({ text: 'Department added', type: 'success' });
    } else {
      setMessage({ text: error.message, type: 'error' });
    }
    setSaving(false);
  }

  async function deleteDepartment(id: string) {
    if (!confirm('Delete this department and all its positions?')) return;
    setSaving(true);
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) {
      await loadData();
      setMessage({ text: 'Department deleted', type: 'success' });
    }
    setSaving(false);
  }

  async function addPosition() {
    if (!newPosName.trim() || !selectedDept) return;
    setSaving(true);
    const { error } = await supabase
      .from('positions')
      .insert({ department_id: selectedDept, name: newPosName.trim() });

    if (!error) {
      setNewPosName('');
      await loadData();
      setMessage({ text: 'Position added', type: 'success' });
    } else {
      setMessage({ text: error.message, type: 'error' });
    }
    setSaving(false);
  }

  async function deletePosition(id: string) {
    setSaving(true);
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (!error) {
      await loadData();
      setMessage({ text: 'Position deleted', type: 'success' });
    }
    setSaving(false);
  }

  async function addAdminPassword() {
    if (!newAdminPassword.trim()) return;
    setSaving(true);

    const existingKeys = adminPasswords.map(a => a.key);
    const maxNum = existingKeys.reduce((max, key) => {
      const num = parseInt(key.replace('ADMIN_PASSWORD', '')) || 1;
      return Math.max(max, num);
    }, 1);
    const newKey = maxNum + 1;

    const { error } = await supabase
      .from('config')
      .insert({ key: `ADMIN_PASSWORD${newKey}`, value: newAdminPassword.trim(), allowed_departments: [] });

    if (!error) {
      setNewAdminPassword('');
      await loadData();
      setMessage({ text: 'Admin password added', type: 'success' });
    } else {
      setMessage({ text: error.message, type: 'error' });
    }
    setSaving(false);
  }

  async function deleteAdminPassword(key: string) {
    if (!confirm(`Delete admin password ${key}?`)) return;
    setSaving(true);
    const { error } = await supabase.from('config').delete().eq('key', key);
    if (!error) {
      await loadData();
      setMessage({ text: 'Admin password deleted', type: 'success' });
    }
    setSaving(false);
  }

  async function updateAdminPasswordValue(admin: AdminPassword, newValue: string) {
    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ value: newValue })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, value: newValue } : a));
      setMessage({ text: 'Password updated', type: 'success' });
    } else {
      setMessage({ text: 'Failed to update password', type: 'error' });
    }
    setSaving(false);
  }

  async function toggleAdminDept(admin: AdminPassword, deptName: string) {
    const currentDepts = admin.allowed_departments || [];
    const newDepts = currentDepts.includes(deptName)
      ? currentDepts.filter(d => d !== deptName)
      : [...currentDepts, deptName];

    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ allowed_departments: newDepts })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, allowed_departments: newDepts } : a));
    }
    setSaving(false);
  }

  const getPositionsForDept = (deptId: string) => positions.filter(p => p.department_id === deptId);

  // Get unique stage names for delete dropdown
  const allStagesForDelete = availableStages.length > 0 ? availableStages : [];

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <h4 className="mb-4">Admin Settings</h4>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} py-2 mb-3`}>
          {message.text}
        </div>
      )}

      <div className="row g-4">
        {/* Visible Fields */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">Visible Fields in Applicant Modal</h6>
              <small className="text-muted">Toggle fields to show in Details section</small>
            </div>
            <div className="card-body">
              {fields.map(field => (
                <div key={field.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span>{field.field_label}</span>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={field.is_visible}
                      disabled={saving}
                      onChange={() => toggleField(field)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stages per Position */}
        <div className="col-md-6">
          <div className="card border-primary">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">Stages per Position</h6>
              <small className="text-white-50">Configure stages for each position and experience level</small>
            </div>
            <div className="card-body">
              {/* Position selector */}
              <div className="mb-3">
                <label className="form-label small">Select Position</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedPosition}
                  onChange={(e) => handlePositionChange(e.target.value)}
                >
                  <option value="">-- Select Position --</option>
                  {positions.filter(p => p.is_active).map(pos => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>

              {selectedPosition && (
                <>
                  {/* Experience level tabs */}
                  <div className="mb-3">
                    <div className="btn-group btn-group-sm w-100">
                      <button
                        className={`btn ${expLevel === 'Non-Experienced' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleExpLevelChange('Non-Experienced')}
                      >
                        Non-Experienced
                      </button>
                      <button
                        className={`btn ${expLevel === 'Experienced' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleExpLevelChange('Experienced')}
                      >
                        Experienced
                      </button>
                    </div>
                  </div>

                  {/* Stage checkboxes - load available stages */}
                  <div className="mb-3">
                    {availableStages.length === 0 && selectedPosition && (
                      <div className="text-center py-2">
                        <span className="text-muted small">Loading stages...</span>
                      </div>
                    )}
                    {availableStages.map(stage => (
                      <div key={stage.id} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`stage-${stage.id}`}
                          checked={positionStages.includes(stage.name)}
                          onChange={() => toggleStageInPosition(stage.name)}
                          disabled={saving}
                        />
                        <label className="form-check-label" htmlFor={`stage-${stage.id}`}>
                          {stage.name}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <button
                    className="btn btn-sm btn-primary w-100 mb-3"
                    onClick={saveStages}
                    disabled={saving || !selectedPosition}
                  >
                    {saving ? 'Saving...' : 'Save Stages'}
                  </button>

                  {/* Add new stage (available to all positions) */}
                  <div className="border-top pt-3 mt-3">
                    <label className="form-label small fw-bold">Add New Stage (Available to All Positions)</label>
                    <div className="row g-2">
                      <div className="col-7">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="New stage name..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                        />
                      </div>
                      <div className="col-3">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Order"
                          min="1"
                          value={newStageOrder || ''}
                          onChange={(e) => setNewStageOrder(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-2">
                        <button
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={handleAddStage}
                          disabled={saving || !newStageName.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Departments */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">Departments</h6>
            </div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="New department name..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
                <button className="btn btn-sm btn-dark" onClick={addDepartment} disabled={saving}>
                  Add
                </button>
              </div>
              <ul className="list-group list-group-flush">
                {departments.map(dept => (
                  <li key={dept.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={dept.is_active}
                          disabled={saving}
                          onChange={() => toggleDepartment(dept)}
                        />
                      </div>
                      <span className={dept.is_active ? '' : 'text-muted text-decoration-line-through'}>{dept.name}</span>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteDepartment(dept.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Positions */}
        <div className="col-md-12">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">Positions</h6>
            </div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <select
                  className="form-select form-select-sm"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="">Select department...</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="New position name..."
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                />
                <button className="btn btn-sm btn-dark" onClick={addPosition} disabled={saving || !selectedDept}>
                  Add
                </button>
              </div>
              {departments.map(dept => {
                const deptPositions = getPositionsForDept(dept.id);
                if (deptPositions.length === 0) return null;
                return (
                  <div key={dept.id} className="mb-3">
                    <h6 className="text-muted small">{dept.name}</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {deptPositions.map(pos => (
                        <span key={pos.id} className={`badge d-flex align-items-center gap-1 ${pos.is_active ? 'bg-light text-dark' : 'bg-secondary'}`}>
                          <span className={pos.is_active ? '' : 'text-decoration-line-through'}>{pos.name}</span>
                          <div className="form-check form-switch d-inline-block m-0 ms-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={pos.is_active}
                              disabled={saving}
                              onChange={() => togglePosition(pos)}
                              style={{ marginBottom: 0 }}
                            />
                          </div>
                          <button
                            className="btn btn-sm p-0 lh-0 ms-1"
                            style={{ lineHeight: 1 }}
                            onClick={() => deletePosition(pos.id)}
                            disabled={saving}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Admin Passwords */}
        <div className="col-md-12">
          <div className="card border-dark">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Admin Passwords & Department Access</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Manage admin passwords and assign which departments each one can access. Super admin sees all departments by default.
              </p>

              {/* Add new password */}
              <div className="d-flex gap-2 mb-4 p-3 bg-light rounded">
                <input
                  type="text"
                  className="form-control"
                  placeholder="New admin password..."
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
                <button className="btn btn-dark" onClick={addAdminPassword} disabled={saving || !newAdminPassword.trim()}>
                  Add Password
                </button>
              </div>

              {/* List admin passwords */}
              {adminPasswords.length === 0 ? (
                <p className="text-muted">No admin passwords configured yet.</p>
              ) : (
                <div className="row g-3">
                  {adminPasswords.map(admin => (
                    <div key={admin.key} className="col-md-6 col-lg-4">
                      <div className="card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center py-2">
                          <span className="fw-bold">{admin.key}</span>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteAdminPassword(admin.key)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="card-body py-2">
                          <div className="mb-2">
                            <label className="form-label small fw-bold">Password:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              defaultValue={admin.value}
                              id={`pw-${admin.key}`}
                              onBlur={(e) => {
                                if (e.target.value !== admin.value) {
                                  updateAdminPasswordValue(admin, e.target.value);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="form-label small fw-bold">Allowed Departments:</label>
                            <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                              {departments.filter(d => d.is_active).length === 0 ? (
                                <span className="text-muted small">No active departments</span>
                              ) : (
                                departments.filter(d => d.is_active).map(dept => {
                                  const isChecked = (admin.allowed_departments || []).includes(dept.name);
                                  return (
                                    <div key={dept.id} className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`${admin.key}-${dept.id}`}
                                        checked={isChecked}
                                        disabled={saving}
                                        onChange={() => toggleAdminDept(admin, dept.name)}
                                      />
                                      <label className="form-check-label" htmlFor={`${admin.key}-${dept.id}`}>
                                        {dept.name}
                                      </label>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}