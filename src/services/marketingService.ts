import { supabase } from '../lib/supabase';
import { ContentPlan } from '../types';
import { cleanData } from '../utils/cleanData';

export const fetchContentPlans = async (): Promise<ContentPlan[]> => {
  try {
    const { data, error } = await supabase.from('content_plans').select('*');
    if (error) throw error;
    return (data || []) as unknown as ContentPlan[];
  } catch (error) {
    console.error('Error fetching content plans:', error);
    return [];
  }
};

export const saveContentPlan = async (plan: Partial<ContentPlan>): Promise<string | undefined> => {
  try {
    const rec = {
      id: plan.id || crypto.randomUUID(),
      ...cleanData(plan),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('content_plans').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving content plan:', error);
    throw error;
  }
};

export const deleteContentPlan = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('content_plans').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting content plan:', error);
    throw error;
  }
};

export const subscribeToContentPlans = (callback: (plans: ContentPlan[]) => void) => {
  let refreshVersion = 0;
  const channel = supabase
    .channel('content_plans_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_plans' }, async () => {
      const version = ++refreshVersion;
      const plans = await fetchContentPlans();
      if (version === refreshVersion) callback(plans);
    })
    .subscribe();

  const initialVersion = refreshVersion;
  fetchContentPlans()
    .then((plans) => {
      if (initialVersion === refreshVersion) callback(plans);
    })
    .catch((err) => console.error('Failed to load initial content plans', err));

  return () => {
    refreshVersion++;
    supabase.removeChannel(channel);
  };
};
