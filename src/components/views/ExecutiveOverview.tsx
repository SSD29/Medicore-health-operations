import React from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bed,
  Calendar,
  Clock,
  Coins,
  DollarSign,
  FileSpreadsheet,
  FlaskConical,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import {
  getBedOccupancyByWard,
  getDiagnosticTatByTestType,
  getLengthOfStayByDepartment,
  getMonthlyBillingTrend,
  getMonthlyVolumeTrend,
  getNoShowRateByDepartment,
  getVolumeByDepartment,
  getWaitingTimeByDepartment,
} from '../../data/analyticsCalculations';
import { DeterministicInsights } from '../DeterministicInsights';
import { KpiCard } from '../KpiCard';

export const ExecutiveOverview: React.FC = () => {
  const { filteredRecords, kpis, hospitalBenchmarkKpis, exportToCsv } = useHospitalData();

  // Prepare chart datasets dynamically from current filtered records
  const monthlyVolumeData = getMonthlyVolumeTrend(filteredRecords);
  const waitingTimeByDeptData = getWaitingTimeByDepartment(filteredRecords, hospitalBenchmarkKpis.avgWaitingTime);
  const volumeByDeptData = getVolumeByDepartment(filteredRecords);
  const noShowByDeptData = getNoShowRateByDepartment(filteredRecords);
  const diagnosticTatData = getDiagnosticTatByTestType(filteredRecords);
  const bedOccupancyData = getBedOccupancyByWard(filteredRecords);
  const lengthOfStayData = getLengthOfStayByDepartment(filteredRecords);
  const billingTrendData = getMonthlyBillingTrend(filteredRecords);

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
    borderRadius: '0.5rem',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Operations Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational telemetry, patient throughput, resource constraints, and hospital financial health across departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            Active Dataset: <strong className="text-slate-800 font-semibold">{filteredRecords.length.toLocaleString()}</strong> visits
          </span>
        </div>
      </div>

      {/* TOP KPI CARDS (7 required) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* 1. Total Visits */}
        <KpiCard
          id="kpi-total-visits"
          title="Total Visits"
          value={kpis.totalVisits.toLocaleString()}
          subtitle={`${kpis.completedVisits.toLocaleString()} completed`}
          benchmarkText="6-Month Influx"
          benchmarkStatus="neutral"
          icon={Users}
          accentColor="blue"
        />

        {/* 2. Average Waiting Time */}
        <KpiCard
          id="kpi-avg-waiting"
          title="Avg Waiting Time"
          value={`${kpis.avgWaitingTime} m`}
          subtitle="From arrival to consult"
          benchmarkText={
            kpis.avgWaitingTime > hospitalBenchmarkKpis.avgWaitingTime
              ? `+${(kpis.avgWaitingTime - hospitalBenchmarkKpis.avgWaitingTime).toFixed(1)}m vs overall`
              : `${(kpis.avgWaitingTime - hospitalBenchmarkKpis.avgWaitingTime).toFixed(1)}m vs overall`
          }
          benchmarkStatus={kpis.avgWaitingTime > 40 ? 'negative' : 'positive'}
          icon={Clock}
          accentColor="teal"
        />

        {/* 3. Bed Occupancy */}
        <KpiCard
          id="kpi-bed-occupancy"
          title="Bed Occupancy"
          value={`${kpis.bedOccupancy}%`}
          subtitle="Hospital inpatient beds"
          benchmarkText={kpis.bedOccupancy >= 85 ? 'High Cap Warning' : 'Optimal Capacity'}
          benchmarkStatus={kpis.bedOccupancy >= 85 ? 'warning' : 'positive'}
          icon={Bed}
          accentColor={kpis.bedOccupancy >= 85 ? 'amber' : 'emerald'}
        />

        {/* 4. No-show Rate */}
        <KpiCard
          id="kpi-noshow-rate"
          title="No-show Rate"
          value={`${kpis.noShowRate}%`}
          subtitle="Scheduled appts missed"
          benchmarkText="Benchmark: <15%"
          benchmarkStatus={kpis.noShowRate > 15 ? 'negative' : 'positive'}
          icon={UserX}
          accentColor="rose"
        />

        {/* 5. Average Diagnostic TAT */}
        <KpiCard
          id="kpi-diagnostic-tat"
          title="Avg Diagnostic TAT"
          value={`${kpis.avgDiagnosticTat} h`}
          subtitle="Order to result released"
          benchmarkText="Target: <5.0h"
          benchmarkStatus={kpis.avgDiagnosticTat > 5.5 ? 'warning' : 'positive'}
          icon={FlaskConical}
          accentColor="purple"
        />

        {/* 6. Average Length of Stay */}
        <KpiCard
          id="kpi-avg-los"
          title="Avg Length of Stay"
          value={`${kpis.avgLengthOfStay} d`}
          subtitle="Admitted patients"
          benchmarkText={`${kpis.admissionRate}% Admission Rate`}
          benchmarkStatus="neutral"
          icon={Calendar}
          accentColor="indigo"
        />

        {/* 7. Total Billing */}
        <KpiCard
          id="kpi-total-billing"
          title="Total Billing"
          value={`$${(kpis.totalBilling / 1000000).toFixed(2)}M`}
          subtitle={`$${(kpis.totalOutstanding / 1000).toFixed(0)}k Outstanding`}
          benchmarkText={`${Math.round((kpis.totalClaimAmount / (kpis.totalBilling || 1)) * 100)}% Claim Realized`}
          benchmarkStatus="positive"
          icon={DollarSign}
          accentColor="emerald"
        />
      </div>

      {/* DETERMINISTIC INSIGHTS BANNER */}
      <DeterministicInsights />

      {/* 8 INTERACTIVE VISUALIZATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 1: Patient Volume Trend Over Six Months */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Patient Volume Trend (6 Months)</h3>
              <p className="text-xs text-slate-500">Monthly patient visit trajectory across OPD, Emergency, and Follow-ups</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Pattern A: Seasonal Wave
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyVolumeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="OPD" stackId="1" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.7} />
                <Area type="monotone" dataKey="FollowUp" name="Follow-up" stackId="1" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.7} />
                <Area type="monotone" dataKey="Emergency" stackId="1" stroke="#ea580c" fill="#f97316" fillOpacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 2: Average Waiting Time by Department */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Average Waiting Time by Department</h3>
              <p className="text-xs text-slate-500">Minutes from patient registration arrival to consultation start</p>
            </div>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Ref Avg: {hospitalBenchmarkKpis.avgWaitingTime}m
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waitingTimeByDeptData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'dataMax + 10']} />
                <YAxis dataKey="shortName" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={68} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`${val} minutes`, 'Avg Wait']}
                />
                <ReferenceLine x={hospitalBenchmarkKpis.avgWaitingTime} stroke="#0d9488" strokeDasharray="3 3" label={{ value: 'Hospital Avg', position: 'top', fill: '#0d9488', fontSize: 10 }} />
                <Bar dataKey="avgWait" radius={[0, 4, 4, 0]}>
                  {waitingTimeByDeptData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.avgWait > 42 ? '#ef4444' : entry.avgWait > 35 ? '#f59e0b' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 3: Patient Volume by Department */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">3. Patient Volume by Department</h3>
              <p className="text-xs text-slate-500">Distribution of patient encounters across all 8 hospital clinics</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Total: {filteredRecords.length.toLocaleString()}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByDeptData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [`${val.toLocaleString()} visits (${item.payload.percentage}%)`, 'Volume']}
                />
                <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 4: No-show Rate by Department */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">4. No-show Rate by Department</h3>
              <p className="text-xs text-slate-500">Percentage of scheduled appointments not attended (Pattern C)</p>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Target: &lt;12%
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={noShowByDeptData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `${val}% (${item.payload.noShowCount} of ${item.payload.scheduledVisits} scheduled)`,
                    'No-show Rate',
                  ]}
                />
                <ReferenceLine y={12} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target 12%', position: 'top', fill: '#10b981', fontSize: 10 }} />
                <Bar dataKey="noShowRate" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  {noShowByDeptData.map((entry, idx) => (
                    <Cell
                      key={`noshow-${idx}`}
                      fill={entry.noShowRate > 15 ? '#e11d48' : entry.noShowRate > 12 ? '#fb7185' : '#fda4af'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 5: Diagnostic TAT by Test Type */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">5. Diagnostic Turnaround Time by Test</h3>
              <p className="text-xs text-slate-500">Average laboratory & radiology processing time in hours (Pattern D)</p>
            </div>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Bottleneck Monitor
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagnosticTatData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="testType" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, name?: any) => [
                    `${val} hrs`,
                    name === 'avgTat' ? 'Actual Avg TAT' : 'Clinical Benchmark',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="avgTat" name="Actual Avg TAT (hrs)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="targetTat" name="Standard Target (hrs)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 6: Bed Occupancy by Ward */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">6. Bed Occupancy by Inpatient Ward</h3>
              <p className="text-xs text-slate-500">Capacity utilization across General, Private, and ICU wards (Pattern E)</p>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Capacity Warning: 85%
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedOccupancyData} margin={{ top: 10, right: 20, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ward" tick={{ fontSize: 11, fill: '#334155' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `${val}% occupancy (${item.payload.delayRate}% discharge delay rate)`,
                    'Bed Occupancy',
                  ]}
                />
                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical 85%', position: 'top', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="occupancyPct" radius={[4, 4, 0, 0]}>
                  {bedOccupancyData.map((entry, idx) => (
                    <Cell
                      key={`occ-${idx}`}
                      fill={entry.occupancyPct >= 85 ? '#ef4444' : entry.occupancyPct >= 78 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 7: Average Length of Stay by Department */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">7. Average Length of Stay (LOS) by Department</h3>
              <p className="text-xs text-slate-500">Mean inpatient hospitalization duration for admitted patients</p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Inpatient Utilization
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengthOfStayData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="d" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `${val} days (${item.payload.admissions} total admissions)`,
                    'Avg Length of Stay',
                  ]}
                />
                <Bar dataKey="avgLosDays" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 8: Monthly Billing Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">8. Monthly Billing & Revenue Trend</h3>
              <p className="text-xs text-slate-500">Gross billing, insurance reimbursements claimed, and outstanding balances</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Pattern F: Financial Health
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={billingTrendData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="totalBilled" name="Total Billed" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="insuranceClaimed" name="Claim Amount" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#e11d48" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="pt-2 pb-2 text-center">
        <p className="text-xs text-slate-400">
          Demo application | All hospital data is synthetic and created for demonstration purposes. Not intended for clinical decision-making or use with real patient data.
        </p>
      </div>
    </div>
  );
};
