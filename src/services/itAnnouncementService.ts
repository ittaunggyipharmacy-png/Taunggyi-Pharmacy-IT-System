import { supabase } from '../lib/supabase';

const TABLE_NAME = 'it_announcements';

export interface ItAnnouncement {
  id?: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

// Row shape as it actually exists in Postgres (snake_case)
interface ItAnnouncementRow {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

const toItAnnouncement = (row: ItAnnouncementRow): ItAnnouncement => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  message: row.message,
  createdAt: row.created_at,
});

export const postAnnouncement = async (userId: string, userName: string, message: string) => {
  const { error } = await supabase.from(TABLE_NAME).insert({
    user_id: userId,
    user_name: userName,
    message,
  });

  if (error) {
    console.error('Failed to post IT announcement:', error);
    throw error;
  }
};

export const subscribeToAnnouncements = (callback: (announcements: ItAnnouncement[]) => void) => {
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch IT announcements:', error);
      return;
    }

    if (data) callback((data as ItAnnouncementRow[]).map(toItAnnouncement));
  };

  fetchAnnouncements();

  const channel = supabase
    .channel('it_announcements-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
      fetchAnnouncements();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};