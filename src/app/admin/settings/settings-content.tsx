'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VisibleField {
  id: string;
  field_key: string;
  field_label: string;
  is_visible: boolean;
  display_order: number;
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

export default function SettingsContent() {
  const supabase = createClient();
  const [fields, setFields] = useState<VisibleField[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [newPosName, setNewPosName] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [fieldsRes, deptsRes, possRes] = await Promise.all([
      supabase.from('visible_fields').select('*').order('display_order'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
    ]);
    setFields(fieldsRes.data || []);
    setDepartments(deptsRes.data || []);
    setPositions(possRes.data || []);
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

  const getPositionsForDept = (deptId: string) => positions.filter(p => p.department_id === deptId);

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
                    <span>{dept.name}</span>
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
        <div className="col-md-6">
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
                        <span key={pos.id} className="badge bg-light text-dark d-flex align-items-center gap-1">
                          {pos.name}
                          <button
                            className="btn btn-sm p-0 lh-0"
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
      </div>
    </div>
  );
}