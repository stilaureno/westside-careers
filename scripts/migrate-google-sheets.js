#!/usr/bin/env node
/**
 * migrate-google-sheets.js
 *
 * Run after filling in your Supabase credentials below.
 * Assumes each sheet has been exported from Google Sheets as a TSV file.
 *
 * Usage:
 *   node scripts/migrate-google-sheets.js \
 *     --applicants applicants.tsv \
 *     --games applicant_games.tsv \
 *     --stages stage_results.tsv \
 *     --notifications applicant_notifications.tsv
 *
 * Or set the env vars SUPABASE_URL and SUPABASE_SERVICE_KEY instead.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function insertBatch(table, rows) {
  if (rows.length === 0) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type: 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to insert into ${table}: ${err}`);
  } else {
    console.log(`Inserted ${rows.length} rows into ${table}`);
  }
}

function parseTSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split('\t').map((h) => camelCase(h));
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || null;
    });
    return obj;
  });
}

function camelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^([A-Z])/, (c) => c.toLowerCase());
}

async function migrate(data) {
  // 1. Applicants
  if (data.applicants) {
    const rows = data.applicants.map((r) => ({
      applicant_id: r.applicantId || r.applicant_id,
      reference_no: r.referenceNo || r.reference_no,
      last_name: r.lastName || r.last_name,
      first_name: r.firstName || r.first_name,
      middle_name: r.middleName || r.middle_name || null,
      birthdate: r.birthdate,
      age: r.age ? parseInt(r.age) : null,
      gender: r.gender,
      contact_number: r.contactNumber || r.contact_number,
      email_address: r.emailAddress || r.email_address || null,
      height_cm: r.heightCm || r.height_cm ? parseFloat(r.heightCm || r.height_cm) : null,
      weight_kg: r.weightKg || r.weight_kg ? parseFloat(r.weightKg || r.weight_kg) : null,
      bmi_value: r.bmiValue || r.bmi_value ? parseFloat(r.bmiValue || r.bmi_value) : null,
      position_applied: r.positionApplied || r.position_applied,
      experience_level: r.experienceLevel || r.experience_level || null,
      current_company_name: r.currentCompanyName || r.currentCompanyName || null,
      current_position: r.currentPosition || r.currentPosition || null,
      previous_company_name: r.previousCompanyName || r.previousCompanyName || null,
      preferred_department: r.preferredDepartment || r.preferredDepartment || null,
      currently_employed: r.currentlyEmployed || r.currently_employed || 'No',
      duplicate_key: r.duplicateKey || r.duplicate_key || null,
      current_stage: r.currentStage || r.current_stage || null,
      application_status: r.applicationStatus || r.application_status || null,
      overall_result: r.overallResult || r.overall_result || null,
      created_at: r.createdAt || r.created_at || null,
      updated_at: r.updatedAt || r.updated_at || null,
    }));
    await insertBatch('applicants', rows);
  }

  // 2. Applicant Games
  if (data.games) {
    const rows = data.games.map((r) => ({
      applicant_id: r.applicantId || r.applicant_id,
      reference_no: r.referenceNo || r.reference_no,
      game_code: r.gameCode || r.game_code,
    }));
    await insertBatch('applicant_games', rows);
  }

  // 3. Stage Results
  if (data.stages) {
    const rows = data.stages.map((r) => ({
      applicant_id: r.applicantId || r.applicant_id,
      reference_no: r.referenceNo || r.reference_no,
      stage_name: r.stageName || r.stage_name,
      stage_sequence: r.stageSequence || r.stage_sequence ? parseInt(r.stageSequence || r.stage_sequence) : 1,
      result_status: r.resultStatus || r.result_status || null,
      current_stage_label: r.currentStageLabel || r.current_stage_label || null,
      height_cm: r.heightCm || r.height_cm ? parseFloat(r.heightCm || r.height_cm) : null,
      weight_kg: r.weightKg || r.weight_kg ? parseFloat(r.weightKg || r.weight_kg) : null,
      bmi_value: r.bmiValue || r.bmi_value ? parseFloat(r.bmiValue || r.bmi_value) : null,
      bmi_result: r.bmiResult || r.bmi_result || null,
      color_blind_result: r.colorBlindResult || r.color_blind_result || null,
      visible_tattoo: r.visibleTattoo || r.visible_tattoo || null,
      invisible_tattoo: r.invisibleTattoo || r.invisible_tattoo || null,
      sweaty_palm_result: r.sweatyPalmResult || r.sweaty_palm_result || null,
      score: r.score ? parseFloat(r.score) : null,
      passing_score: r.passingScore || r.passing_score ? parseFloat(r.passingScore || r.passing_score) : null,
      max_score: r.maxScore || r.max_score ? parseFloat(r.maxScore || r.max_score) : null,
      remarks: r.remarks || null,
      evaluated_by: r.evaluatedBy || r.evaluated_by || null,
      evaluated_at: r.evaluatedAt || r.evaluated_at || null,
    }));
    await insertBatch('stage_results', rows);
  }

  // 4. Notifications
  if (data.notifications) {
    const rows = data.notifications.map((r) => ({
      applicant_id: r.applicantId || r.applicant_id,
      reference_no: r.referenceNo || r.reference_no,
      stage_name: r.stageName || r.stage_name || null,
      result_status: r.resultStatus || r.result_status || null,
      notification_message: r.notificationMessage || r.notification_message || null,
      visible_to_applicant: r.visibleToApplicant || r.visible_to_applicant || 'Yes',
      created_by: r.createdBy || r.created_by || null,
      created_at: r.createdAt || r.created_at || null,
    }));
    await insertBatch('applicant_notifications', rows);
  }

  console.log('Migration complete!');
}

// Simple CLI parsing for TSV file paths
const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => [a.replace('--', ''), ''])
);

if (require.main === module) {
  const fs = require('fs');

  const files = {
    applicants: args.applicants,
    games: args.games,
    stages: args.stages,
    notifications: args.notifications,
  };

  const data = {};
  if (files.applicants) data.applicants = parseTSV(fs.readFileSync(files.applicants, 'utf8'));
  if (files.games) data.games = parseTSV(fs.readFileSync(files.games, 'utf8'));
  if (files.stages) data.stages = parseTSV(fs.readFileSync(files.stages, 'utf8'));
  if (files.notifications) data.notifications = parseTSV(fs.readFileSync(files.notifications, 'utf8'));

  migrate(data).catch(console.error);
}

module.exports = { migrate, parseTSV };