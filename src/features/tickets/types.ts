import { Priority, Status } from '../../types';

export interface ActionEntry {
  timestamp: string;
  action: string;
  performer: string;
}

export interface ITTicket {
  id: string;
  problemType: string;
  priority: Priority;
  requestTime: string;
  requesterName: string;
  requesterBranch?: string;
  department?: string;
  assignedTo?: string;
  assignedToName?: string;
  responseTime?: number; // in minutes
  actions: ActionEntry[];
  status: Status;
  completedAt?: string;
  description?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  department: string;
  details?: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  logId: string;
  imageUrl: string;
  timestamp: string;
  userId: string;
  userName: string;
}
