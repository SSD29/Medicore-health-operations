import React from 'react';
import {
  Activity,
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  FlaskConical,
  Shield,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useHospitalData } from '../context/HospitalDataContext';

export const RecordDetailModal: React.FC = () => {
  const { selectedRecord, setSelectedRecord } = useHospitalData();

  if (!selectedRecord) return null;

  const r = selectedRecord;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-teal-400 font-bold">
                  Patient Encounter Record
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {r.visit_id}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                {r.department} • {r.visit_type} Visit
              </h2>
            </div>
          </div>
          <button
            onClick={() => setSelectedRecord(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm text-slate-700 max-h-[78vh] overflow-y-auto">
          {/* Section 1: Demographics & Visit */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Patient & Demographics</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[11px] text-slate-500 block">Patient Age</span>
                <span className="font-semibold text-slate-800">
                  {r.patient_age} yrs ({r.age_group})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Gender</span>
                <span className="font-semibold text-slate-800">{r.gender}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Visit Date</span>
                <span className="font-semibold text-slate-800">
                  {r.visit_date} ({r.day_of_week})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Insurance</span>
                <span className="font-semibold text-slate-800">{r.insurance_type}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Operational Flow */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Operations & Consultation Timing</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[11px] text-slate-500 block">Appointment Type</span>
                <span className="font-semibold text-slate-800">{r.appointment_type}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Scheduled Time</span>
                <span className="font-semibold text-slate-800">
                  {r.appointment_time ? r.appointment_time : 'Walk-in / None'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Arrival Time</span>
                <span className="font-semibold text-slate-800">{r.arrival_time}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Consultation Start</span>
                <span className="font-semibold text-slate-800">
                  {r.consultation_start_time || 'No Consultation'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Waiting Time</span>
                <span
                  className={`font-semibold ${
                    r.waiting_time_minutes !== null && r.waiting_time_minutes > 45
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {r.waiting_time_minutes !== null ? `${r.waiting_time_minutes} minutes` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Consultation Duration</span>
                <span className="font-semibold text-slate-800">
                  {r.consultation_duration_minutes !== null
                    ? `${r.consultation_duration_minutes} minutes`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Attending Physician</span>
                <span className="font-semibold text-slate-800">{r.doctor_name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Encounter Status</span>
                {r.no_show ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                    No-Show
                  </span>
                ) : r.cancellation ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                    Cancelled
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostics & Inpatient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Diagnostics */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                <span>Diagnostic Services</span>
              </h3>
              {r.diagnostic_test_ordered ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Test Ordered:</span>
                    <span className="font-semibold text-slate-800">{r.diagnostic_test_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Turnaround Time (TAT):</span>
                    <span className="font-semibold text-purple-700">{r.diagnostic_tat_hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Same-Day Result:</span>
                    <span
                      className={`font-semibold ${r.result_same_day ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {r.result_same_day ? 'Yes' : 'No (Delayed)'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">No diagnostic test was ordered.</div>
              )}
            </div>

            {/* Inpatient Admission */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-blue-600" />
                <span>Inpatient Ward & Bed</span>
              </h3>
              {r.admission ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Ward:</span>
                    <span className="font-semibold text-blue-700">{r.ward}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Length of Stay (LOS):</span>
                    <span className="font-semibold text-slate-800">{r.length_of_stay_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ward Occupancy at Adm.:</span>
                    <span className="font-semibold text-slate-800">{r.bed_occupancy_pct_at_admission}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discharge Delay:</span>
                    <span
                      className={`font-semibold ${r.discharge_delay ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {r.discharge_delay ? 'Delay Occurred' : 'On Schedule'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">
                  Outpatient encounter (No admission required).
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Financial Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Billing & Financial Reconciliation</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[11px] text-slate-500 block">Total Billing</span>
                <span className="font-bold text-slate-900 text-base">
                  ${r.billing_amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Insurance Claimed</span>
                <span className="font-semibold text-blue-700 text-sm">
                  {r.claim_amount ? `$${r.claim_amount.toLocaleString()}` : '$0 (None)'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Claim Realization</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {r.claim_amount && r.billing_amount > 0
                    ? `${Math.round((r.claim_amount / r.billing_amount) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Outstanding Balance</span>
                <span
                  className={`font-bold text-sm ${r.outstanding_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  ${r.outstanding_amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setSelectedRecord(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
