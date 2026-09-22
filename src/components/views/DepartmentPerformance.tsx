import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FlaskConical,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHospitalData } from '../../context/HospitalDataContext';
import { DEPARTMENT_CONFIG, DEPARTMENTS, DOCTORS } from '../../data/hospitalMetadata';
import { DepartmentName } from '../../types';

export const DepartmentPerformance: React.FC = () => {
  const { filteredRecords, hospitalBenchmarkKpis, allRecords } = useHospitalData();
  const [selectedDept, setSelectedDept] = useState<DepartmentName>('General Medicine');

  // Filter records specifically for this department
  const deptRecords = useMemo(
    () => filteredRecords.filter((r) => r.department === selectedDept),
    [filteredRecords, selectedDept]
  );

  // Department metrics calculation
  const deptStats = useMemo(() => {
    const total = deptRecords.length;
    if (total === 0) {
      return {
        volume: 0,
        pctOfHospital: 0,
        avgWait: 0,
        noShowRate: 0,
        avgDiagnosticTat: 0,
        admissionRate: 0,
        avgLos: 0,
        avgBilling: 0,
        bedOccupancy: 0,
        scheduledCount: 0,
        noShowCount: 0,
        diagnosticCount: 0,
        admittedCount: 0,
      };
    }

    let totalWait = 0;
    let waitCount = 0;
    let scheduledCount = 0;
    let noShowCount = 0;
    let totalTat = 0;
    let tatCount = 0;
    let admittedCount = 0;
    let totalLos = 0;
    let losCount = 0;
    let totalBilling = 0;
    let totalOcc = 0;
    let occCount = 0;

    deptRecords.forEach((r) => {
      if (r.waiting_time_minutes !== null) {
        totalWait += r.waiting_time_minutes;
        waitCount++;
      }
      if (r.appointment_type === 'Scheduled') {
        scheduledCount++;
        if (r.no_show) noShowCount++;
      }
      if (r.diagnostic_test_ordered && r.diagnostic_tat_hours !== null) {
        totalTat += r.diagnostic_tat_hours;
        tatCount++;
      }
      if (r.admission) {
        admittedCount++;
        if (r.length_of_stay_days !== null) {
          totalLos += r.length_of_stay_days;
          losCount++;
        }
        if (r.bed_occupancy_pct_at_admission !== null) {
          totalOcc += r.bed_occupancy_pct_at_admission;
          occCount++;
        }
      }
      totalBilling += r.billing_amount;
    });

    const pctOfHospital =
      filteredRecords.length > 0 ? parseFloat(((total / filteredRecords.length) * 100).toFixed(1)) : 0;

    return {
      volume: total,
      pctOfHospital,
      avgWait: waitCount > 0 ? parseFloat((totalWait / waitCount).toFixed(1)) : 0,
      noShowRate: scheduledCount > 0 ? parseFloat(((noShowCount / scheduledCount) * 100).toFixed(1)) : 0,
      avgDiagnosticTat: tatCount > 0 ? parseFloat((totalTat / tatCount).toFixed(1)) : 0,
      admissionRate: total > 0 ? parseFloat(((admittedCount / total) * 100).toFixed(1)) : 0,
      avgLos: losCount > 0 ? parseFloat((totalLos / losCount).toFixed(1)) : 0,
      avgBilling: total > 0 ? Math.round(totalBilling / total) : 0,
      bedOccupancy: occCount > 0 ? parseFloat((totalOcc / occCount).toFixed(1)) : 0,
      scheduledCount,
      noShowCount,
      diagnosticCount: tatCount,
      admittedCount,
    };
  }, [deptRecords, filteredRecords]);

  // Doctors in this department
  const deptDoctors = useMemo(() => {
    const docs = DOCTORS.filter((d) => d.department === selectedDept);
    return docs.map((doc) => {
      const docVisits = deptRecords.filter((r) => r.doctor_id === doc.id);
      let totalWait = 0;
      let waitCount = 0;
      let availableCount = 0;
      let totalStaffPct = 0;

      docVisits.forEach((r) => {
        if (r.waiting_time_minutes !== null) {
          totalWait += r.waiting_time_minutes;
          waitCount++;
        }
        if (r.doctor_available) availableCount++;
        totalStaffPct += r.staff_availability_pct;
      });

      return {
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        visitsSeen: docVisits.length,
        avgWait: waitCount > 0 ? parseFloat((totalWait / waitCount).toFixed(1)) : 0,
        availabilityPct: docVisits.length > 0 ? Math.round((availableCount / docVisits.length) * 100) : 100,
        avgStaffPct: docVisits.length > 0 ? Math.round(totalStaffPct / docVisits.length) : 85,
      };
    });
  }, [selectedDept, deptRecords]);

  // Diagnostic tests breakdown
  const diagnosticBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    deptRecords.forEach((r) => {
      if (r.diagnostic_test_ordered && r.diagnostic_test_type) {
        map[r.diagnostic_test_type] = (map[r.diagnostic_test_type] || 0) + 1;
      }
    });
    return Object.entries(map).map(([test, count]) => ({
      name: test,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [deptRecords]);

  // Ward distribution
  const wardBreakdown = useMemo(() => {
    const map: Record<string, number> = { 'General Ward': 0, 'Private Ward': 0, ICU: 0 };
    deptRecords.forEach((r) => {
      if (r.admission && r.ward) {
        map[r.ward] = (map[r.ward] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [deptRecords]);

  // Metric Comparison Helper
  const renderComparison = (
    label: string,
    deptVal: number | string,
    hospVal: number | string,
    unit: string = '',
    lowerIsBetter: boolean = false
  ) => {
    const numDept = typeof deptVal === 'number' ? deptVal : parseFloat(deptVal);
    const numHosp = typeof hospVal === 'number' ? hospVal : parseFloat(hospVal);
    const diff = parseFloat((numDept - numHosp).toFixed(1));
    const isDifferent = Math.abs(diff) > 0.1;

    let isPositive = false;
    if (lowerIsBetter) {
      isPositive = diff < 0;
    } else {
      isPositive = diff > 0;
    }

    return (
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className="text-xl font-bold text-slate-900">
          {deptVal}
          {unit}
        </div>
        <div className="pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Hospital Avg: {hospVal}{unit}</span>
          {isDifferent && (
            <span
              className={`font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {diff > 0 ? `+${diff}` : `${diff}`}
              {unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
    borderRadius: '0.5rem',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header & Department Selector */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
                Departmental Deep-Dive
              </span>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                Active Filter Slicing
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {selectedDept} Operational Performance
            </h2>
            <p className="text-xs text-slate-500">
              Benchmarking patient flow, wait times, diagnostic utilization, and inpatient beds against hospital-wide standards.
            </p>
          </div>

          {/* Department Selection Pills / Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-semibold text-slate-600">Select Department:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as DepartmentName)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Department Quick Buttons */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100">
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedDept === d
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* DEPARTMENT PERFORMANCE METRICS WITH COMPARISON AGAINST HOSPITAL AVERAGE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">
            Performance Scorecard vs Hospital-Wide Average
          </h3>
          <span className="text-xs text-slate-400">
            Hospital Baseline: {hospitalBenchmarkKpis.totalVisits.toLocaleString()} Total Encounters
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* 1. Patient Volume */}
          {renderComparison(
            'Patient Volume',
            deptStats.volume.toLocaleString(),
            Math.round(hospitalBenchmarkKpis.totalVisits / 8).toLocaleString(),
            '',
            false
          )}

          {/* 2. Avg Waiting Time */}
          {renderComparison(
            'Avg Waiting Time',
            deptStats.avgWait,
            hospitalBenchmarkKpis.avgWaitingTime,
            'm',
            true // lower is better
          )}

          {/* 3. No-show Rate */}
          {renderComparison(
            'No-show Rate',
            deptStats.noShowRate,
            hospitalBenchmarkKpis.noShowRate,
            '%',
            true // lower is better
          )}

          {/* 4. Avg Diagnostic TAT */}
          {renderComparison(
            'Diagnostic TAT',
            deptStats.avgDiagnosticTat,
            hospitalBenchmarkKpis.avgDiagnosticTat,
            'h',
            true // lower is better
          )}

          {/* 5. Admission Rate */}
          {renderComparison(
            'Admission Rate',
            deptStats.admissionRate,
            hospitalBenchmarkKpis.admissionRate,
            '%',
            false
          )}

          {/* 6. Avg Length of Stay */}
          {renderComparison(
            'Avg Length of Stay',
            deptStats.avgLos,
            hospitalBenchmarkKpis.avgLengthOfStay,
            'd',
            true // lower is better
          )}

          {/* 7. Avg Billing */}
          {renderComparison(
            'Average Billing',
            `$${deptStats.avgBilling.toLocaleString()}`,
            `$${Math.round(hospitalBenchmarkKpis.totalBilling / (hospitalBenchmarkKpis.totalVisits || 1)).toLocaleString()}`,
            '',
            false
          )}

          {/* 8. Bed Occupancy */}
          {renderComparison(
            'Bed Occupancy',
            deptStats.admittedCount > 0 ? deptStats.bedOccupancy : 'N/A',
            hospitalBenchmarkKpis.bedOccupancy,
            deptStats.admittedCount > 0 ? '%' : '',
            true // lower is safer
          )}
        </div>
      </div>

      {/* DOCTORS ROSTER PERFORMANCE & CLINICAL WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Roster Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Department Physician Roster</h3>
              <p className="text-xs text-slate-500">
                Workload allocation, average patient wait times, and roster availability (Pattern B)
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {deptDoctors.length} Attending Physicians
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Physician</th>
                  <th className="py-2.5 px-3">Subspecialty</th>
                  <th className="py-2.5 px-3 text-right">Patients Seen</th>
                  <th className="py-2.5 px-3 text-right">Avg Wait Time</th>
                  <th className="py-2.5 px-3 text-right">Doctor Availability</th>
                  <th className="py-2.5 px-3 text-right">Staff Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {doc.name}
                      <span className="block text-[10px] font-normal text-slate-400 font-mono">
                        {doc.id}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{doc.specialty}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {doc.visitsSeen.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-semibold ${
                          doc.avgWait > 42 ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {doc.avgWait} mins
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                          doc.availabilityPct >= 90
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {doc.availabilityPct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {doc.avgStaffPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diagnostics & Inpatient Ward Breakdown */}
        <div className="space-y-6">
          {/* Diagnostic Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Diagnostic Tests Ordered</h3>
            <p className="text-xs text-slate-500 mb-3">
              Distribution of diagnostic lab & imaging orders for {selectedDept}
            </p>

            {diagnosticBreakdown.length > 0 ? (
              <div className="space-y-2">
                {diagnosticBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.name}</span>
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      {item.count.toLocaleString()} orders
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-4">No diagnostic tests recorded.</div>
            )}
          </div>

          {/* Inpatient Ward Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Inpatient Ward Placements</h3>
            <p className="text-xs text-slate-500 mb-3">
              Ward destinations for admitted {selectedDept} patients
            </p>
            <div className="space-y-2">
              {wardBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{item.name}</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {item.value.toLocaleString()} patients
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
