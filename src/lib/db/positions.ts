import { createClient } from '@/lib/supabase/server';

export async function getStages(): Promise<{ id: string; name: string; display_order: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stages')
    .select('id, name, display_order')
    .order('display_order');
  if (error) return [];
  return data || [];
}

export async function getStagesForPosition(
  positionName: string,
  experienceLevel: string = 'Non-Experienced'
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('position_stages')
    .select('stage_order, is_enabled')
    .eq('position_id', (
      await supabase.from('positions').select('id').eq('name', positionName).single()
    ).data?.id)
    .eq('experience_level', experienceLevel)
    .eq('is_enabled', true)
    .order('stage_order');
  
  if (error || !data) return ['Initial Screening'];
  
  // Get stage names
  const stageIds = data.map(d => d.stage_id);
  const { data: stages } = await supabase
    .from('stages')
    .select('name')
    .in('id', stageIds)
    .order('display_order');
  
  return stages?.map(s => s.name) || ['Initial Screening'];
}

export interface PositionStagesData {
  'Non-Experienced': string[];
  Experienced: string[];
  availableStages: { id: string; name: string }[];
}

export async function getPositionStagesData(positionName: string): Promise<PositionStagesData> {
  const supabase = await createClient();
  
  // Get position ID
  const { data: position } = await supabase
    .from('positions')
    .select('id')
    .eq('name', positionName)
    .single();
  
  if (!position) {
    return { 'Non-Experienced': ['Initial Screening'], Experienced: ['Initial Screening'], availableStages: [] };
  }
  
  // Get available stages (master list)
  const { data: allStages } = await supabase
    .from('stages')
    .select('id, name')
    .order('display_order');
  
  // Get enabled stages for Non-Experienced
  const { data: nonExpData } = await supabase
    .from('position_stages')
    .select('stage_id')
    .eq('position_id', position.id)
    .eq('experience_level', 'Non-Experienced')
    .eq('is_enabled', true)
    .order('stage_order');
  
  // Get enabled stages for Experienced
  const { data: expData } = await supabase
    .from('position_stages')
    .select('stage_id')
    .eq('position_id', position.id)
    .eq('experience_level', 'Experienced')
    .eq('is_enabled', true)
    .order('stage_order');
  
  const nonExpIds = nonExpData?.map(d => d.stage_id) || [];
  const expIds = expData?.map(d => d.stage_id) || [];
  
  // Map IDs to names
  const getStageNames = (ids: string[]) => {
    return ids.map(id => allStages?.find(s => s.id === id)?.name).filter(Boolean) as string[];
  };
  
  return {
    'Non-Experienced': getStageNames(nonExpIds),
    'Experienced': getStageNames(expIds),
    availableStages: allStages || [],
  };
}

export async function savePositionStages(
  positionName: string,
  experienceLevel: string,
  stages: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // Get position ID
  const { data: position } = await supabase
    .from('positions')
    .select('id')
    .eq('name', positionName)
    .single();
  
  if (!position) {
    return { success: false, error: 'Position not found' };
  }
  
  // Get stage IDs from names
  const { data: stageRecords } = await supabase
    .from('stages')
    .select('id, name')
    .in('name', stages);
  
  const stageMap = new Map(stageRecords?.map(s => [s.name, s.id]));
  
  // First, disable all stages for this position/level
  await supabase
    .from('position_stages')
    .update({ is_enabled: false })
    .eq('position_id', position.id)
    .eq('experience_level', experienceLevel);
  
  // Then enable selected stages in order
  for (let i = 0; i < stages.length; i++) {
    const stageId = stageMap.get(stages[i]);
    if (!stageId) continue;
    
    const { error: upsertError } = await supabase
      .from('position_stages')
      .upsert({
        position_id: position.id,
        stage_id: stageId,
        experience_level: experienceLevel,
        stage_order: i + 1,
        is_enabled: true,
      }, {
        onConflict: 'position_id,stage_id,experience_level',
        ignoreDuplicates: false,
      });
    
    if (upsertError) {
      console.error('Error saving stage:', upsertError);
    }
  }
  
  return { success: true };
}

export async function addStage(name: string, displayOrder: number = 0): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // Get max display_order if not provided
  if (displayOrder === 0) {
    const { data: maxOrder } = await supabase
      .from('stages')
      .select('display_order')
      .order('display_order')
      .limit(1)
      .single();
    displayOrder = (maxOrder?.display_order || 0) + 1;
  }
  
  const { error } = await supabase
    .from('stages')
    .insert({ name, display_order: displayOrder });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deleteStage(stageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // First delete from position_stages
  await supabase
    .from('position_stages')
    .delete()
    .eq('stage_id', stageId);
  
  // Then delete from stages
  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}