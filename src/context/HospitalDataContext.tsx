import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  calculateDeterministicInsights,
  calculateHospitalKPIs,
} from '../data/analyticsCalculations';
import { generateHospitalDataset } from '../data/syntheticGenerator';
import {
  DeterministicInsights,
  FilterState,
  HospitalKPIs,
  PatientVisitRecord,
} from '../types';

interface HospitalDataContextType {
  allRecords: PatientVisitRecord[];
  filteredRecords: PatientVisitRecord[];
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  kpis: HospitalKPIs;
  hospitalBenchmarkKpis: HospitalKPIs;
  insights: DeterministicInsights;
  selectedRecord: PatientVisitRecord | null;
  setSelectedRecord: (record: PatientVisitRecord | null) => void;
  exportToCsv: () => void;
  isGenerating: boolean;
}

const defaultFilters: FilterState = {
  month: 'All',
  department: 'All',
  visit_type: 'All',
  appointment_type: 'All',
  gender: 'All',
  age_group: 'All',
  insurance_type: 'All',
  ward: 'All',
  searchQuery: '',
};

const HospitalDataContext = createContext<HospitalDataContextType | null>(null);

export const HospitalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allRecords, setAllRecords] = useState<PatientVisitRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedRecord, setSelectedRecord] = useState<PatientVisitRecord | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  // Generate synthetic dataset once
  useEffect(() => {
    // Small timeout to allow UI render first
    const timer = setTimeout(() => {
      const generated = generateHospitalDataset(15000);
      setAllRecords(generated);
      setIsGenerating(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.month !== 'All') count++;
    if (filters.department !== 'All') count++;
    if (filters.visit_type !== 'All') count++;
    if (filters.appointment_type !== 'All') count++;
    if (filters.gender !== 'All') count++;
    if (filters.age_group !== 'All') count++;
    if (filters.insurance_type !== 'All') count++;
    if (filters.ward !== 'All') count++;
    if (filters.searchQuery.trim() !== '') count++;
    return count;
  }, [filters]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (allRecords.length === 0) return [];

    return allRecords.filter((r) => {
      if (filters.month !== 'All' && r.month !== filters.month) return false;
      if (filters.department !== 'All' && r.department !== filters.department) return false;
      if (filters.visit_type !== 'All' && r.visit_type !== filters.visit_type) return false;
      if (filters.appointment_type !== 'All' && r.appointment_type !== filters.appointment_type)
        return false;
      if (filters.gender !== 'All' && r.gender !== filters.gender) return false;
      if (filters.age_group !== 'All' && r.age_group !== filters.age_group) return false;
      if (filters.insurance_type !== 'All' && r.insurance_type !== filters.insurance_type)
        return false;
      if (filters.ward !== 'All') {
        if (filters.ward === 'Non-admitted') {
          if (r.admission) return false;
        } else {
          if (r.ward !== filters.ward) return false;
        }
      }
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const matchId = r.visit_id.toLowerCase().includes(query);
        const matchDoc = r.doctor_name.toLowerCase().includes(query);
        const matchDept = r.department.toLowerCase().includes(query);
        const matchIns = r.insurance_type.toLowerCase().includes(query);
        const matchTest = r.diagnostic_test_type ? r.diagnostic_test_type.toLowerCase().includes(query) : false;
        if (!matchId && !matchDoc && !matchDept && !matchIns && !matchTest) {
          return false;
        }
      }
      return true;
    });
  }, [allRecords, filters]);

  // Compute KPIs
  const kpis = useMemo(() => calculateHospitalKPIs(filteredRecords), [filteredRecords]);
  const hospitalBenchmarkKpis = useMemo(() => calculateHospitalKPIs(allRecords), [allRecords]);
  const insights = useMemo(() => calculateDeterministicInsights(filteredRecords), [filteredRecords]);

  // CSV export utility
  const exportToCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Visit ID',
      'Date',
      'Department',
      'Visit Type',
      'Appointment Type',
      'Age',
      'Gender',
      'Insurance',
      'Arrival Time',
      'Consultation Start',
      'Wait Time (min)',
      'Doctor',
      'No Show',
      'Test Ordered',
      'Test Type',
      'Test TAT (hrs)',
      'Admission',
      'Ward',
      'LOS (days)',
      'Billing ($)',
      'Claim ($)',
      'Outstanding ($)',
    ];

    const rows = filteredRecords.map((r) => [
      r.visit_id,
      r.visit_date,
      `"${r.department}"`,
      r.visit_type,
      r.appointment_type,
      r.patient_age,
      r.gender,
      `"${r.insurance_type}"`,
      r.arrival_time,
      r.consultation_start_time || 'N/A',
      r.waiting_time_minutes !== null ? r.waiting_time_minutes : 'N/A',
      `"${r.doctor_name}"`,
      r.no_show ? 'Yes' : 'No',
      r.diagnostic_test_ordered ? 'Yes' : 'No',
      r.diagnostic_test_type || 'None',
      r.diagnostic_tat_hours !== null ? r.diagnostic_tat_hours : 'N/A',
      r.admission ? 'Yes' : 'No',
      r.ward || 'None',
      r.length_of_stay_days !== null ? r.length_of_stay_days : 'N/A',
      r.billing_amount,
      r.claim_amount || 0,
      r.outstanding_amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medicore_hospital_operations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <HospitalDataContext.Provider
      value={{
        allRecords,
        filteredRecords,
        filters,
        setFilter,
        resetFilters,
        activeFilterCount,
        kpis,
        hospitalBenchmarkKpis,
        insights,
        selectedRecord,
        setSelectedRecord,
        exportToCsv,
        isGenerating,
      }}
    >
      {children}
    </HospitalDataContext.Provider>
  );
};

export const useHospitalData = () => {
  const context = useContext(HospitalDataContext);
  if (!context) {
    throw new Error('useHospitalData must be used within a HospitalDataProvider');
  }
  return context;
};
