import { supabase } from '../lib/supabase';

export interface StorageFileItem {
  id: string;
  name: string;
  mimeType?: string;
  size?: number | string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export const fetchStorageFiles = async (folderId?: string): Promise<StorageFileItem[]> => {
  try {
    const { data, error } = await supabase.storage.from('uploads').list(folderId || '');
    if (error) throw error;
    return (data || []).map((file) => ({
      id: file.id || file.name,
      name: file.name,
      size: file.metadata?.size || 0,
      createdTime: file.created_at,
      modifiedTime: file.updated_at
    }));
  } catch (error) {
    console.error('Error fetching storage files:', error);
    return [];
  }
};

export const fetchStorageQuota = async (): Promise<{ limit: string; usage: string }> => {
  return { limit: '10 GB', usage: '1.2 GB' };
};

export const deleteStorageFile = async (fileId: string): Promise<void> => {
  try {
    const { error } = await supabase.storage.from('uploads').remove([fileId]);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting storage file:', error);
    throw error;
  }
};

export const uploadStorageFile = async (
  file: File,
  folderPath: string = ''
): Promise<{ path: string } | null> => {
  try {
    const cleanPath = folderPath ? `${folderPath}/${file.name}` : file.name;
    const { data, error } = await supabase.storage.from('uploads').upload(cleanPath, file, {
      upsert: true
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
};
