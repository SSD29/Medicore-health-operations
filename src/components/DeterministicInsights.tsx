import React from 'react';
import {
  AlertTriangle,
  Bed,
  Calendar,
  Clock,
  FlaskConical,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { useHospitalData } from '../context/HospitalDataContext';

export const DeterministicInsights: React.FC = () => {
  const { insights, filteredRecords } = useHospitalData();

  if (filteredRecords.length === 0) return null;

  const monthLabelMap: Record<string, string> = {
    '2026-03': 'March 2026',
    '2026-04': 'April 2026',
    '2026-05': 'May 2026',
    '2026-06': 'June 2026',
    '2026-07': 'July 2026',
    '2026-08': 'August 2026',
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-sm border border-slate-700/80 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-700/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Realtime Operational Bottlenecks & Deterministic Insights
          </h2>
        </div>
        <span className="text-[11px] text-teal-400 font-medium">
          Dynamically computed across {filteredRecords.length.toLocaleString()} records
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Highest Wait Time Dept */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Highest Waiting Time</span>
          </div>
          <div className="font-bold text-sm text-white truncate" title={insights.highestWaitDept.department}>
            {insights.highestWaitDept.department}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Avg <span className="text-rose-400 font-semibold">{insights.highestWaitDept.avgWait} mins</span> wait
          </div>
        </div>

        {/* Highest Volume Dept */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>Peak Patient Volume</span>
          </div>
          <div className="font-bold text-sm text-white truncate" title={insights.highestVolumeDept.department}>
            {insights.highestVolumeDept.department}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span className="text-blue-400 font-semibold">{insights.highestVolumeDept.volume.toLocaleString()}</span> visits ({insights.highestVolumeDept.pct}%)
          </div>
        </div>

        {/* Highest Occupancy Ward */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold mb-1">
            <Bed className="w-3.5 h-3.5 shrink-0" />
            <span>Peak Bed Occupancy</span>
          </div>
          <div className="font-bold text-sm text-white truncate">{insights.highestOccupancyWard.ward}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Avg <span className="text-amber-400 font-semibold">{insights.highestOccupancyWard.occupancy}%</span> capacity
          </div>
        </div>

        {/* Longest Diagnostic TAT */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-purple-400 text-[11px] font-semibold mb-1">
            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
            <span>Slowest Diagnostic TAT</span>
          </div>
          <div className="font-bold text-sm text-white truncate">{insights.longestTatTest.testType}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Avg <span className="text-purple-400 font-semibold">{insights.longestTatTest.avgTat} hrs</span> turnaround
          </div>
        </div>

        {/* Highest No-Show Dept */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-semibold mb-1">
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span>Highest No-Show Rate</span>
          </div>
          <div className="font-bold text-sm text-white truncate" title={insights.highestNoShowDept.department}>
            {insights.highestNoShowDept.department}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span className="text-orange-400 font-semibold">{insights.highestNoShowDept.rate}%</span> missed visits
          </div>
        </div>

        {/* Peak Volume Month */}
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/70 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Peak Month Volume</span>
          </div>
          <div className="font-bold text-sm text-white truncate">
            {monthLabelMap[insights.peakMonth.month] || insights.peakMonth.month}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span className="text-emerald-400 font-semibold">{insights.peakMonth.volume.toLocaleString()}</span> visits recorded
          </div>
        </div>
      </div>
    </div>
  );
};
