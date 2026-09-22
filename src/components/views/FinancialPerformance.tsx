import React, { useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  DollarSign,
  PieChart as PieChartIcon,
  ShieldAlert,
  ShieldCheck,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHospitalData } from '../../context/HospitalDataContext';
import { DEPARTMENTS, INSURANCE_TYPES } from '../../data/hospitalMetadata';
import { DepartmentName, InsuranceType, VisitType } from '../../types';

export const FinancialPerformance: React.FC = () => {
  const { filteredRecords, kpis } = useHospitalData();

  // 1. Department Revenue & Billing breakdown
  const deptFinancials = useMemo(() => {
    const map: Record<
      DepartmentName,
      { totalBilling: number; totalClaims: number; totalOutstanding: number; visits: number }
    > = {} as any;
    DEPARTMENTS.forEach((d) => {
      map[d] = { totalBilling: 0, totalClaims: 0, totalOutstanding: 0, visits: 0 };
    });

    filteredRecords.forEach((r) => {
      const d = map[r.department];
      if (d) {
        d.visits++;
        d.totalBilling += r.billing_amount;
        if (r.claim_amount) d.totalClaims += r.claim_amount;
        d.totalOutstanding += r.outstanding_amount;
      }
    });

    return DEPARTMENTS.map((dept) => {
      const s = map[dept];
      const avgBilling = s.visits > 0 ? Math.round(s.totalBilling / s.visits) : 0;
      return {
        department: dept,
        shortName: dept.replace('Obstetrics & Gynaecology', 'OB/GYN').replace('General Medicine', 'Gen Med').replace('General Surgery', 'Gen Surg'),
        totalBilling: s.totalBilling,
        totalClaims: s.totalClaims,
        totalOutstanding: s.totalOutstanding,
        avgBilling,
        visits: s.visits,
      };
    }).sort((a, b) => b.totalBilling - a.totalBilling);
  }, [filteredRecords]);

  // 2. Visit Type Billing Disparity (Routine OPD vs Emergency vs Follow-up vs Inpatient)
  const visitTypeFinancials = useMemo(() => {
    const types: VisitType[] = ['OPD', 'Emergency', 'Follow-up'];
    const map: Record<VisitType, { total: number; count: number }> = {
      OPD: { total: 0, count: 0 },
      Emergency: { total: 0, count: 0 },
      'Follow-up': { total: 0, count: 0 },
    };

    let inpatientBilling = 0;
    let inpatientCount = 0;

    filteredRecords.forEach((r) => {
      if (map[r.visit_type]) {
        map[r.visit_type].total += r.billing_amount;
        map[r.visit_type].count++;
      }
      if (r.admission) {
        inpatientBilling += r.billing_amount;
        inpatientCount++;
      }
    });

    const list = types.map((t) => ({
      category: `${t} Encounters`,
      totalBilling: map[t].total,
      avgBilling: map[t].count > 0 ? Math.round(map[t].total / map[t].count) : 0,
      count: map[t].count,
    }));

    list.push({
      category: 'Inpatient Admissions',
      totalBilling: inpatientBilling,
      avgBilling: inpatientCount > 0 ? Math.round(inpatientBilling / inpatientCount) : 0,
      count: inpatientCount,
    });

    return list;
  }, [filteredRecords]);

  // 3. Insurance Coverage Realization & Collection Analysis
  const insuranceFinancials = useMemo(() => {
    const map: Record<
      InsuranceType,
      { totalBilling: number; claims: number; outstanding: number; count: number }
    > = {
      'Private Insurance': { totalBilling: 0, claims: 0, outstanding: 0, count: 0 },
      'Government Insurance': { totalBilling: 0, claims: 0, outstanding: 0, count: 0 },
      'Self-pay': { totalBilling: 0, claims: 0, outstanding: 0, count: 0 },
    };

    filteredRecords.forEach((r) => {
      const ins = map[r.insurance_type];
      if (ins) {
        ins.count++;
        ins.totalBilling += r.billing_amount;
        if (r.claim_amount) ins.claims += r.claim_amount;
        ins.outstanding += r.outstanding_amount;
      }
    });

    return INSURANCE_TYPES.map((type) => {
      const s = map[type];
      const realizationPct =
        s.totalBilling > 0 ? Math.round(((s.totalBilling - s.outstanding) / s.totalBilling) * 100) : 0;
      return {
        insuranceType: type,
        totalBilling: s.totalBilling,
        claims: s.claims,
        outstanding: s.outstanding,
        realizationPct,
        patientsCount: s.count,
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
          Financial Performance & Revenue Operations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive hospital billing reconciliation, insurance claim realization, outstanding patient debt, and encounter yield.
        </p>
      </div>

      {/* FINANCIAL TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Total Gross Billing</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${(kpis.totalBilling / 1000000).toFixed(2)}M
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {kpis.totalVisits.toLocaleString()} patient encounters
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Insurance Claims Filed</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            ${(kpis.totalClaimAmount / 1000000).toFixed(2)}M
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Math.round((kpis.totalClaimAmount / (kpis.totalBilling || 1)) * 100)}% of total billing covered by payers
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Outstanding Balance</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            ${(kpis.totalOutstanding / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Pending insurer adjudication & self-pay invoices
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Mean Revenue / Encounter</span>
            <Coins className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700">
            ${kpis.totalVisits > 0 ? Math.round(kpis.totalBilling / kpis.totalVisits).toLocaleString() : 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Weighted across outpatient & inpatient services
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Gross Revenue Contribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Total Billing by Clinical Department</h3>
              <p className="text-xs text-slate-500">Gross departmental revenue contribution (Pattern F)</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Pattern F: Revenue Mix
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptFinancials} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <YAxis dataKey="shortName" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={70} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Gross Billing']}
                />
                <Bar dataKey="totalBilling" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Encounter Severity Billing Disparity */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Average Billing per Encounter Type</h3>
              <p className="text-xs text-slate-500">
                Inpatient & Emergency encounters generate significantly higher per-encounter revenue
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Severity Hierarchy
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitTypeFinancials} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any, _, item: any) => [
                    `$${Number(val).toLocaleString()} (Total $${(item.payload.totalBilling / 1000).toFixed(0)}k from ${item.payload.count.toLocaleString()} cases)`,
                    'Average Billing',
                  ]}
                />
                <Bar dataKey="avgBilling" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {visitTypeFinancials.map((entry, idx) => (
                    <Cell
                      key={`fin-${idx}`}
                      fill={idx === 3 ? '#7c3aed' : idx === 1 ? '#ea580c' : '#2563eb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* INSURANCE TYPE COLLECTION BREAKDOWN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          Insurance Payer Realization & Outstanding Risk
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Financial settlement rates and payment recovery metrics across private coverage, state health schemes, and self-pay patients
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Payer / Insurance Scheme</th>
                <th className="py-2.5 px-3 text-right">Encounters</th>
                <th className="py-2.5 px-3 text-right">Gross Billing</th>
                <th className="py-2.5 px-3 text-right">Insurance Claimed</th>
                <th className="py-2.5 px-3 text-right">Outstanding Debt</th>
                <th className="py-2.5 px-3 text-right">Revenue Recovery %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insuranceFinancials.map((ins) => (
                <tr key={ins.insuranceType} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-semibold text-slate-800">{ins.insuranceType}</td>
                  <td className="py-3 px-3 text-right text-slate-600 font-medium">
                    {ins.patientsCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ${ins.totalBilling.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-blue-700">
                    ${ins.claims.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-rose-600">
                    ${ins.outstanding.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded font-semibold text-xs ${
                        ins.realizationPct >= 90
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {ins.realizationPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
