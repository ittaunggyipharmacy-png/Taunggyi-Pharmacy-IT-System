import { supabase } from '../lib/supabase';
import { MeetingMinute } from '../types';
import { cleanData } from '../utils/cleanData';

export const fetchMeetingMinutes = async (): Promise<MeetingMinute[]> => {
  try {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as MeetingMinute[];
  } catch (error) {
    console.error('Error fetching meeting minutes:', error);
    return [];
  }
};

export const saveMeetingMinute = async (meeting: Partial<MeetingMinute>): Promise<string | undefined> => {
  try {
    const rec = {
      id: meeting.id || crypto.randomUUID(),
      ...cleanData(meeting),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('meeting_minutes').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving meeting minute:', error);
    throw error;
  }
};

export const deleteMeetingMinute = async (meetingId: string): Promise<void> => {
  try {
    const { error } = await supabase.from('meeting_minutes').delete().eq('id', meetingId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting meeting minute:', error);
    throw error;
  }
};

export const subscribeToMeetings = (callback: (meetings: MeetingMinute[]) => void) => {
  const channel = supabase
    .channel('meeting_minutes_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_minutes' }, async () => {
      const meetings = await fetchMeetingMinutes();
      callback(meetings);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
