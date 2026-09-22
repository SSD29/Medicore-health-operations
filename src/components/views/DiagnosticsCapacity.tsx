import React, { useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bed,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Layers,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHospitalData } from '../../context/HospitalDataContext';
import { DIAGNOSTIC_TESTS, WARDS } from '../../data/hospitalMetadata';
import { DiagnosticTestType, WardType } from '../../types';

export const DiagnosticsCapacity: React.FC = () => {
  const { filteredRecords } = useHospitalData();

  // 1. Diagnostic test breakdown (Volume, Avg TAT, Same day %)
  const testDiagnosticsData = useMemo(() => {
    const map: Record<
      DiagnosticTestType,
      { totalTat: number; count: number; sameDayCount: number }
    > = {} as any;
    DIAGNOSTIC_TESTS.forEach((t) => (map[t] = { totalTat: 0, count: 0, sameDayCount: 0 }));

    filteredRecords.forEach((r) => {
      if (r.diagnostic_test_ordered && r.diagnostic_test_type && r.diagnostic_tat_hours !== null) {
        map[r.diagnostic_test_type].totalTat += r.diagnostic_tat_hours;
        map[r.diagnostic_test_type].count++;
        if (r.result_same_day) {
          map[r.diagnostic_test_type].sameDayCount++;
        }
      }
    });

    return DIAGNOSTIC_TESTS.map((test) => {
      const s = map[test];
      const avgTat = s.count > 0 ? parseFloat((s.totalTat / s.count).toFixed(1)) : 0;
      const sameDayPct = s.count > 0 ? parseFloat(((s.sameDayCount / s.count) * 100).toFixed(1)) : 0;
      return {
        test,
        volume: s.count,
        avgTatHours: avgTat,
        sameDayPct,
      };
    }).sort((a, b) => b.volume - a.volume);
  }, [filteredRecords]);

  // 2. Bed Occupancy & Discharge Delay Correlation (Pattern E)
  // Group admissions by bed occupancy bracket: <75%, 75-84%, 85%+
  const occupancyDelayCorrelation = useMemo(() => {
    const brackets = [
      { label: '< 75% Capacity (Optimal)', min: 0, max: 74.9, total: 0, delayed: 0 },
      { label: '75% - 84% Capacity (Elevated)', min: 75, max: 84.9, total: 0, delayed: 0 },
      { label: '85%+ Capacity (Critical Surge)', min: 85, max: 100, total: 0, delayed: 0 },
    ];

    filteredRecords.forEach((r) => {
      if (r.admission && r.bed_occupancy_pct_at_admission !== null) {
        const occ = r.bed_occupancy_pct_at_admission;
        for (const b of brackets) {
          if (occ >= b.min && occ <= b.max) {
            b.total++;
            if (r.discharge_delay) b.delayed++;
            break;
          }
        }
      }
    });

    return brackets.map((b) => ({
      bracket: b.label,
      totalAdmissions: b.total,
      delayedCount: b.delayed,
      delayRatePct: b.total > 0 ? parseFloat(((b.delayed / b.total) * 100).toFixed(1)) : 0,
    }));
  }, [filteredRecords]);

  // 3. Ward capacity & LOS performance
  const wardPerformance = useMemo(() => {
    const map: Record<
      WardType,
      { totalOcc: number; occCount: number; totalLos: number; losCount: number; admissions: number; delays: number }
    > = {
      'General Ward': { totalOcc: 0, occCount: 0, totalLos: 0, losCount: 0, admissions: 0, delays: 0 },
      'Private Ward': { totalOcc: 0, occCount: 0, totalLos: 0, losCount: 0, admissions: 0, delays: 0 },
      ICU: { totalOcc: 0, occCount: 0, totalLos: 0, losCount: 0, admissions: 0, delays: 0 },
    };

    filteredRecords.forEach((r) => {
      if (r.admission && r.ward) {
        const w = map[r.ward];
        w.admissions++;
        if (r.bed_occupancy_pct_at_admission !== null) {
          w.totalOcc += r.bed_occupancy_pct_at_admission;
          w.occCount++;
        }
        if (r.length_of_stay_days !== null) {
          w.totalLos += r.length_of_stay_days;
          w.losCount++;
        }
        if (r.discharge_delay) {
          w.delays++;
        }
      }
    });

    return WARDS.map((w) => {
      const s = map[w];
      const avgOcc = s.occCount > 0 ? parseFloat((s.totalOcc / s.occCount).toFixed(1)) : 0;
      const avgLos = s.losCount > 0 ? parseFloat((s.totalLos / s.losCount).toFixed(1)) : 0;
      const delayRate = s.admissions > 0 ? parseFloat(((s.delays / s.admissions) * 100).toFixed(1)) : 0;
      return {
        ward: w,
        admissions: s.admissions,
        avgOccupancy: avgOcc,
        avgLosDays: avgLos,
        delayRatePct: delayRate,
        status: avgOcc >= 85 ? 'Critical Warning' : avgOcc >= 78 ? 'Moderate' : 'Stable',
      };
    });
  }, [filteredRecords]);

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
    borderRadius: '0.5rem',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Diagnostics & Inpatient Capacity Management
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitoring laboratory throughput bottlenecks, radiology diagnostic turnaround, ward bed occupancy limits, and discharge delays.
        </p>
      </div>

      {/* CALLOUT CARDS FOR CAPACITY & DELAYS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {wardPerformance.map((w) => (
          <div
            key={w.ward}
            className={`bg-white rounded-xl border p-4 shadow-xs relative overflow-hidden ${
              w.avgOccupancy >= 85 ? 'border-amber-300' : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {w.ward}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  w.avgOccupancy >= 85
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {w.status}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-slate-900">{w.avgOccupancy}%</span>
              <span className="text-xs text-slate-500">Mean Occupancy</span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${
                  w.avgOccupancy >= 85 ? 'bg-rose-500' : w.avgOccupancy >= 78 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${w.avgOccupancy}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block">Mean LOS:</span>
                <span className="font-semibold text-slate-800">{w.avgLosDays} days</span>
              </div>
              <div>
                <span className="text-slate-400 block">Discharge Delay:</span>
                <span className="font-semibold text-rose-600">{w.delayRatePct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DIAGNOSTIC PERFORMANCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Turnaround Times & Workloads */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Diagnostic Test Turnaround Time (TAT)</h3>
              <p className="text-xs text-slate-500">
                Average hours from doctor lab order to validated clinical result release
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Pattern D: Lab Delays
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testDiagnosticsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="test" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `${val} hrs (${item.payload.volume.toLocaleString()} tests ordered)`,
                    'Avg TAT',
                  ]}
                />
                <Bar dataKey="avgTatHours" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {testDiagnosticsData.map((entry, idx) => (
                    <Cell
                      key={`tat-${idx}`}
                      fill={entry.avgTatHours > 8 ? '#7c3aed' : entry.avgTatHours > 4 ? '#a78bfa' : '#c4b5fd'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pattern E: Bed Occupancy vs Discharge Delay Correlation */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Bed Occupancy vs Discharge Delay Rate</h3>
              <p className="text-xs text-slate-500">
                Evaluating correlation between high occupancy (&gt;85%) and patient discharge delays (Pattern E)
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Pattern E: Discharge Lag
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyDelayCorrelation} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bracket" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `${val}% delay rate (${item.payload.delayedCount} of ${item.payload.totalAdmissions} admissions)`,
                    'Discharge Delays',
                  ]}
                />
                <Bar dataKey="delayRatePct" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {occupancyDelayCorrelation.map((entry, idx) => (
                    <Cell
                      key={`delay-${idx}`}
                      fill={idx === 2 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <strong>Key Operational Correlation:</strong> When inpatient wards operate at or above 85% bed capacity, the rate of discharge delays triples due to step-down ward transfer bottlenecks, late pharmacy reconciliations, and transport delays.
          </div>
        </div>
      </div>
    </div>
  );
};
