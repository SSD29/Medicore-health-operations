import React from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  Clock,
  Coins,
  FileSpreadsheet,
  Layers,
  Stethoscope,
} from 'lucide-react';
import { useHospitalData } from '../context/HospitalDataContext';

export type ActiveTab =
  | 'overview'
  | 'department'
  | 'flow'
  | 'diagnostics'
  | 'financial'
  | 'explorer'
  | 'ai'
  | 'agent';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { filteredRecords, allRecords, exportToCsv } = useHospitalData();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
    { id: 'department', label: 'Department Performance', icon: Building2 },
    { id: 'flow', label: 'Patient Flow', icon: Clock },
    { id: 'diagnostics', label: 'Diagnostics & Capacity', icon: Layers },
    { id: 'financial', label: 'Financial Performance', icon: Coins },
    { id: 'explorer', label: 'Data Explorer', icon: FileSpreadsheet },
    { id: 'ai', label: 'Ask AI', icon: Bot },
    { id: 'agent', label: 'Operations Agent', icon: BrainCircuit },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      {/* Top operational header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                MediCore Health Network
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/80">
                Synthetic Data Demo
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              MediCore Hospital Operations Intelligence
            </h1>
          </div>
        </div>

        {/* Status Indicators & Fast CSV Export */}
        <div className="flex items-center gap-3 self-end md:self-auto text-xs">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span>
              <strong className="text-white font-semibold">
                {filteredRecords.length.toLocaleString()}
              </strong>{' '}
              / {allRecords.length.toLocaleString()} Encounters Loaded
            </span>
          </div>

          <button
            onClick={exportToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors shadow-sm cursor-pointer"
            title="Download currently filtered records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Clinical Disclaimer Ribbon */}
      <div className="bg-amber-950/40 border-y border-amber-500/20 px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] text-amber-200/90 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>Operational Intelligence Portfolio:</strong> Designed exclusively for hospital capacity, patient flow, and resource planning. This system does not provide clinical diagnoses, triage prescriptions, or medical treatment advice.
        </span>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.id === 'ai' && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-teal-400/20 text-teal-300 border border-teal-400/30">
                    Preview
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
