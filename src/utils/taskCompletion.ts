export function completedTasks(tasks: Record<string, unknown> = {}): number {
 return Object.entries(tasks).filter(([id, value]) => id === 'mkt_photos' ? typeof value === 'number' && value >= 20 : value === true || (typeof value === 'number' && value >= 1)).length;
}
export function completionPercent(tasks: Record<string, unknown> = {}): number {
 const total = Object.keys(tasks).length;
 return total ? Math.round(completedTasks(tasks) / total * 100) : 0;
}
