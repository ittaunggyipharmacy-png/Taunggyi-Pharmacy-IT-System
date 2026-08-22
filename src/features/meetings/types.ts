export interface MeetingActionItem {
  id: string;
  task: string;
  assignedTo: string;
  department?: string;
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  remarks?: string;
  completedAt?: string;
}

export interface MeetingMinute {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  tags?: string[];
  attendees: string[];
  content: string;
  actionItems: MeetingActionItem[];
  createdAt: string;
  createdBy: string;
  createdByEmail?: string;
}
