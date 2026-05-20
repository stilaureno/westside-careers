'use server';

import { getApplicantsRaw, getStageResultsRaw, getExamResultsRaw, type ExportableTable } from '@/lib/db/export';

function objectToCsvRow(obj: Record<string, unknown>): string {
  const values = Object.values(obj).map((value) => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });
  return values.join(',');
}

function generateCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return '';
  }
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const rows = data.map((obj) => objectToCsvRow(obj));
  return [headerRow, ...rows].join('\r\n');
}

export interface ExportResult {
  success: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}

export async function exportTableAsCsv(tableName: ExportableTable): Promise<ExportResult> {
  try {
    let data: Record<string, unknown>[];

    switch (tableName) {
      case 'applicants':
        data = await getApplicantsRaw();
        break;
      case 'stage_results':
        data = await getStageResultsRaw();
        break;
      case 'math_exam_results':
        data = await getExamResultsRaw();
        break;
      default:
        return { success: false, error: 'Invalid table name' };
    }

    const csv = generateCsv(data);
    const today = new Date().toISOString().split('T')[0];
    const filename = `${tableName}_${today}.csv`;

    return { success: true, csv, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}