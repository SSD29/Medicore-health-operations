/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Activity, ShieldAlert } from 'lucide-react';
import { FilterBar } from './components/FilterBar';
import { ActiveTab, Navbar } from './components/Navbar';
import { RecordDetailModal } from './components/RecordDetailModal';
import { AskAi } from './components/views/AskAi';
import { DataExplorer } from './components/views/DataExplorer';
import { DepartmentPerformance } from './components/views/DepartmentPerformance';
import { DiagnosticsCapacity } from './components/views/DiagnosticsCapacity';
import { ExecutiveOverview } from './components/views/ExecutiveOverview';
import { FinancialPerformance } from './components/views/FinancialPerformance';
import { PatientFlow } from './components/views/PatientFlow';
import { OperationsAgent } from './components/views/OperationsAgent';
import { HospitalDataProvider, useHospitalData } from './context/HospitalDataContext';

const MainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const { isGenerating, allRecords } = useHospitalData();

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
          <Activity className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-lg font-bold">Synthesizing MediCore Hospital Operations Engine...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
          Generating 15,000 correlated patient visit encounters, doctor rosters, diagnostic TATs, and bed occupancy matrices...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Navigation Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Filter Bar */}
      <FilterBar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <ExecutiveOverview />}
        {activeTab === 'department' && <DepartmentPerformance />}
        {activeTab === 'flow' && <PatientFlow />}
        {activeTab === 'diagnostics' && <DiagnosticsCapacity />}
        {activeTab === 'financial' && <FinancialPerformance />}
        {activeTab === 'explorer' && <DataExplorer />}
        <div style={{ display: activeTab === 'ai' ? 'block' : 'none' }}>
          <AskAi />
        </div>
        <div style={{ display: activeTab === 'agent' ? 'block' : 'none' }}>
          <OperationsAgent />
        </div>
      </main>

      {/* Record Inspection Modal */}
      <RecordDetailModal />

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">MediCore Hospital Operations Intelligence</span>
            <span>•</span>
            <span>MediCore Health Network</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>15,000 Visit Records Engine</span>
            <span>•</span>
            <span>March 1, 2026 – August 31, 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <HospitalDataProvider>
      <MainDashboard />
    </HospitalDataProvider>
  );
}
