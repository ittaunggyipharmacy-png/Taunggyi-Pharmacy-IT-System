import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, RolePermission } from '../types';
import { fetchRolePermissions, saveRolePermission } from '../services/firestoreService';

interface AccessControlContextType {
  permissions: RolePermission[];
  canAccess: (role: UserRole, menuId: string) => boolean;
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
    const init = async () => {
      const data = await fetchRolePermissions();
      setPermissions(data);
      setLoading(false);
    };
    init();
  }, []);

  const canAccess = (role: UserRole, menuId: string) => {
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

    // Update local state
    setPermissions(prev => prev.map(p => p.role === role ? updatedRolePermission : p).concat(!permissions.find(p => p.role === role) ? [updatedRolePermission] : []));
    
    // Save to Firestore
    await saveRolePermission(updatedRolePermission);
  };

  return (
    <AccessControlContext.Provider value={{ permissions, canAccess, updatePermission, loading }}>
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => useContext(AccessControlContext);
