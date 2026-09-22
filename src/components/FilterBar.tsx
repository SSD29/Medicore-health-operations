import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useHospitalData } from '../context/HospitalDataContext';
import { AGE_GROUPS, DEPARTMENTS, INSURANCE_TYPES, VISIT_TYPES, WARDS } from '../data/hospitalMetadata';

export const FilterBar: React.FC = () => {
  const { filters, setFilter, resetFilters, activeFilterCount, filteredRecords, allRecords } =
    useHospitalData();
  const [isExpanded, setIsExpanded] = useState(false);

  const months = [
    { value: 'All', label: 'All Months (Mar–Aug)' },
    { value: '2026-03', label: 'March 2026' },
    { value: '2026-04', label: 'April 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-08', label: 'August 2026' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Primary Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filters Left */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  {activeFilterCount}
                </span>
              )}
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={filters.month}
                onChange={(e) => setFilter('month', e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 pr-7 font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={filters.department}
                onChange={(e) => setFilter('department', e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 pr-7 font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* Visit Type */}
            <div className="relative">
              <select
                value={filters.visit_type}
                onChange={(e) => setFilter('visit_type', e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 pr-7 font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
              >
                <option value="All">All Visit Types</option>
                {VISIT_TYPES.map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px] max-w-[240px]">
              <input
                type="text"
                placeholder="Search ID, Doctor, Dept..."
                value={filters.searchQuery}
                onChange={(e) => setFilter('searchQuery', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-7 py-1.5 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilter('searchQuery', '')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Toggle Advanced Filters */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                isExpanded || activeFilterCount > 3
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>More Filters</span>
            </button>
          </div>

          {/* Reset Filters & Match count */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-slate-500">
              <strong className="text-slate-800 font-semibold">{filteredRecords.length.toLocaleString()}</strong> of{' '}
              {allRecords.length.toLocaleString()} visits
            </span>

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                title="Reset all applied filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Expanded Filters Row */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {/* Appointment Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Appointment Type
              </label>
              <select
                value={filters.appointment_type}
                onChange={(e) => setFilter('appointment_type', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="All">All Appointments</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>

            {/* Insurance Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Insurance Type
              </label>
              <select
                value={filters.insurance_type}
                onChange={(e) => setFilter('insurance_type', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="All">All Insurance Types</option>
                {INSURANCE_TYPES.map((ins) => (
                  <option key={ins} value={ins}>
                    {ins}
                  </option>
                ))}
              </select>
            </div>

            {/* Ward / Admission */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Ward / Admission
              </label>
              <select
                value={filters.ward}
                onChange={(e) => setFilter('ward', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="All">All Wards / Outpatient</option>
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
                <option value="Non-admitted">Outpatient Only (Non-admitted)</option>
              </select>
            </div>

            {/* Age Group */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Patient Age Group
              </label>
              <select
                value={filters.age_group}
                onChange={(e) => setFilter('age_group', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="All">All Age Groups</option>
                {AGE_GROUPS.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag} yrs
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => setFilter('gender', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="All">All Genders</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
