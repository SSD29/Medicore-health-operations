import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHospitalData } from '../../context/HospitalDataContext';

export const PatientFlow: React.FC = () => {
  const { filteredRecords } = useHospitalData();

  // 1. Hourly arrival distribution & wait time profile (08:00 to 18:00)
  const hourlyFlowData = useMemo(() => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const map: Record<string, { hour: string; arrivals: number; totalWait: number; waitCount: number }> = {};
    hours.forEach((h) => (map[h] = { hour: h, arrivals: 0, totalWait: 0, waitCount: 0 }));

    filteredRecords.forEach((r) => {
      const hStr = r.arrival_time.slice(0, 2) + ':00';
      if (map[hStr]) {
        map[hStr].arrivals++;
        if (r.waiting_time_minutes !== null) {
          map[hStr].totalWait += r.waiting_time_minutes;
          map[hStr].waitCount++;
        }
      }
    });

    return hours.map((h) => {
      const s = map[h];
      const avgWait = s.waitCount > 0 ? parseFloat((s.totalWait / s.waitCount).toFixed(1)) : 0;
      return {
        hour: h,
        arrivals: s.arrivals,
        avgWaitMinutes: avgWait,
      };
    });
  }, [filteredRecords]);

  // 2. Doctor Availability impact on wait time (Pattern B)
  const doctorAvailImpactData = useMemo(() => {
    let availWaitTotal = 0;
    let availCount = 0;
    let unavailWaitTotal = 0;
    let unavailCount = 0;

    filteredRecords.forEach((r) => {
      if (r.waiting_time_minutes !== null) {
        if (r.doctor_available) {
          availWaitTotal += r.waiting_time_minutes;
          availCount++;
        } else {
          unavailWaitTotal += r.waiting_time_minutes;
          unavailCount++;
        }
      }
    });

    const availAvg = availCount > 0 ? parseFloat((availWaitTotal / availCount).toFixed(1)) : 0;
    const unavailAvg = unavailCount > 0 ? parseFloat((unavailWaitTotal / unavailCount).toFixed(1)) : 0;

    return [
      {
        status: 'Doctor On-Duty / Standard Coverage',
        avgWait: availAvg,
        count: availCount,
        fill: '#10b981',
      },
      {
        status: 'Doctor Absent / Reduced Coverage',
        avgWait: unavailAvg,
        count: unavailCount,
        fill: '#ef4444',
      },
    ];
  }, [filteredRecords]);

  // 3. Appointment Type Analysis (Scheduled vs Walk-in)
  const appointmentTypeFlow = useMemo(() => {
    let schedWaitTotal = 0;
    let schedWaitCount = 0;
    let schedTotal = 0;
    let schedNoShow = 0;

    let walkWaitTotal = 0;
    let walkWaitCount = 0;
    let walkTotal = 0;

    filteredRecords.forEach((r) => {
      if (r.appointment_type === 'Scheduled') {
        schedTotal++;
        if (r.no_show) schedNoShow++;
        if (r.waiting_time_minutes !== null) {
          schedWaitTotal += r.waiting_time_minutes;
          schedWaitCount++;
        }
      } else {
        walkTotal++;
        if (r.waiting_time_minutes !== null) {
          walkWaitTotal += r.waiting_time_minutes;
          walkWaitCount++;
        }
      }
    });

    return {
      scheduled: {
        total: schedTotal,
        avgWait: schedWaitCount > 0 ? parseFloat((schedWaitTotal / schedWaitCount).toFixed(1)) : 0,
        noShowRate: schedTotal > 0 ? parseFloat(((schedNoShow / schedTotal) * 100).toFixed(1)) : 0,
      },
      walkIn: {
        total: walkTotal,
        avgWait: walkWaitCount > 0 ? parseFloat((walkWaitTotal / walkWaitCount).toFixed(1)) : 0,
        noShowRate: 0, // walk-ins never no-show
      },
    };
  }, [filteredRecords]);

  // 4. Day of Week Patient Volume and Waiting Time
  const dayOfWeekFlow = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const map: Record<string, { day: string; volume: number; totalWait: number; count: number }> = {};
    days.forEach((d) => (map[d] = { day: d, volume: 0, totalWait: 0, count: 0 }));

    filteredRecords.forEach((r) => {
      if (map[r.day_of_week]) {
        map[r.day_of_week].volume++;
        if (r.waiting_time_minutes !== null) {
          map[r.day_of_week].totalWait += r.waiting_time_minutes;
          map[r.day_of_week].count++;
        }
      }
    });

    return days.map((d) => {
      const s = map[d];
      return {
        day: d.slice(0, 3),
        fullDay: d,
        volume: s.volume,
        avgWait: s.count > 0 ? parseFloat((s.totalWait / s.count).toFixed(1)) : 0,
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
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Patient Flow & Operational Waiting Time Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluating clinic throughput bottlenecks, arrival surges, doctor availability constraints, and appointment scheduling friction.
        </p>
      </div>

      {/* OPERATIONAL SUMMARY CALLOUTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Scheduled vs Walk-in Wait Disparity</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold text-slate-900">
                {appointmentTypeFlow.scheduled.avgWait}m
              </span>
              <span className="text-xs text-slate-500 block">Scheduled Avg Wait</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-rose-600">
                {appointmentTypeFlow.walkIn.avgWait}m
              </span>
              <span className="text-xs text-slate-500 block">Walk-in Avg Wait</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Walk-in patients encounter an average{' '}
            <strong className="text-slate-800">
              {(appointmentTypeFlow.walkIn.avgWait - appointmentTypeFlow.scheduled.avgWait).toFixed(1)}m longer
            </strong>{' '}
            delay before seeing an attending physician.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Doctor Coverage Impact (Pattern B)</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold text-emerald-600">
                {doctorAvailImpactData[0].avgWait}m
              </span>
              <span className="text-xs text-slate-500 block">Full Coverage Wait</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-rose-600">
                {doctorAvailImpactData[1].avgWait}m
              </span>
              <span className="text-xs text-slate-500 block">Staff Shortage Wait</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Staff shortages and physician unavailability amplify waiting times by{' '}
            <strong className="text-rose-600">
              +{((doctorAvailImpactData[1].avgWait / (doctorAvailImpactData[0].avgWait || 1) - 1) * 100).toFixed(0)}%
            </strong>.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <UserX className="w-4 h-4 text-rose-600" />
            <span>Scheduled No-Show Loss</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {appointmentTypeFlow.scheduled.noShowRate}%
            </div>
            <span className="text-xs text-slate-500 block">
              Missed clinic slots ({appointmentTypeFlow.scheduled.total.toLocaleString()} total scheduled)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Non-attendance leaves idle clinical hours and prevents early slot reallocation for waitlisted patients.
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Flow and Waiting Time Profile */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hourly Patient Influx & Wait Time Profile</h3>
              <p className="text-xs text-slate-500">
                Peak registration rushes at 09:00–11:00 and 14:00 cause acute clinic congestion
              </p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Pattern A: Rush Hours
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#e11d48' }} unit="m" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="arrivals" name="Patient Volume" fill="#93c5fd" />
                <Line yAxisId="right" type="monotone" dataKey="avgWaitMinutes" name="Avg Wait (mins)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week Congestion Profile */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Day-of-Week Volume & Wait Time Dynamics</h3>
              <p className="text-xs text-slate-500">
                Monday and Tuesday handle &gt;45% of outpatient weekly encounters with highest wait times
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Weekly Cyclic Peak
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekFlow} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, name?: any) => [
                    name === 'volume' ? `${val.toLocaleString()} visits` : `${val} mins`,
                    name === 'volume' ? 'Encounters' : 'Avg Wait Time',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="volume" name="Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgWait" name="Avg Wait (mins)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
