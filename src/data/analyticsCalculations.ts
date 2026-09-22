import {
  DepartmentName,
  DeterministicInsights,
  DiagnosticTestType,
  HospitalKPIs,
  PatientVisitRecord,
  WardType,
} from '../types';
import { DEPARTMENTS, DIAGNOSTIC_TESTS, TEST_BENCHMARKS, WARDS } from './hospitalMetadata';

export function calculateHospitalKPIs(records: PatientVisitRecord[]): HospitalKPIs {
  const totalVisits = records.length;
  if (totalVisits === 0) {
    return {
      totalVisits: 0,
      completedVisits: 0,
      avgWaitingTime: 0,
      bedOccupancy: 0,
      noShowRate: 0,
      avgDiagnosticTat: 0,
      avgLengthOfStay: 0,
      totalBilling: 0,
      totalClaimAmount: 0,
      totalOutstanding: 0,
      admissionRate: 0,
    };
  }

  let completedVisits = 0;
  let totalWaitMinutes = 0;
  let waitCount = 0;
  let scheduledCount = 0;
  let noShowCount = 0;
  let totalTatHours = 0;
  let tatCount = 0;
  let totalAdmission = 0;
  let totalBedOccupancy = 0;
  let admissionCountWithOcc = 0;
  let totalLosDays = 0;
  let losCount = 0;
  let totalBilling = 0;
  let totalClaimAmount = 0;
  let totalOutstanding = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    if (!r.no_show && !r.cancellation) {
      completedVisits++;
    }

    if (r.waiting_time_minutes !== null) {
      totalWaitMinutes += r.waiting_time_minutes;
      waitCount++;
    }

    if (r.appointment_type === 'Scheduled') {
      scheduledCount++;
      if (r.no_show) {
        noShowCount++;
      }
    }

    if (r.diagnostic_tat_hours !== null) {
      totalTatHours += r.diagnostic_tat_hours;
      tatCount++;
    }

    if (r.admission) {
      totalAdmission++;
      if (r.bed_occupancy_pct_at_admission !== null) {
        totalBedOccupancy += r.bed_occupancy_pct_at_admission;
        admissionCountWithOcc++;
      }
      if (r.length_of_stay_days !== null) {
        totalLosDays += r.length_of_stay_days;
        losCount++;
      }
    }

    totalBilling += r.billing_amount;
    if (r.claim_amount) {
      totalClaimAmount += r.claim_amount;
    }
    totalOutstanding += r.outstanding_amount;
  }

  const avgWaitingTime = waitCount > 0 ? parseFloat((totalWaitMinutes / waitCount).toFixed(1)) : 0;
  const noShowRate = scheduledCount > 0 ? parseFloat(((noShowCount / scheduledCount) * 100).toFixed(1)) : 0;
  const avgDiagnosticTat = tatCount > 0 ? parseFloat((totalTatHours / tatCount).toFixed(1)) : 0;
  const bedOccupancy =
    admissionCountWithOcc > 0
      ? parseFloat((totalBedOccupancy / admissionCountWithOcc).toFixed(1))
      : 76.5;
  const avgLengthOfStay = losCount > 0 ? parseFloat((totalLosDays / losCount).toFixed(1)) : 0;
  const admissionRate = totalVisits > 0 ? parseFloat(((totalAdmission / totalVisits) * 100).toFixed(1)) : 0;

  return {
    totalVisits,
    completedVisits,
    avgWaitingTime,
    bedOccupancy,
    noShowRate,
    avgDiagnosticTat,
    avgLengthOfStay,
    totalBilling,
    totalClaimAmount,
    totalOutstanding,
    admissionRate,
  };
}

export function calculateDeterministicInsights(records: PatientVisitRecord[]): DeterministicInsights {
  // Department volumes and wait times
  const deptWaitSum: Record<string, { totalWait: number; count: number; totalVisits: number; scheduled: number; noShows: number }> = {};
  DEPARTMENTS.forEach((d) => {
    deptWaitSum[d] = { totalWait: 0, count: 0, totalVisits: 0, scheduled: 0, noShows: 0 };
  });

  // Ward occupancy
  const wardOccSum: Record<WardType, { totalOcc: number; count: number }> = {
    'General Ward': { totalOcc: 0, count: 0 },
    'Private Ward': { totalOcc: 0, count: 0 },
    'ICU': { totalOcc: 0, count: 0 },
  };

  // Test type TAT
  const testTatSum: Record<string, { totalTat: number; count: number }> = {};
  DIAGNOSTIC_TESTS.forEach((t) => {
    testTatSum[t] = { totalTat: 0, count: 0 };
  });

  // Month volumes
  const monthVolSum: Record<string, number> = {};

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const dStat = deptWaitSum[r.department];
    if (dStat) {
      dStat.totalVisits++;
      if (r.waiting_time_minutes !== null) {
        dStat.totalWait += r.waiting_time_minutes;
        dStat.count++;
      }
      if (r.appointment_type === 'Scheduled') {
        dStat.scheduled++;
        if (r.no_show) dStat.noShows++;
      }
    }

    if (r.admission && r.ward && r.bed_occupancy_pct_at_admission !== null) {
      wardOccSum[r.ward].totalOcc += r.bed_occupancy_pct_at_admission;
      wardOccSum[r.ward].count++;
    }

    if (r.diagnostic_test_ordered && r.diagnostic_test_type && r.diagnostic_tat_hours !== null) {
      const tStat = testTatSum[r.diagnostic_test_type];
      if (tStat) {
        tStat.totalTat += r.diagnostic_tat_hours;
        tStat.count++;
      }
    }

    monthVolSum[r.month] = (monthVolSum[r.month] || 0) + 1;
  }

  // 1. Highest & lowest wait dept
  let highestWaitDept: { department: DepartmentName; avgWait: number } = {
    department: 'Cardiology',
    avgWait: 0,
  };
  let lowestWaitDept: { department: DepartmentName; avgWait: number } = {
    department: 'Emergency',
    avgWait: 9999,
  };

  let highestVolumeDept: { department: DepartmentName; volume: number; pct: number } = {
    department: 'General Medicine',
    volume: 0,
    pct: 0,
  };

  let highestNoShowDept: { department: DepartmentName; rate: number } = {
    department: 'General Medicine',
    rate: 0,
  };

  DEPARTMENTS.forEach((dept) => {
    const s = deptWaitSum[dept];
    const avgW = s.count > 0 ? s.totalWait / s.count : 0;
    if (avgW > highestWaitDept.avgWait) {
      highestWaitDept = { department: dept, avgWait: parseFloat(avgW.toFixed(1)) };
    }
    if (avgW < lowestWaitDept.avgWait && s.count > 0) {
      lowestWaitDept = { department: dept, avgWait: parseFloat(avgW.toFixed(1)) };
    }
    if (s.totalVisits > highestVolumeDept.volume) {
      highestVolumeDept = {
        department: dept,
        volume: s.totalVisits,
        pct: records.length > 0 ? parseFloat(((s.totalVisits / records.length) * 100).toFixed(1)) : 0,
      };
    }
    const noShowPct = s.scheduled > 0 ? (s.noShows / s.scheduled) * 100 : 0;
    if (noShowPct > highestNoShowDept.rate) {
      highestNoShowDept = { department: dept, rate: parseFloat(noShowPct.toFixed(1)) };
    }
  });

  // Ward with highest occupancy
  let highestOccupancyWard: { ward: WardType; occupancy: number } = {
    ward: 'ICU',
    occupancy: 0,
  };
  WARDS.forEach((w) => {
    const wStat = wardOccSum[w];
    const avgOcc = wStat.count > 0 ? wStat.totalOcc / wStat.count : 0;
    if (avgOcc > highestOccupancyWard.occupancy) {
      highestOccupancyWard = { ward: w, occupancy: parseFloat(avgOcc.toFixed(1)) };
    }
  });

  // Test type with longest TAT
  let longestTatTest: { testType: DiagnosticTestType; avgTat: number } = {
    testType: 'MRI Scan',
    avgTat: 0,
  };
  DIAGNOSTIC_TESTS.forEach((t) => {
    const tStat = testTatSum[t];
    const avgTat = tStat.count > 0 ? tStat.totalTat / tStat.count : 0;
    if (avgTat > longestTatTest.avgTat) {
      longestTatTest = { testType: t, avgTat: parseFloat(avgTat.toFixed(1)) };
    }
  });

  // Peak month
  let peakMonth: { month: string; volume: number } = { month: '2026-07', volume: 0 };
  Object.entries(monthVolSum).forEach(([m, vol]) => {
    if (vol > peakMonth.volume) {
      peakMonth = { month: m, volume: vol };
    }
  });

  return {
    highestWaitDept,
    lowestWaitDept,
    highestVolumeDept,
    highestOccupancyWard,
    longestTatTest,
    peakMonth,
    highestNoShowDept,
  };
}

// 8 Required Interactive Visualizations and Reusable Analytical Functions:

// 1. Patient volume trend over six months
export function getMonthlyPatientVolume(records: PatientVisitRecord[]) {
  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  const monthLabels: Record<string, string> = {
    '2026-03': 'Mar 2026',
    '2026-04': 'Apr 2026',
    '2026-05': 'May 2026',
    '2026-06': 'Jun 2026',
    '2026-07': 'Jul 2026',
    '2026-08': 'Aug 2026',
  };

  const map: Record<string, { month: string; label: string; OPD: number; Emergency: number; FollowUp: number; total: number }> = {};
  months.forEach((m) => {
    map[m] = { month: m, label: monthLabels[m], OPD: 0, Emergency: 0, FollowUp: 0, total: 0 };
  });

  records.forEach((r) => {
    if (map[r.month]) {
      map[r.month].total++;
      if (r.visit_type === 'OPD') map[r.month].OPD++;
      else if (r.visit_type === 'Emergency') map[r.month].Emergency++;
      else if (r.visit_type === 'Follow-up') map[r.month].FollowUp++;
    }
  });

  return months.map((m) => map[m]);
}
export const getMonthlyVolumeTrend = getMonthlyPatientVolume;

// 2. Average waiting time by department
export function getAverageWaitingTimeByDepartment(records: PatientVisitRecord[], hospitalAvg?: number) {
  let avg = hospitalAvg;
  if (avg === undefined) {
    let waitSum = 0;
    let waitCount = 0;
    records.forEach((r) => {
      if (r.waiting_time_minutes !== null) {
        waitSum += r.waiting_time_minutes;
        waitCount++;
      }
    });
    avg = waitCount > 0 ? parseFloat((waitSum / waitCount).toFixed(1)) : 0;
  }

  const map: Record<DepartmentName, { totalWait: number; count: number }> = {} as any;
  DEPARTMENTS.forEach((d) => (map[d] = { totalWait: 0, count: 0 }));

  records.forEach((r) => {
    if (r.waiting_time_minutes !== null) {
      map[r.department].totalWait += r.waiting_time_minutes;
      map[r.department].count++;
    }
  });

  return DEPARTMENTS.map((dept) => {
    const s = map[dept];
    const avgWait = s.count > 0 ? parseFloat((s.totalWait / s.count).toFixed(1)) : 0;
    return {
      department: dept,
      shortName: dept.replace('Obstetrics & Gynaecology', 'OB/GYN').replace('General Medicine', 'Gen Med').replace('General Surgery', 'Gen Surg'),
      avgWait,
      hospitalAvg: avg!,
      diff: parseFloat((avgWait - avg!).toFixed(1)),
      patientCount: s.count,
    };
  }).sort((a, b) => b.avgWait - a.avgWait);
}
export const getWaitingTimeByDepartment = getAverageWaitingTimeByDepartment;

// 3. Patient volume by department
export function getPatientVolumeByDepartment(records: PatientVisitRecord[]) {
  const map: Record<DepartmentName, number> = {} as any;
  DEPARTMENTS.forEach((d) => (map[d] = 0));

  records.forEach((r) => {
    map[r.department] = (map[r.department] || 0) + 1;
  });

  const total = records.length || 1;

  return DEPARTMENTS.map((dept) => {
    const count = map[dept];
    return {
      department: dept,
      shortName: dept.replace('Obstetrics & Gynaecology', 'OB/GYN').replace('General Medicine', 'Gen Med').replace('General Surgery', 'Gen Surg'),
      visits: count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    };
  }).sort((a, b) => b.visits - a.visits);
}
export const getVolumeByDepartment = getPatientVolumeByDepartment;

// 4. No-show rate by department
export function getNoShowRateByDepartment(records: PatientVisitRecord[]) {
  const map: Record<DepartmentName, { scheduled: number; noShows: number }> = {} as any;
  DEPARTMENTS.forEach((d) => (map[d] = { scheduled: 0, noShows: 0 }));

  records.forEach((r) => {
    if (r.appointment_type === 'Scheduled') {
      map[r.department].scheduled++;
      if (r.no_show) {
        map[r.department].noShows++;
      }
    }
  });

  return DEPARTMENTS.map((dept) => {
    const s = map[dept];
    const rate = s.scheduled > 0 ? parseFloat(((s.noShows / s.scheduled) * 100).toFixed(1)) : 0;
    return {
      department: dept,
      shortName: dept.replace('Obstetrics & Gynaecology', 'OB/GYN').replace('General Medicine', 'Gen Med').replace('General Surgery', 'Gen Surg'),
      noShowRate: rate,
      scheduledVisits: s.scheduled,
      noShowCount: s.noShows,
    };
  }).sort((a, b) => b.noShowRate - a.noShowRate);
}

// 5. Diagnostic TAT by test type
export function getDiagnosticTATByTestType(records: PatientVisitRecord[]) {
  const map: Record<DiagnosticTestType, { totalTat: number; count: number; sameDay: number }> = {} as any;
  DIAGNOSTIC_TESTS.forEach((t) => (map[t] = { totalTat: 0, count: 0, sameDay: 0 }));

  records.forEach((r) => {
    if (r.diagnostic_test_ordered && r.diagnostic_test_type && r.diagnostic_tat_hours !== null) {
      map[r.diagnostic_test_type].totalTat += r.diagnostic_tat_hours;
      map[r.diagnostic_test_type].count++;
      if (r.result_same_day) {
        map[r.diagnostic_test_type].sameDay++;
      }
    }
  });

  return DIAGNOSTIC_TESTS.map((test) => {
    const s = map[test];
    const avgTat = s.count > 0 ? parseFloat((s.totalTat / s.count).toFixed(1)) : 0;
    const sameDayPct = s.count > 0 ? parseFloat(((s.sameDay / s.count) * 100).toFixed(1)) : 0;
    const targetTat = TEST_BENCHMARKS[test].baseTatHours;
    return {
      testType: test,
      avgTat,
      targetTat,
      diff: parseFloat((avgTat - targetTat).toFixed(1)),
      volume: s.count,
      sameDayPct,
    };
  }).sort((a, b) => b.avgTat - a.avgTat);
}
export const getDiagnosticTatByTestType = getDiagnosticTATByTestType;

// 6. Bed occupancy by ward
export function getBedOccupancyByWard(records: PatientVisitRecord[]) {
  const map: Record<WardType, { totalOcc: number; count: number; delayedDischarges: number }> = {
    'General Ward': { totalOcc: 0, count: 0, delayedDischarges: 0 },
    'Private Ward': { totalOcc: 0, count: 0, delayedDischarges: 0 },
    'ICU': { totalOcc: 0, count: 0, delayedDischarges: 0 },
  };

  records.forEach((r) => {
    if (r.admission && r.ward && r.bed_occupancy_pct_at_admission !== null) {
      map[r.ward].totalOcc += r.bed_occupancy_pct_at_admission;
      map[r.ward].count++;
      if (r.discharge_delay) {
        map[r.ward].delayedDischarges++;
      }
    }
  });

  return WARDS.map((ward) => {
    const s = map[ward];
    const avgOcc = s.count > 0 ? parseFloat((s.totalOcc / s.count).toFixed(1)) : 0;
    const delayRate = s.count > 0 ? parseFloat(((s.delayedDischarges / s.count) * 100).toFixed(1)) : 0;
    return {
      ward,
      occupancyPct: avgOcc,
      warningThreshold: 85,
      admissionsCount: s.count,
      delayRate,
      isWarning: avgOcc >= 85,
    };
  }).sort((a, b) => b.occupancyPct - a.occupancyPct);
}

// 7. Average length of stay by department
export function getAverageLengthOfStayByDepartment(records: PatientVisitRecord[]) {
  const map: Record<DepartmentName, { totalLos: number; count: number }> = {} as any;
  DEPARTMENTS.forEach((d) => (map[d] = { totalLos: 0, count: 0 }));

  records.forEach((r) => {
    if (r.admission && r.length_of_stay_days !== null) {
      map[r.department].totalLos += r.length_of_stay_days;
      map[r.department].count++;
    }
  });

  return DEPARTMENTS.map((dept) => {
    const s = map[dept];
    const avgLos = s.count > 0 ? parseFloat((s.totalLos / s.count).toFixed(1)) : 0;
    return {
      department: dept,
      shortName: dept.replace('Obstetrics & Gynaecology', 'OB/GYN').replace('General Medicine', 'Gen Med').replace('General Surgery', 'Gen Surg'),
      avgLosDays: avgLos,
      admissions: s.count,
    };
  }).sort((a, b) => b.avgLosDays - a.avgLosDays);
}
export const getLengthOfStayByDepartment = getAverageLengthOfStayByDepartment;

// 8. Monthly billing trend
export function getMonthlyBilling(records: PatientVisitRecord[]) {
  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  const monthLabels: Record<string, string> = {
    '2026-03': 'Mar 2026',
    '2026-04': 'Apr 2026',
    '2026-05': 'May 2026',
    '2026-06': 'Jun 2026',
    '2026-07': 'Jul 2026',
    '2026-08': 'Aug 2026',
  };

  const map: Record<string, { totalBilled: number; insuranceClaimed: number; outstanding: number }> = {};
  months.forEach((m) => {
    map[m] = { totalBilled: 0, insuranceClaimed: 0, outstanding: 0 };
  });

  records.forEach((r) => {
    if (map[r.month]) {
      map[r.month].totalBilled += r.billing_amount;
      if (r.claim_amount) {
        map[r.month].insuranceClaimed += r.claim_amount;
      }
      map[r.month].outstanding += r.outstanding_amount;
    }
  });

  return months.map((m) => ({
    month: m,
    label: monthLabels[m],
    totalBilled: Math.round(map[m].totalBilled),
    insuranceClaimed: Math.round(map[m].insuranceClaimed),
    outstanding: Math.round(map[m].outstanding),
  }));
}
export const getMonthlyBillingTrend = getMonthlyBilling;

// 9. Doctor availability and staff availability by department
export function getDoctorAvailabilityByDepartment(records: PatientVisitRecord[]) {
  const map: Record<
    DepartmentName,
    {
      total: number;
      doctorAvailable: number;
      staffPctSum: number;
      waitWithDocSum: number;
      waitWithDocCount: number;
      waitWithoutDocSum: number;
      waitWithoutDocCount: number;
    }
  > = {} as any;

  DEPARTMENTS.forEach((d) => {
    map[d] = {
      total: 0,
      doctorAvailable: 0,
      staffPctSum: 0,
      waitWithDocSum: 0,
      waitWithDocCount: 0,
      waitWithoutDocSum: 0,
      waitWithoutDocCount: 0,
    };
  });

  records.forEach((r) => {
    const s = map[r.department];
    if (!s) return;
    s.total++;
    if (r.doctor_available) {
      s.doctorAvailable++;
    }
    s.staffPctSum += r.staff_availability_pct;

    if (r.waiting_time_minutes !== null) {
      if (r.doctor_available) {
        s.waitWithDocSum += r.waiting_time_minutes;
        s.waitWithDocCount++;
      } else {
        s.waitWithoutDocSum += r.waiting_time_minutes;
        s.waitWithoutDocCount++;
      }
    }
  });

  return DEPARTMENTS.map((dept) => {
    const s = map[dept];
    const docAvailRate = s.total > 0 ? parseFloat(((s.doctorAvailable / s.total) * 100).toFixed(1)) : 0;
    const avgStaffPct = s.total > 0 ? parseFloat((s.staffPctSum / s.total).toFixed(1)) : 0;
    const avgWaitDocPresent =
      s.waitWithDocCount > 0 ? parseFloat((s.waitWithDocSum / s.waitWithDocCount).toFixed(1)) : 0;
    const avgWaitDocAbsent =
      s.waitWithoutDocCount > 0 ? parseFloat((s.waitWithoutDocSum / s.waitWithoutDocCount).toFixed(1)) : 0;

    return {
      department: dept,
      shortName: dept
        .replace('Obstetrics & Gynaecology', 'OB/GYN')
        .replace('General Medicine', 'Gen Med')
        .replace('General Surgery', 'Gen Surg'),
      doctorAvailabilityRate: docAvailRate,
      avgStaffAvailabilityPct: avgStaffPct,
      totalAuditedEncounters: s.total,
      doctorUnavailableCount: s.total - s.doctorAvailable,
      avgWaitDocPresent,
      avgWaitDocAbsent,
      waitDifferenceMinutes: parseFloat((avgWaitDocAbsent - avgWaitDocPresent).toFixed(1)),
    };
  }).sort((a, b) => a.doctorAvailabilityRate - b.doctorAvailabilityRate);
}

// 10. Department side-by-side comparison
export function getDepartmentComparison(
  records: PatientVisitRecord[],
  departmentA: DepartmentName,
  departmentB: DepartmentName
) {
  const waitData = getAverageWaitingTimeByDepartment(records);
  const volumeData = getPatientVolumeByDepartment(records);
  const noShowData = getNoShowRateByDepartment(records);
  const losData = getAverageLengthOfStayByDepartment(records);
  const docData = getDoctorAvailabilityByDepartment(records);

  const getMetrics = (dept: DepartmentName) => {
    const w = waitData.find((d) => d.department === dept);
    const v = volumeData.find((d) => d.department === dept);
    const ns = noShowData.find((d) => d.department === dept);
    const l = losData.find((d) => d.department === dept);
    const doc = docData.find((d) => d.department === dept);

    return {
      department: dept,
      patientVisits: v?.visits || 0,
      volumePercentage: v?.percentage || 0,
      avgWaitingTimeMinutes: w?.avgWait || 0,
      noShowRatePct: ns?.noShowRate || 0,
      scheduledVisits: ns?.scheduledVisits || 0,
      noShowCount: ns?.noShowCount || 0,
      avgLengthOfStayDays: l?.avgLosDays || 0,
      inpatientAdmissions: l?.admissions || 0,
      doctorAvailabilityRatePct: doc?.doctorAvailabilityRate || 0,
      avgStaffAvailabilityPct: doc?.avgStaffAvailabilityPct || 0,
    };
  };

  const a = getMetrics(departmentA);
  const b = getMetrics(departmentB);

  return {
    departmentA: a,
    departmentB: b,
    variance: {
      waitingTimeDiffMinutes: parseFloat((a.avgWaitingTimeMinutes - b.avgWaitingTimeMinutes).toFixed(1)),
      noShowRateDiffPct: parseFloat((a.noShowRatePct - b.noShowRatePct).toFixed(1)),
      volumeDiff: a.patientVisits - b.patientVisits,
      losDiffDays: parseFloat((a.avgLengthOfStayDays - b.avgLengthOfStayDays).toFixed(1)),
      doctorAvailDiffPct: parseFloat((a.doctorAvailabilityRatePct - b.doctorAvailabilityRatePct).toFixed(1)),
    },
  };
}

// Centralized dispatcher for all analytical tools (READ-ONLY)
export function executeAnalyticalTool(
  toolName: string,
  params: Record<string, any> = {},
  records: PatientVisitRecord[]
): {
  toolName: string;
  displayName: string;
  summary: string;
  data: any;
} {
  switch (toolName) {
    case 'getNoShowRateByDepartment': {
      const data = getNoShowRateByDepartment(records);
      const highest = data[0];
      const lowest = data[data.length - 1];
      return {
        toolName,
        displayName: 'No-Show Rate by Department',
        summary: `Analyzed scheduled visits across 8 departments. Highest no-show: ${highest?.department} at ${highest?.noShowRate}% (${highest?.noShowCount} missed of ${highest?.scheduledVisits}). Lowest: ${lowest?.department} at ${lowest?.noShowRate}%.`,
        data,
      };
    }

    case 'getAverageWaitingTimeByDepartment': {
      const data = getAverageWaitingTimeByDepartment(records);
      const highest = data[0];
      const lowest = data[data.length - 1];
      const hospAvg = highest?.hospitalAvg || 54.7;
      return {
        toolName,
        displayName: 'Average Waiting Time by Department',
        summary: `Calculated door-to-doctor wait times. Hospital benchmark is ${hospAvg} min. Longest wait: ${highest?.department} at ${highest?.avgWait} min (+${highest?.diff} min vs benchmark). Shortest: ${lowest?.department} at ${lowest?.avgWait} min.`,
        data,
      };
    }

    case 'getPatientVolumeByDepartment': {
      const data = getPatientVolumeByDepartment(records);
      const totalVisits = records.length;
      const top = data[0];
      const second = data[1];
      return {
        toolName,
        displayName: 'Patient Volume by Department',
        summary: `Aggregated total patient encounters (${totalVisits.toLocaleString()}). Top volume driver: ${top?.department} with ${top?.visits.toLocaleString()} visits (${top?.percentage}%), followed by ${second?.department} with ${second?.visits.toLocaleString()} visits (${second?.percentage}%).`,
        data,
      };
    }

    case 'getDiagnosticTATByTestType': {
      const data = getDiagnosticTATByTestType(records);
      const longest = data[0];
      const shortest = data[data.length - 1];
      return {
        toolName,
        displayName: 'Diagnostic Turnaround Time (TAT)',
        summary: `Audited turnaround times across 6 diagnostic modalities. Longest TAT: ${longest?.testType} at ${longest?.avgTat} hours (target: ${longest?.targetTat}h, same-day rate: ${longest?.sameDayPct}%). Shortest: ${shortest?.testType} at ${shortest?.avgTat} hours.`,
        data,
      };
    }

    case 'getBedOccupancyByWard': {
      const data = getBedOccupancyByWard(records);
      const highest = data[0];
      return {
        toolName,
        displayName: 'Bed Occupancy by Ward',
        summary: `Calculated inpatient bed occupancy across wards. Highest occupancy: ${highest?.ward} at ${highest?.occupancyPct}% (warning threshold: 85%, delayed discharge rate: ${highest?.delayRate}%).`,
        data,
      };
    }

    case 'getAverageLengthOfStayByDepartment': {
      const data = getAverageLengthOfStayByDepartment(records);
      const longest = data[0];
      return {
        toolName,
        displayName: 'Average Length of Stay (ALOS) by Department',
        summary: `Evaluated inpatient length of stay. Longest ALOS: ${longest?.department} at ${longest?.avgLosDays} days across ${longest?.admissions} admissions.`,
        data,
      };
    }

    case 'getMonthlyPatientVolume': {
      const data = getMonthlyPatientVolume(records);
      const peak = data.reduce((prev, curr) => (curr.total > prev.total ? curr : prev), data[0]);
      return {
        toolName,
        displayName: 'Monthly Patient Volume Trend',
        summary: `Computed monthly encounter distribution across 6 months (Mar–Aug 2026). Peak operational load occurred in ${peak?.label} with ${peak?.total.toLocaleString()} patient visits.`,
        data,
      };
    }

    case 'getMonthlyBilling': {
      const data = getMonthlyBilling(records);
      const totalBilled = data.reduce((sum, d) => sum + d.totalBilled, 0);
      const totalOutstanding = data.reduce((sum, d) => sum + d.outstanding, 0);
      return {
        toolName,
        displayName: 'Monthly Financial Billing & Claims',
        summary: `Calculated financial flows across 6 months. Cumulative billing: $${(totalBilled / 1e6).toFixed(2)}M, with $${(totalOutstanding / 1e6).toFixed(2)}M outstanding balances across self-pay and pending claims.`,
        data,
      };
    }

    case 'getDoctorAvailabilityByDepartment': {
      const data = getDoctorAvailabilityByDepartment(records);
      const lowestAvail = data[0];
      const highestAvail = data[data.length - 1];
      return {
        toolName,
        displayName: 'Doctor & Staff Availability by Department',
        summary: `Audited clinical staffing and doctor attendance across encounters. Lowest doctor availability: ${lowestAvail?.department} at ${lowestAvail?.doctorAvailabilityRate}% (wait time +${lowestAvail?.waitDifferenceMinutes} min when doctor unavailable). Highest availability: ${highestAvail?.department} at ${highestAvail?.doctorAvailabilityRate}%.`,
        data,
      };
    }

    case 'getDepartmentComparison': {
      const deptA = (params.departmentA as DepartmentName) || 'Cardiology';
      const deptB = (params.departmentB as DepartmentName) || 'General Medicine';
      const data = getDepartmentComparison(records, deptA, deptB);
      return {
        toolName,
        displayName: `Department Comparison: ${deptA} vs ${deptB}`,
        summary: `Compared ${deptA} (wait: ${data.departmentA.avgWaitingTimeMinutes}m, no-show: ${data.departmentA.noShowRatePct}%, vol: ${data.departmentA.patientVisits}) against ${deptB} (wait: ${data.departmentB.avgWaitingTimeMinutes}m, no-show: ${data.departmentB.noShowRatePct}%, vol: ${data.departmentB.patientVisits}).`,
        data,
      };
    }

    default:
      throw new Error(`Unknown analytical tool: ${toolName}`);
  }
}
