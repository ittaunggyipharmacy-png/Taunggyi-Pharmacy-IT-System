export interface DailyLog {
  id: string; // yyyy-mm-dd_userId
  date: string; // yyyy-mm-dd
  userId: string;
  tasks: Record<string, any>; // taskId -> completed
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}

export interface MonthlyLog {
  id: string; // yyyy-mm_userId
  month: string; // yyyy-mm
  userId: string;
  tasks: Record<string, boolean | number>; // taskId -> completed or count
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}

export interface WeeklyLog {
  id: string; // yyyy-Www_userId (e.g., 2026-W19_userId)
  week: string; // yyyy-Www
  userId: string;
  tasks: Record<string, boolean | number>; // taskId -> completed or count
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}
