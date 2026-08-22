export interface BranchNote {
  id: string;
  name: string; // e.g. Branch Name
  location: string;
  phone: string;
}

export interface SystemSettings {
  departments: string[];
  locations: string[];
  itContacts: { name: string; role: string; phone: string }[];
  branchNotes?: BranchNote[];
  menuPermissions?: {
    [role: string]: string[];
  };
}

export interface RolePermission {
  role: string;
  allowed_menus: Record<string, boolean>;
}
