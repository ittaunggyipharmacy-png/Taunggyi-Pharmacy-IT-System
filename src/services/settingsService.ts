import { supabase } from '../lib/supabase';
import { SystemSettings, RolePermission } from '../types';
import { cleanData } from '../utils/cleanData';

export const saveSettings = async (settings: SystemSettings): Promise<void> => {
  try {
    await supabase.from('system_config').upsert({
      id: 'main',
      ...cleanData(settings),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const getSettings = async (): Promise<SystemSettings | null> => {
  try {
    const { data, error } = await supabase.from('system_config').select('*').eq('id', 'main').single();
    if (error || !data) return null;
    return data as SystemSettings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
};

export const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  try {
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return [];
  }
};

export const saveRolePermission = async (rolePermission: RolePermission): Promise<void> => {
  try {
    await supabase.from('role_permissions').upsert({
      role: rolePermission.role,
      allowed_menus: rolePermission.allowed_menus,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving role permission:', error);
    throw error;
  }
};
