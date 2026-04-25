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

  const [applicantRes, gamesRes, stagesRes, notificationsRes] = await Promise.all([
    supabase.from('applicants').select('*').eq('reference_no', referenceNo).single(),
    supabase.from('applicant_games').select('*').eq('reference_no', referenceNo),
    supabase.from('stage_results').select('*').eq('reference_no', referenceNo).order('stage_sequence', { ascending: true }),
    supabase.from('applicant_notifications').select('*').eq('reference_no', referenceNo).order('created_at', { ascending: false }),
  ]);

  const applicant = applicantRes.data;
  const applicantError = applicantRes.error;

  if (applicantError || !applicant) return { data: null, error: applicantError?.message || 'Applicant not found' };

  return {
    data: {
      applicant: applicant as Applicant,
      games: gamesRes.data || [],
      stages: stagesRes.data || [],
      notifications: notificationsRes.data || [],
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