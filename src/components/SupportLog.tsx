import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ITTicket } from '../types';

export const SupportLog: React.FC = () => {
  const { tickets } = useAppStore();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">IT Support Log</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Requester</th>
              <th className="px-6 py-3">Problem</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket: ITTicket) => (
              <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{ticket.id}</td>
                <td className="px-6 py-4">{ticket.requesterName}</td>
                <td className="px-6 py-4">{ticket.problemType}</td>
                <td className="px-6 py-4">{ticket.status}</td>
                <td className="px-6 py-4">
                  <button className="text-indigo-600 hover:text-indigo-900">Assign</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
