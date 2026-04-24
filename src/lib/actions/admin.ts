'use server';

import { createClient } from '@/lib/supabase/server';
import { getDashboardSummary, getApplicantSummaryData, getApplicantByReference, getApplicantStageRoadmap } from '@/lib/db/applicants';
import { upsertStageResult } from '@/lib/db/stages';
import type { DashboardSummary, Applicant, StageRoadmapItem } from '@/types';

export async function getDashboardData(
  _adminPassword: string
): Promise<{ summary: DashboardSummary; applicants: Applicant[] }> {
  const summary = await getDashboardSummary();
  const applicants = await getApplicantSummaryData();
  return { summary, applicants };
}

export async function getDashboard(
  _adminPassword: string,
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  return getDashboardSummary(startDate, endDate);
}

export async function getApplicantsList(_adminPassword: string): Promise<Applicant[]> {
  return getApplicantSummaryData();
}

export async function getApplicant(
  referenceNo: string,
  _adminPassword: string
): Promise<{ data: { applicant: Applicant; games: any[]; stages: any[]; notifications: any[] } | null; error: string | null }> {
  const supabase = await createClient();
  const { data: applicant, error } = await getApplicantByReference(referenceNo);

  if (error || !applicant) return { data: null, error };

  const { data: games } = await supabase
    .from('applicant_games')
    .select('*')
    .eq('reference_no', referenceNo);

  const { data: stages } = await supabase
    .from('stage_results')
    .select('*')
    .eq('reference_no', referenceNo)
    .order('stage_sequence', { ascending: true });

  const { data: notifications } = await supabase
    .from('applicant_notifications')
    .select('*')
    .eq('reference_no', referenceNo)
    .order('created_at', { ascending: false });

  return {
    data: {
      applicant,
      games: games || [],
      stages: stages || [],
      notifications: notifications || [],
    },
    error: null,
  };
}

export async function updateStage(
  payload: any,
  _adminPassword: string
): Promise<{ success: boolean; error?: string }> {
  return upsertStageResult({
    referenceNo: payload.referenceNo,
    stageName: payload.stageName,
    stageSequence: payload.stageSequence,
    resultStatus: payload.resultStatus,
    currentStageLabel: payload.currentStageLabel,
    evaluatedBy: payload.evaluatedBy,
    heightCm: payload.heightCm,
    weightKg: payload.weightKg,
    bmiValue: payload.bmiValue,
    bmiResult: payload.bmiResult,
    colorBlindResult: payload.colorBlindResult,
    visibleTattoo: payload.visibleTattoo,
    invisibleTattoo: payload.invisibleTattoo,
    sweatyPalmResult: payload.sweatyPalmResult,
    score: payload.score,
    passingScore: payload.passingScore,
    maxScore: payload.maxScore,
    remarks: payload.remarks,
  });
}