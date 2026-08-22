import React, { useState } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import { ActivityEntry, TaskEvidence, DailyLog, ITTicket, EmployeeProfile } from '../../types';
import { Dashboard } from '../dashboard/Dashboard';
import { cn } from '../../lib/utils';

export function ReportsModule({ activities, evidence, allDailyLogs, tickets, employees }: { 
 activities: ActivityEntry[], 
 evidence: TaskEvidence[], 
 allDailyLogs: DailyLog[],
 tickets: ITTicket[],
 employees: EmployeeProfile[]
}) {
 const [dateRange, setDateRange] = useState({ start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });

 const filteredDailyLogs = allDailyLogs.filter(log => log.date >= dateRange.start && log.date <= dateRange.end);
 const filteredTickets = tickets.filter(t => t.requestTime.slice(0, 10) >= dateRange.start && t.requestTime.slice(0, 10) <= dateRange.end);

 const exportKPISummary = () => {
 const data = filteredDailyLogs.map(log => {
 const completion = Object.values(log.tasks).filter(Boolean).length;
 return {
 Date: log.date,
 UserID: log.userId,
 TasksCompleted: completion,
 TotalTasks: Object.keys(log.tasks).length,
 CompletionRate: `${Math.round((completion / Object.keys(log.tasks).length) * 100)}%`
 };
 });

 const ws = utils.json_to_sheet(data);
 const wb = utils.book_new();
 utils.book_append_sheet(wb, ws, "KPI Summary");
 writeFile(wb, `KPI_Summary_${format(new Date(), "yyyy-MM")}.xlsx`);
 };

 // Group logs by date to show progress over time
 const chartData = Array.from({ length: 7 }).map((_, i) => {
 const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
 const dayLogs = allDailyLogs.filter(l => l.date === date);
 
 let totalComp = 0;
 let totalTasks = 0;
 
 dayLogs.forEach(l => {
 totalComp += Object.values(l.tasks).filter(Boolean).length;
 totalTasks += Object.keys(l.tasks).length;
 });

 return {
 date: format(parseISO(date), "MMM dd"),
 progress: totalTasks > 0 ? Math.round((totalComp / totalTasks) * 100) : 0
 };
 });

 const staffPerformance = employees.map(emp => {
 const logs = allDailyLogs.filter(l => l.userId === emp.id);
 let totalTasks = 0;
 let completedTasks = 0;
 logs.forEach(l => {
 totalTasks += Object.keys(l.tasks).length;
 completedTasks += Object.values(l.tasks).filter(Boolean).length;
 });
 const completionRate = totalTasks > 0 ? Math.round((completedTasks/totalTasks) * 100) : 0;
 const avgSkill = emp.skills && emp.skills.length > 0 
 ? emp.skills.reduce((acc, s) => acc + s.level, 0) / emp.skills.length 
 : 0;

 return {
 ...emp,
 completionRate,
 avgSkill: avgSkill.toFixed(1)
 };
 }).sort((a,b) => b.completionRate - a.completionRate);

  return <Dashboard dateRange={dateRange} setDateRange={setDateRange} exportKPISummary={exportKPISummary} activities={activities} chartData={chartData} evidence={evidence} staffPerformance={staffPerformance} />;
}



