import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, RolePermission } from '../types';
import { fetchRolePermissions } from '../services/firestoreService';

interface AccessControlContextType {
  permissions: RolePermission[];
  canAccess: (role: UserRole, menuId: string) => boolean;
  loading: boolean;
}

const AccessControlContext = createContext<AccessControlContextType>({
  permissions: [],
  canAccess: () => false,
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

  return (
    <AccessControlContext.Provider value={{ permissions, canAccess, loading }}>
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => useContext(AccessControlContext);
