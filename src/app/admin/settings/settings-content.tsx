'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStages, getPositionStagesData, savePositionStages, addStage, deleteStage, updateStageOrder } from '@/lib/db/positions';

interface VisibleField {
  id: string;
  field_key: string;
  field_label: string;
  is_visible: boolean;
  location?: string;
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
  column_visibility?: string[] | null;
  label: string | null;
  modal_section_visibility?: string[] | null;
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
  const [allStages, setAllStages] = useState<{ id: string; name: string; display_order: number }[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageOrder, setNewStageOrder] = useState<number>(0);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<VisibleField[]>([]);
  const [modalFields, setModalFields] = useState<VisibleField[]>([]);

  // Protected columns that cannot be hidden
  const protectedColumns = ['applicants_table_reference_no', 'applicants_table_displayName'];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [fieldsRes, deptsRes, possRes, adminPassRes, stagesRes] = await Promise.all([
      supabase.from('visible_fields').select('*').order('display_order'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
      supabase.from('config').select('*').like('key', 'ADMIN_PASSWORD%').neq('key', 'SUPER_ADMIN_PASSWORD'),
      supabase.from('stages').select('*').order('display_order'),
    ]);
    
    const allFields = fieldsRes.data || [];
    setFields(allFields);
    setModalFields(allFields.filter((f: VisibleField) => !f.location || f.location === 'applicant_modal'));
    setTableColumns(allFields.filter((f: VisibleField) => f.location === 'applicants_table'));
    
    setDepartments(deptsRes.data || []);
    setPositions(possRes.data || []);
    setAdminPasswords(adminPassRes.data || []);
    setAllStages(stagesRes.data || []);
    setLoading(false);
  }

  async function toggleField(field: VisibleField) {
    setSaving(true);
    const { error } = await supabase
      .from('visible_fields')
      .update({ is_visible: !field.is_visible })
      .eq('id', field.id);

    if (!error) {
      setModalFields(modalFields.map(f => f.id === field.id ? { ...f, is_visible: !f.is_visible } : f));
    }
    setSaving(false);
  }

  async function toggleTableColumn(field: VisibleField) {
    if (protectedColumns.includes(field.field_key)) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('visible_fields')
      .update({ is_visible: !field.is_visible })
      .eq('id', field.id);

    if (!error) {
      setTableColumns(tableColumns.map(f => f.id === field.id ? { ...f, is_visible: !f.is_visible } : f));
      setMessage({ text: 'Column visibility updated', type: 'success' });
    }
    setSaving(false);
  }

  async function toggleAllTableColumns(show: boolean) {
    setSaving(true);
    const updates = tableColumns
      .filter(f => !protectedColumns.includes(f.field_key))
      .map(f => supabase.from('visible_fields').update({ is_visible: show }).eq('id', f.id));

    await Promise.all(updates);
    setTableColumns(tableColumns.map(f => ({
      ...f,
      is_visible: protectedColumns.includes(f.field_key) ? f.is_visible : show
    })));
    setMessage({ text: show ? 'All columns shown' : 'All columns hidden', type: 'success' });
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
      const stages = await getStages();
      setAllStages(stages);
      setAvailableStages(stages.map(s => ({ id: s.id, name: s.name })));
      setMessage({ text: 'Stage deleted', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Failed to delete stage', type: 'error' });
    }
    setSaving(false);
  }

  async function handleUpdateStageOrder(stageId: string, newOrder: number) {
    if (!newOrder || newOrder < 1) return;
    setSaving(true);
    const result = await updateStageOrder(stageId, newOrder);
    if (result.success) {
      await loadData();
      const stages = await getStages();
      setAllStages(stages);
      setMessage({ text: 'Stage order updated', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Failed to update order', type: 'error' });
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
      .insert({ key: `ADMIN_PASSWORD${newKey}`, value: newAdminPassword.trim(), allowed_departments: [], column_visibility: [], label: null });

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
      await loadData();
    }
    setSaving(false);
  }

  async function updateAdminPasswordLabel(admin: AdminPassword, newLabel: string) {
    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ label: newLabel || null })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, label: newLabel || null } : a));
      setMessage({ text: 'Label updated', type: 'success' });
    } else {
      setMessage({ text: 'Failed to update label', type: 'error' });
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

  async function toggleAdminColumnVisibility(admin: AdminPassword, fieldKey: string) {
    const currentCols = admin.column_visibility || tableColumns.filter(f => f.is_visible).map(f => f.field_key);
    const hasField = currentCols.includes(fieldKey);
    const newCols = hasField
      ? currentCols.filter(c => c !== fieldKey)
      : [...currentCols, fieldKey];

    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ column_visibility: newCols })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, column_visibility: newCols } : a));
      setMessage({ text: 'Column visibility updated', type: 'success' });
    } else {
      setMessage({ text: error.message, type: 'error' });
    }
    setSaving(false);
  }

  async function setAllAdminColumnVisibility(admin: AdminPassword, show: boolean) {
    const newCols = show 
      ? tableColumns.map(f => f.field_key)
      : tableColumns.filter(f => protectedColumns.includes(f.field_key)).map(f => f.field_key);

    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ column_visibility: newCols })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, column_visibility: newCols } : a));
      setMessage({ text: show ? 'All columns shown' : 'Protected columns shown', type: 'success' });
    }
    setSaving(false);
  }

  // Get default column visibility (all visible)
  const getDefaultVisibility = (): string[] => tableColumns.map(f => f.field_key);

  async function toggleAdminModalSectionVisibility(admin: AdminPassword, sectionKey: string) {
    const currentSections = admin.modal_section_visibility || [];
    const hasSection = currentSections.includes(sectionKey);
    const newSections = hasSection
      ? currentSections.filter(s => s !== sectionKey)
      : [...currentSections, sectionKey];

    setSaving(true);
    const { error } = await supabase
      .from('config')
      .update({ modal_section_visibility: newSections })
      .eq('key', admin.key);

    if (!error) {
      setAdminPasswords(adminPasswords.map(a => a.key === admin.key ? { ...a, modal_section_visibility: newSections } : a));
      setMessage({ text: 'Modal section visibility updated', type: 'success' });
    } else {
      setMessage({ text: error.message, type: 'error' });
    }
    setSaving(false);
  }

  // Get effective visibility for an admin (custom or default)
  const getEffectiveVisibility = (admin: AdminPassword): string[] => {
    if (admin.column_visibility && admin.column_visibility.length > 0) {
      return admin.column_visibility;
    }
    return getDefaultVisibility();
  };

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
              {modalFields.map(field => (
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

        {/* Table Column Visibility */}
        <div className="col-md-6">
          <div className="card border-dark">
            <div className="card-header" style={{ background: '#8b1e2d', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0" style={{ color: '#fff' }}>Table Column Visibility</h6>
                  <small className="text-white-50">Show or hide columns in the applicants table</small>
                </div>
                <span 
                  className="badge" 
                  style={{ 
                    background: '#FFD700', 
                    color: '#1f2937', 
                    fontSize: '12px', 
                    padding: '4px 10px',
                    borderRadius: '12px'
                  }}
                >
                  {tableColumns.filter(f => f.is_visible).length} visible
                </span>
              </div>
            </div>
            <div className="card-body" style={{ background: '#fafafa' }}>
              <div className="mb-3 d-flex gap-2">
                <button 
                  className="btn btn-sm py-1 px-3"
                  style={{ 
                    background: '#FFD700',
                    color: '#1f2937',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                  onClick={() => toggleAllTableColumns(true)}
                  disabled={saving}
                >
                  ☑ Select All
                </button>
                <button 
                  className="btn btn-sm py-1 px-3"
                  style={{ 
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontWeight: '500',
                    fontSize: '12px'
                  }}
                  onClick={() => toggleAllTableColumns(false)}
                  disabled={saving}
                >
                  Clear All
                </button>
              </div>
              <div className="row g-2">
                {tableColumns.map(field => {
                  const isProtected = protectedColumns.includes(field.field_key);
                  return (
                    <div key={field.id} className="col-6 col-md-4">
                      <div 
                        className="form-check py-2 px-3 border rounded"
                        style={{ 
                          background: isProtected ? '#f3f4f6' : '#fff',
                          transition: 'all 0.15s ease',
                          cursor: isProtected ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`table-col-${field.id}`}
                          checked={field.is_visible}
                          disabled={saving || isProtected}
                          onChange={() => toggleTableColumn(field)}
                          style={{ 
                            accentColor: '#8b1e2d',
                            cursor: isProtected ? 'not-allowed' : 'pointer'
                          }}
                        />
                        <label 
                          className={`form-check-label ms-2 ${isProtected ? 'text-muted' : ''}`}
                          style={{ 
                            fontSize: '12px',
                            color: isProtected ? '#9ca3af' : '#374151',
                            cursor: isProtected ? 'not-allowed' : 'pointer'
                          }} 
                          htmlFor={`table-col-${field.id}`}
                        >
                          {field.field_label}
                          {isProtected && <span className="ms-2" style={{ color: '#8b1e2d', fontSize: '11px' }}>🔒</span>}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex align-items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                <span style={{ color: '#8b1e2d', fontSize: '12px' }}>🔒</span>
                <small style={{ color: '#6b7280', fontSize: '11px' }}>Protected columns are always visible</small>
              </div>
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
                    <label className="form-label small fw-bold">Current Stages (Master List)</label>
                    <table className="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Order</th>
                          <th>Stage Name</th>
                          <th style={{ width: '100px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStages.map(stage => (
                          <tr key={stage.id}>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min="1"
                                defaultValue={stage.display_order}
                                onBlur={(e) => handleUpdateStageOrder(stage.id, parseInt(e.target.value))}
                                style={{ width: '60px' }}
                              />
                            </td>
                            <td>{stage.name}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteStage(stage.id)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <label className="form-label small fw-bold mt-3">Add New Stage (Available to All Positions)</label>
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
          <div className="card border-dark">
            <div className="card-header" style={{ background: '#8b1e2d', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0" style={{ color: '#fff' }}>Positions</h6>
                </div>
                <span 
                  className="badge" 
                  style={{ 
                    background: '#FFD700', 
                    color: '#1f2937', 
                    fontSize: '12px', 
                    padding: '4px 10px',
                    borderRadius: '12px'
                  }}
                >
                  {positions.filter(p => p.is_active).length} active
                </span>
              </div>
            </div>
            <div className="card-body" style={{ background: '#fafafa' }}>
              <div className="d-flex gap-2 mb-4">
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: '200px' }}
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
                <button 
                  className="btn btn-sm py-1 px-3"
                  style={{ 
                    background: '#FFD700',
                    color: '#1f2937',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                  onClick={addPosition} 
                  disabled={saving || !selectedDept}
                >
                  + Add Position
                </button>
              </div>
              {departments.map(dept => {
                const deptPositions = getPositionsForDept(dept.id);
                if (deptPositions.length === 0) return null;
                return (
                  <div key={dept.id} className="mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <h6 className="fw-bold mb-3" style={{ color: '#8b1e2d', fontSize: '14px' }}>
                      <span style={{ color: '#FFD700' }}>▎</span> {dept.name}
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {deptPositions.map(pos => (
                        <span 
                          key={pos.id} 
                          className="badge d-flex align-items-center gap-2"
                          style={{ 
                            background: pos.is_active ? '#fff' : '#f3f4f6',
                            color: pos.is_active ? '#1f2937' : '#9ca3af',
                            border: '1px solid #e5e7eb',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        >
                          <span className={pos.is_active ? '' : 'text-decoration-line-through'}>{pos.name}</span>
                          <div className="form-check form-switch d-inline-block m-0 ms-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={pos.is_active}
                              disabled={saving}
                              onChange={() => togglePosition(pos)}
                              style={{ 
                                marginBottom: 0,
                                accentColor: '#8b1e2d',
                                cursor: saving ? 'not-allowed' : 'pointer'
                              }}
                            />
                          </div>
                          <button
                            className="btn btn-sm p-0 lh-0 ms-1"
                            style={{ 
                              lineHeight: 1,
                              color: '#ef4444',
                              cursor: saving ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => deletePosition(pos.id)}
                            disabled={saving}
                            title="Delete position"
                          >
                            ✕
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
              <h5 className="mb-0">Admin Passwords, Departments & Column Access</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Manage admin passwords, department access, and custom table column visibility for each admin.
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
                            <label className="form-label small fw-bold">Label:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              defaultValue={admin.label || ''}
                              placeholder="e.g., Slots Admin"
                              onBlur={(e) => {
                                if (e.target.value !== (admin.label || '')) {
                                  updateAdminPasswordLabel(admin, e.target.value);
                                }
                              }}
                            />
                          </div>

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

                          {/* Tabs for Departments and Column Visibility */}
                          <ul className="nav nav-tabs small mb-3" role="tablist">
                            <li className="nav-item" role="presentation">
                              <span
                                className="nav-link px-3 py-2"
                                style={{ 
                                  fontSize: '12px', 
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  borderBottom: '2px solid #8b1e2d',
                                  color: '#8b1e2d',
                                  background: 'transparent'
                                }}
                              >
                                Departments
                              </span>
                            </li>
                            <li className="nav-item" role="presentation">
                              <span
                                className="nav-link px-3 py-2"
                                style={{ 
                                  fontSize: '12px', 
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  borderBottom: '2px solid transparent',
                                  color: '#6b7280',
                                }}
                              >
                                Columns
                              </span>
                            </li>
                          </ul>

                          {/* Departments Section */}
                          <div className="mb-3">
                            <label className="form-label small fw-bold">Allowed Departments:</label>
                            <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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

                          {/* Column Visibility Section */}
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <label className="form-label small fw-bold mb-0" style={{ color: '#1f2937', fontSize: '13px' }}>
                                  <span style={{ color: '#8b1e2d' }}>▎</span> Table Columns
                                </label>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    background: '#8b1e2d', 
                                    color: '#fff', 
                                    fontSize: '10px', 
                                    padding: '2px 8px',
                                    borderRadius: '10px'
                                  }}
                                >
                                  {getEffectiveVisibility(admin).filter(f => !protectedColumns.includes(f)).length}
                                </span>
                              </div>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-sm py-1 px-3"
                                  style={{ 
                                    fontSize: '11px',
                                    background: '#FFD700',
                                    color: '#1f2937',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600'
                                  }}
                                  onClick={() => setAllAdminColumnVisibility(admin, true)}
                                  disabled={saving}
                                >
                                  ☑ All
                                </button>
                                <button
                                  className="btn btn-sm py-1 px-3"
                                  style={{ 
                                    fontSize: '11px',
                                    background: '#f3f4f6',
                                    color: '#6b7280',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontWeight: '500'
                                  }}
                                  onClick={() => setAllAdminColumnVisibility(admin, false)}
                                  disabled={saving}
                                >
                                  🔒 Protected
                                </button>
                              </div>
                            </div>
                            <div 
                              className="border rounded p-3" 
                              style={{ 
                                maxHeight: '180px', 
                                overflowY: 'auto',
                                background: '#fafafa',
                                borderColor: '#e5e7eb'
                              }}
                            >
                              {tableColumns.map(field => {
                                const isProtected = protectedColumns.includes(field.field_key);
                                const effectiveVis = getEffectiveVisibility(admin);
                                const isChecked = effectiveVis.includes(field.field_key);
                                return (
                                  <div 
                                    key={field.id} 
                                    className="form-check py-2 px-3 rounded mb-2"
                                    style={{ 
                                      cursor: isProtected ? 'not-allowed' : 'pointer',
                                      transition: 'background 0.15s ease',
                                      marginBottom: '8px'
                                    }}
                                    onMouseOver={(e) => {
                                      if (!isProtected) e.currentTarget.style.background = '#f0f0f0';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`${admin.key}-col-${field.id}`}
                                      checked={isChecked}
                                      disabled={saving || isProtected}
                                      onChange={() => toggleAdminColumnVisibility(admin, field.field_key)}
                                      style={{ 
                                        accentColor: '#8b1e2d',
                                        cursor: isProtected ? 'not-allowed' : 'pointer'
                                      }}
                                    />
                                    <label 
                                      className={`form-check-label ms-2 ${isProtected ? 'text-muted' : ''}`}
                                      style={{ 
                                        fontSize: '12px',
                                        cursor: isProtected ? 'not-allowed' : 'pointer',
                                        color: isProtected ? '#9ca3af' : '#374151'
                                      }} 
                                      htmlFor={`${admin.key}-col-${field.id}`}
                                    >
                                      {field.field_label}
                                      {isProtected && (
                                        <span 
                                          className="ms-2" 
                                          style={{ 
                                            color: '#8b1e2d',
                                            fontSize: '10px',
                                            fontWeight: '600'
                                          }}
                                          title="This column is always visible"
                                        >
                                          🔒
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-2">
                              <span style={{ color: '#8b1e2d', fontSize: '12px' }}>🔒</span>
                              <small style={{ color: '#6b7280', fontSize: '11px' }}>Protected columns are always visible and cannot be hidden</small>
                            </div>
                          </div>

                          {/* Modal Sections Section */}
                          <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #e5e7eb' }}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <label className="form-label small fw-bold mb-0" style={{ color: '#1f2937', fontSize: '13px' }}>
                                <span style={{ color: '#FFD700' }}>▎</span> Modal Sections
                              </label>
                              <span 
                                className="badge" 
                                style={{ 
                                  background: '#10b981', 
                                  color: '#fff', 
                                  fontSize: '10px', 
                                  padding: '2px 8px',
                                  borderRadius: '10px'
                                }}
                              >
                                {(admin.modal_section_visibility || []).length} enabled
                              </span>
                            </div>
                            <div 
                              className="border rounded p-3" 
                              style={{ 
                                background: '#fafafa',
                                borderColor: '#e5e7eb'
                              }}
                            >
                              <div 
                                className="form-check py-2 px-3 rounded mb-2"
                                style={{ cursor: 'pointer', marginBottom: '8px' }}
                              >
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`${admin.key}-modal-notifications`}
                                  checked={(admin.modal_section_visibility || []).includes('notifications')}
                                  disabled={saving}
                                  onChange={() => toggleAdminModalSectionVisibility(admin, 'notifications')}
                                  style={{ accentColor: '#8b1e2d' }}
                                />
                                <label 
                                  className="form-check-label ms-2" 
                                  style={{ fontSize: '12px', color: '#374151' }} 
                                  htmlFor={`${admin.key}-modal-notifications`}
                                >
                                  🔔 Notifications
                                </label>
                              </div>
                            </div>
                            <small className="text-muted d-block mt-2" style={{ fontSize: '11px' }}>
                              These sections are hidden by default for non-super admins
                            </small>
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