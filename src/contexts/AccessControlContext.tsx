import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, RolePermission } from '../types';
import { fetchRolePermissions, saveRolePermission } from '../services/firestoreService';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreErrors';

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
    const q = query(collection(db, 'role_permissions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as RolePermission);
      setPermissions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'role_permissions');
    });

    return () => unsubscribe();
  }, []);

  const canAccess = (role: UserRole | string, menuId: string) => {
    // Admin always sees everything
    const ADMIN_ROLES = [UserRole.ADMIN, UserRole.ADMIN_CAPS];
    if (ADMIN_ROLES.includes(role as UserRole)) return true;
    
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

    // Save to Firestore (local state will update via onSnapshot)
    await saveRolePermission(updatedRolePermission);
  };

  return (
    <AccessControlContext.Provider value={{ permissions, canAccess, updatePermission, loading }}>
      {children}
    </AccessControlContext.Provider>
  );
};

export const useAccessControl = () => useContext(AccessControlContext);
