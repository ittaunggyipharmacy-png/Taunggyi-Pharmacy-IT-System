import { create } from 'zustand';

interface KpiStore {
  completedTasks: Record<string, any>;
  setCompletedTasks: (tasks: Record<string, any>) => void;
  incrementTask: (taskId: string, maxCount?: number) => void;
}

export const useKpiStore = create<KpiStore>((set) => ({
  completedTasks: {},
  setCompletedTasks: (tasks) => set({ completedTasks: tasks }),
  incrementTask: (taskId, maxCount) => set((state) => {
    const currentValue = Number(state.completedTasks[taskId]) || 0;
    const newValue = maxCount ? Math.min(maxCount, currentValue + 1) : (!state.completedTasks[taskId] ? new Date().toISOString() : state.completedTasks[taskId]);
    return {
      completedTasks: {
        ...state.completedTasks,
        [taskId]: newValue
      }
    };
  })
}));
