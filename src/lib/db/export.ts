import { createClient } from '@/lib/supabase/server';

export type ExportableTable = 'applicants' | 'stage_results' | 'math_exam_results';

export async function getTableData(tableName: ExportableTable): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }

  return data || [];
}

export async function getApplicantsRaw(): Promise<Record<string, unknown>[]> {
  return getTableData('applicants');
}

export async function getStageResultsRaw(): Promise<Record<string, unknown>[]> {
  return getTableData('stage_results');
}

export async function getExamResultsRaw(): Promise<Record<string, unknown>[]> {
  return getTableData('math_exam_results');
}