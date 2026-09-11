import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, RolePermission } from '../types';
import { fetchRolePermissions, saveRolePermission } from '../services/settingsService';
import { supabase } from '../lib/supabase';

interface AccessControlContextType {
  permissions: RolePermission[];
  canAccess: (role: UserRole | string, menuId: string) => boolean;
  updatePermission: (role: string, menuId: string, allowed: boolean) => Promise<void>;
  loading: boolean;
}

const AccessControlContext = createContext<AccessControlContextType>({
  permissions: [],
  canAccess: () => false,
  updatePermission: async () => {},
  loading: true,
});

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    // Do not query protected tables while the visitor is signed out.
    if (!session?.user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await fetchRolePermissions();
    setPermissions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const startForSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!session?.user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await fetchRolePermissions();
      if (!isMounted) return;
      setPermissions(data);
      setLoading(false);

      channel = supabase
        .channel('role_permissions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
          void loadPermissions();
        })
        .subscribe();
    };

    void startForSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Auth callbacks stay synchronous; database work is deferred to avoid
      // racing Supabase's internal auth lock during SIGNED_IN/TOKEN_REFRESHED.
      setTimeout(() => {
        if (isMounted) void loadPermissions();
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadPermissions]);

  const canAccess = (role: UserRole | string, menuId: string) => {
    if (menuId === 'it-ping') return true;

    const ADMIN_ROLES = [
      UserRole.ADMIN,
      UserRole.ADMIN_CAPS,
      UserRole.IT_SUPERVISOR,
      UserRole.IT_SUPERVISOR_CAPS,
      UserRole.MERCHANDISING_SUPERVISOR,
      UserRole.IT_DIGITAL_MARKETING
    ];
    if (ADMIN_ROLES.includes(role as UserRole)) return true;

    if (role === UserRole.STAFF) {
      return ['assets', 'asset-users', 'cmd-catalogues'].includes(menuId);
    }

    const rolePermission = permissions.find(p => p.role === role);
    return rolePermission?.allowed_menus[menuId] === true;
  };

  const updatePermission = async (role: string, menuId: string, allowed: boolean) => {
    let rolePermission = permissions.find(p => p.role === role);

    if (!rolePermission) {
      rolePermission = { role, allowed_menus: {} };
    }

    const updatedRolePermission = {
      ...rolePermission,
      allowed_menus: {
        ...rolePermission.allowed_menus,
        [menuId]: allowed
      }
    };

    await saveRolePermission(updatedRolePermission);
    const data = await fetchRolePermissions();
    setPermissions(data);
  };

  return (
    <AccessControlContext.Provider value={{ permissions, canAccess, updatePermission, loading }}>
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => useContext(AccessControlContext);