import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    const loadPermissions = async () => {
      const data = await fetchRolePermissions();
      if (isMounted) {
        setPermissions(data);
        setLoading(false);
      }
    };

    loadPermissions();

    const channel = supabase
      .channel('role_permissions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
        loadPermissions();
      })
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadPermissions();
      } else {
        setPermissions([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const canAccess = (role: UserRole | string, menuId: string) => {
    const ADMIN_ROLES = [
      UserRole.ADMIN, 
      UserRole.ADMIN_CAPS,
      UserRole.IT_SUPERVISOR,
      UserRole.IT_SUPERVISOR_CAPS,
      UserRole.MERCHANDISING_SUPERVISOR,
      UserRole.IT_DIGITAL_MARKETING
    ];
    if (ADMIN_ROLES.includes(role as UserRole)) return true;

    // Staff role read-only restrictions
    if (role === UserRole.STAFF) {
      return ['assets', 'asset-users'].includes(menuId);
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
