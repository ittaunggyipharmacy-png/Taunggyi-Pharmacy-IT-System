import { supabase } from '../lib/supabase';

const TABLE_NAME = 'it_announcements';

export type AnnouncementCategory = 'guide' | 'video' | 'link' | 'notice' | 'tip' | 'document';

export interface ItAnnouncement {
  id?: string;
  userId: string;
  userName: string;
  title: string;
  category: AnnouncementCategory;
  content: string;
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ItAnnouncementRow {
  id: string;
  user_id: string;
  user_name: string;
  title: string | null;
  category: AnnouncementCategory;
  content: string | null;
  message: string;
  cover_image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const toItAnnouncement = (row: ItAnnouncementRow): ItAnnouncement => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  title: row.title || 'IT Guide',
  category: row.category || 'notice',
  content: row.content ?? row.message ?? '',
  coverImageUrl: row.cover_image_url,
  videoUrl: row.video_url,
  linkUrl: row.link_url,
  isPublished: row.is_published ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

export interface CreateAnnouncementInput {
  userId: string;
  userName: string;
  title: string;
  category: AnnouncementCategory;
  content: string;
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
}

export const postAnnouncement = async (input: CreateAnnouncementInput) => {
  const { error } = await supabase.from(TABLE_NAME).insert({
    user_id: input.userId,
    user_name: input.userName,
    title: input.title,
    category: input.category,
    content: input.content,
    message: input.content,
    cover_image_url: input.coverImageUrl || null,
    video_url: input.videoUrl || null,
    link_url: input.linkUrl || null,
    is_published: true,
  });

  if (error) {
    console.error('Failed to post IT guide:', error);
    throw error;
  }
};

export const subscribeToAnnouncements = (callback: (announcements: ItAnnouncement[]) => void) => {
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch IT guides:', error);
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