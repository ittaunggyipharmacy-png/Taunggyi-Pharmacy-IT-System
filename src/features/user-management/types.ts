import { UserRole } from '../../types';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: any;
  lastLogin?: any;
  isAdmin?: boolean;
}
