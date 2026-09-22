import {
  calculateHospitalKPIs,
  getAverageLengthOfStayByDepartment,
  getAverageWaitingTimeByDepartment,
  getBedOccupancyByWard,
  getDiagnosticTATByTestType,
  getMonthlyBilling,
  getMonthlyPatientVolume,
  getNoShowRateByDepartment,
  getPatientVolumeByDepartment,
} from './analyticsCalculations';
import { DEPARTMENTS, DIAGNOSTIC_TESTS, WARDS } from './hospitalMetadata';
import { DepartmentName, PatientVisitRecord } from '../types';

export interface GroundedEvidence {
  intent: string;
  topic: string;
  entities: string[];
  evidencePoints: string[];
  contextData: Record<string, any>;
  hasSufficientData: boolean;
  isWhyQuestion?: boolean;
  deterministicDraft: {
    finding: string;
    evidence: string[];
    interpretation: string;
    managementInvestigation: string;
    whatDataTellsUs?: string;
    potentialFactorsToInvestigate?: string;
    limitation?: string;
    potentialNextStep?: string;
  };
}

/**
 * Determine if a user query is asking a causal, explanatory "why" question.
 */
export function isWhyQuestion(q: string): boolean {
  const qLower = q.toLowerCase();
  return (
    qLower.startsWith('why') ||
    qLower.includes(' why ') ||
    qLower.includes('why does') ||
    qLower.includes('why do') ||
    qLower.includes('why is') ||
    qLower.includes('why are') ||
    qLower.includes('why has') ||
    qLower.includes('why have') ||
    qLower.includes('what causes') ||
    qLower.includes('what caused') ||
    qLower.includes('what is the reason') ||
    qLower.includes('reasons for') ||
    qLower.includes('reason for') ||
    qLower.includes('root cause') ||
    qLower.includes('explain why') ||
    qLower.includes('what drives') ||
    qLower.includes('causes of') ||
    qLower.includes('driver of') ||
    qLower.includes('how come')
  );
}

/**
 * Shared Analytical & Data-Processing Engine for AI Analyst.
 * Operates on the EXACT SAME dataset and analytical functions used by the dashboard.
 */
export function analyzeHospitalQuery(
  question: string,
  records: PatientVisitRecord[]
): GroundedEvidence {
  const qLower = question.toLowerCase();
  const isWhy = isWhyQuestion(question);

  // Basic validation
  if (!records || records.length === 0) {
    return {
      intent: 'NO_DATA',
      topic: 'General Operations',
      entities: [],
      evidencePoints: ['No active patient records available in the current dataset.'],
      contextData: {},
      hasSufficientData: false,
      deterministicDraft: {
        finding: 'The operational dataset is currently empty or loading.',
        evidence: ['Total records available: 0'],
        interpretation: 'Analytics cannot be calculated without loaded encounter records.',
        managementInvestigation: 'Verify dataset generation or reset applied filters to restore active records.',
      },
    };
  }

  // Execute the shared analytical functions on the active dataset
  const kpis = calculateHospitalKPIs(records);
  const noShowByDept = getNoShowRateByDepartment(records);
  const waitTimeByDept = getAverageWaitingTimeByDepartment(records, kpis.avgWaitingTime);
  const volumeByDept = getPatientVolumeByDepartment(records);
  const diagnosticTat = getDiagnosticTATByTestType(records);
  const bedOccupancy = getBedOccupancyByWard(records);
  const losByDept = getAverageLengthOfStayByDepartment(records);
  const monthlyVolume = getMonthlyPatientVolume(records);
  const monthlyBilling = getMonthlyBilling(records);

  // Helper to detect mentioned departments
  const mentionedDepts = DEPARTMENTS.filter((d) => {
    const dName = d.toLowerCase();
    if (qLower.includes(dName)) return true;
    if (d === 'General Medicine' && (qLower.includes('general medicine') || qLower.includes('gen med') || qLower.includes('medicine'))) return true;
    if (d === 'General Surgery' && (qLower.includes('general surgery') || qLower.includes('gen surg') || qLower.includes('surgery'))) return true;
    if (d === 'Cardiology' && (qLower.includes('cardio') || qLower.includes('heart'))) return true;
    if (d === 'Orthopaedics' && (qLower.includes('ortho') || qLower.includes('orthopedics'))) return true;
    if (d === 'Paediatrics' && (qLower.includes('paediatric') || qLower.includes('pediatric') || qLower.includes('children') || qLower.includes('peds'))) return true;
    if (d === 'Obstetrics & Gynaecology' && (qLower.includes('ob/gyn') || qLower.includes('obgyn') || qLower.includes('obstetrics') || qLower.includes('gynaecology') || qLower.includes('gynecology') || qLower.includes('maternity'))) return true;
    if (d === 'Emergency' && (qLower.includes('emergency') || qLower.includes('er') || qLower.includes('ed'))) return true;
    if (d === 'Neurology' && (qLower.includes('neuro') || qLower.includes('brain'))) return true;
    return false;
  });

  // 1. INTENT: Department Comparison (e.g. Compare Cardiology and General Medicine)
  if (
    (qLower.includes('compare') || qLower.includes('versus') || qLower.includes(' vs ') || qLower.includes('between')) &&
    mentionedDepts.length >= 2
  ) {
    const d1Name = mentionedDepts[0];
    const d2Name = mentionedDepts[1];

    const d1Wait = waitTimeByDept.find((d) => d.department === d1Name);
    const d2Wait = waitTimeByDept.find((d) => d.department === d2Name);
    const d1NoShow = noShowByDept.find((d) => d.department === d1Name);
    const d2NoShow = noShowByDept.find((d) => d.department === d2Name);
    const d1Vol = volumeByDept.find((d) => d.department === d1Name);
    const d2Vol = volumeByDept.find((d) => d.department === d2Name);
    const d1Los = losByDept.find((d) => d.department === d1Name);
    const d2Los = losByDept.find((d) => d.department === d2Name);

    const waitDiff = d1Wait && d2Wait ? parseFloat(Math.abs(d1Wait.avgWait - d2Wait.avgWait).toFixed(1)) : 0;
    const noShowDiff = d1NoShow && d2NoShow ? parseFloat(Math.abs(d1NoShow.noShowRate - d2NoShow.noShowRate).toFixed(1)) : 0;
    const volDiff = d1Vol && d2Vol ? Math.abs(d1Vol.visits - d2Vol.visits) : 0;

    const evidencePoints = [
      `${d1Name}: Patient Volume = ${d1Vol?.visits.toLocaleString() || 0} visits (${d1Vol?.percentage || 0}% of hospital), Avg Waiting Time = ${d1Wait?.avgWait || 0} mins, No-Show Rate = ${d1NoShow?.noShowRate || 0}% (${d1NoShow?.noShowCount || 0}/${d1NoShow?.scheduledVisits || 0} scheduled), Avg LOS = ${d1Los?.avgLosDays || 0} days.`,
      `${d2Name}: Patient Volume = ${d2Vol?.visits.toLocaleString() || 0} visits (${d2Vol?.percentage || 0}% of hospital), Avg Waiting Time = ${d2Wait?.avgWait || 0} mins, No-Show Rate = ${d2NoShow?.noShowRate || 0}% (${d2NoShow?.noShowCount || 0}/${d2NoShow?.scheduledVisits || 0} scheduled), Avg LOS = ${d2Los?.avgLosDays || 0} days.`,
      `Hospital Benchmarks: Avg Waiting Time = ${kpis.avgWaitingTime} mins, Overall No-Show Rate = ${kpis.noShowRate}%, Total Hospital Volume = ${records.length.toLocaleString()} visits.`,
      `Direct Comparison: ${d1Wait && d2Wait && d1Wait.avgWait > d2Wait.avgWait ? d1Name : d2Name} has longer waiting times by ${waitDiff} minutes.`,
      `No-Show Comparison: ${d1NoShow && d2NoShow && d1NoShow.noShowRate > d2NoShow.noShowRate ? d1Name : d2Name} has a higher no-show rate by ${noShowDiff}%.`,
      `Volume Comparison: ${d1Vol && d2Vol && d1Vol.visits > d2Vol.visits ? d1Name : d2Name} handles ${volDiff.toLocaleString()} more patient visits.`,
    ];

    const longerWaitDept = d1Wait && d2Wait && d1Wait.avgWait >= d2Wait.avgWait ? d1Name : d2Name;
    const shorterWaitDept = longerWaitDept === d1Name ? d2Name : d1Name;
    const higherNoShowDept = d1NoShow && d2NoShow && d1NoShow.noShowRate >= d2NoShow.noShowRate ? d1Name : d2Name;

    return {
      intent: 'DEPARTMENT_COMPARISON',
      topic: `Comparison: ${d1Name} vs ${d2Name}`,
      entities: [d1Name, d2Name],
      evidencePoints,
      contextData: { d1: { name: d1Name, wait: d1Wait, noShow: d1NoShow, vol: d1Vol }, d2: { name: d2Name, wait: d2Wait, noShow: d2NoShow, vol: d2Vol } },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `Comparing ${d1Name} and ${d2Name}: ${longerWaitDept} experiences higher waiting times (${d1Wait && d2Wait ? Math.max(d1Wait.avgWait, d2Wait.avgWait) : 0} mins vs ${d1Wait && d2Wait ? Math.min(d1Wait.avgWait, d2Wait.avgWait) : 0} mins in ${shorterWaitDept}), while ${higherNoShowDept} exhibits a higher scheduled no-show rate (${d1NoShow && d2NoShow ? Math.max(d1NoShow.noShowRate, d2NoShow.noShowRate) : 0}% vs ${d1NoShow && d2NoShow ? Math.min(d1NoShow.noShowRate, d2NoShow.noShowRate) : 0}%).`,
        evidence: evidencePoints,
        interpretation: `The operational contrast reflects differing patient intake patterns, appointment scheduling models, and clinician availability between ${d1Name} and ${d2Name}. Higher waiting times in ${longerWaitDept} indicate registration and consult slot bottlenecks.`,
        managementInvestigation: `Audit clinician arrival and clinic session commencement times for ${longerWaitDept}, review overbooking thresholds in ${higherNoShowDept} to mitigate unused appointment capacity, and examine walk-in versus scheduled appointment distribution.`,
      },
    };
  }

  // 2. INTENT: No-Show Rate Queries (Department-level, highest, lowest, or specific department)
  if (
    qLower.includes('no-show') ||
    qLower.includes('no show') ||
    qLower.includes('noshow') ||
    qLower.includes('missed appointment') ||
    qLower.includes('cancellation') ||
    qLower.includes('non-attendance') ||
    qLower.includes('did not show')
  ) {
    // If asking about a specific department's no-show rate
    if (mentionedDepts.length === 1 && !qLower.includes('which department') && !qLower.includes('highest') && !qLower.includes('lowest')) {
      const deptName = mentionedDepts[0];
      const deptNoShow = noShowByDept.find((d) => d.department === deptName);
      const deptVol = volumeByDept.find((d) => d.department === deptName);
      const rate = deptNoShow ? deptNoShow.noShowRate : 0;
      const scheduled = deptNoShow ? deptNoShow.scheduledVisits : 0;
      const missed = deptNoShow ? deptNoShow.noShowCount : 0;
      const diff = parseFloat((rate - kpis.noShowRate).toFixed(1));

      const evidencePoints = [
        `${deptName} No-Show Rate: ${rate}% (${missed.toLocaleString()} missed appointments out of ${scheduled.toLocaleString()} scheduled visits).`,
        `Hospital-wide Average No-Show Rate: ${kpis.noShowRate}%.`,
        `Variance vs Hospital Benchmark: ${diff > 0 ? `+${diff}` : `${diff}`}% (${diff > 0 ? 'higher' : 'lower'} than hospital average).`,
        `Total Department Patient Volume: ${deptVol?.visits.toLocaleString() || 0} visits (${deptVol?.percentage || 0}% of hospital total).`,
        `Department No-Show Ranking: Rank ${noShowByDept.findIndex((d) => d.department === deptName) + 1} of ${DEPARTMENTS.length} departments.`,
      ];

      if (isWhy) {
        const finding = `${deptName} has a scheduled appointment no-show rate of ${rate}%, compared with a hospital-wide average of ${kpis.noShowRate}%.`;
        const whatDataTellsUs = `The available data establishes that ${deptName} has a ${diff >= 0 ? 'higher' : 'lower'} no-show rate than the hospital average (${diff > 0 ? `+${diff}%` : `${diff}%`}). It does not by itself establish why scheduled patients did not attend.`;
        const potentialFactorsToInvestigate = `The dataset contains variables such as appointment type, day of the week, month of visit, patient age group, gender, and insurance type. These could be analysed to determine whether non-attendance is associated with specific scheduling or demographic segments.`;
        const limitation = `The current analysis does not establish that any particular factor caused ${deptName}'s no-show rate. The dataset does not contain transportation information, socioeconomic information, patient satisfaction, or appointment reminder confirmation logs.`;
        const potentialNextStep = `Analyse no-show rates across appointment days, age groups, and insurance categories to identify whether any measurable relationships exist.`;

        return {
          intent: 'SPECIFIC_DEPARTMENT_NO_SHOW_WHY',
          topic: `${deptName} No-Show Causal Inquiry`,
          entities: [deptName],
          evidencePoints,
          contextData: { department: deptName, noShow: deptNoShow, hospitalBenchmark: kpis.noShowRate },
          hasSufficientData: true,
          isWhyQuestion: true,
          deterministicDraft: {
            finding,
            evidence: evidencePoints,
            interpretation: whatDataTellsUs,
            managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
            whatDataTellsUs,
            potentialFactorsToInvestigate,
            limitation,
            potentialNextStep,
          },
        };
      }

      return {
        intent: 'SPECIFIC_DEPARTMENT_NO_SHOW',
        topic: `${deptName} No-Show Rate Analysis`,
        entities: [deptName],
        evidencePoints,
        contextData: { department: deptName, noShow: deptNoShow, hospitalBenchmark: kpis.noShowRate },
        hasSufficientData: true,
        deterministicDraft: {
          finding: `The no-show rate for ${deptName} is ${rate}%, with ${missed.toLocaleString()} missed appointments out of ${scheduled.toLocaleString()} scheduled visits (hospital average: ${kpis.noShowRate}%).`,
          evidence: evidencePoints,
          interpretation: `Scheduled non-attendance in ${deptName} is ${rate}%. Compared to the hospital average of ${kpis.noShowRate}%, ${deptName} is running ${diff > 0 ? `${diff}% above` : `${Math.abs(diff)}% below`} benchmark.`,
          managementInvestigation: `Analyse scheduled appointment trends across days and demographics for ${deptName} to determine whether reminder adjustments could improve clinic attendance.`,
        },
      };
    }

    // Asking for highest, lowest, or general department no-show rate comparison
    const highest = noShowByDept[0];
    const lowest = noShowByDept[noShowByDept.length - 1];
    const diffHighest = parseFloat((highest.noShowRate - kpis.noShowRate).toFixed(1));

    const evidencePoints = [
      `Highest No-Show Department: ${highest.department} with a no-show rate of ${highest.noShowRate}% (${highest.noShowCount.toLocaleString()} missed appointments out of ${highest.scheduledVisits.toLocaleString()} scheduled visits).`,
      `Hospital-wide Average No-Show Rate: ${kpis.noShowRate}% across all scheduled hospital appointments.`,
      `Variance vs Hospital Benchmark: +${diffHighest}% above hospital average.`,
      `Lowest No-Show Department: ${lowest.department} with a no-show rate of ${lowest.noShowRate}% (${lowest.noShowCount.toLocaleString()} missed out of ${lowest.scheduledVisits.toLocaleString()} scheduled visits).`,
      `Complete Department No-Show Rankings: ${noShowByDept.map((d, idx) => `#${idx + 1} ${d.department}: ${d.noShowRate}% (${d.noShowCount.toLocaleString()}/${d.scheduledVisits.toLocaleString()})`).join(', ')}.`,
    ];

    if (isWhy) {
      const finding = `${highest.department} has the highest no-show rate across all hospital departments at ${highest.noShowRate}%, compared with a hospital-wide average of ${kpis.noShowRate}%.`;
      const whatDataTellsUs = `The available data establishes that ${highest.department} has the highest proportion of missed scheduled visits. It does not by itself establish why scheduled patients did not attend.`;
      const potentialFactorsToInvestigate = `The dataset contains variables such as appointment type, day of the week, month, patient age group, gender, and insurance type. These could be analysed to determine whether missed appointments concentrate within specific scheduling or demographic segments.`;
      const limitation = `The current analysis does not establish that any particular factor caused ${highest.department}'s higher no-show rate. The dataset does not contain transportation information, socioeconomic information, patient satisfaction, or reminder outreach records.`;
      const potentialNextStep = `Analyse no-show rates segmented by day of the week, patient age cohorts, and insurance types to detect whether measurable relationships exist.`;

      return {
        intent: 'HIGHEST_NO_SHOW_DEPARTMENT_WHY',
        topic: 'Highest No-Show Department Causal Inquiry',
        entities: [highest.department, lowest.department],
        evidencePoints,
        contextData: { highest, lowest, rankings: noShowByDept, hospitalAvgNoShow: kpis.noShowRate },
        hasSufficientData: true,
        isWhyQuestion: true,
        deterministicDraft: {
          finding,
          evidence: evidencePoints,
          interpretation: whatDataTellsUs,
          managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
          whatDataTellsUs,
          potentialFactorsToInvestigate,
          limitation,
          potentialNextStep,
        },
      };
    }

    return {
      intent: 'HIGHEST_NO_SHOW_DEPARTMENT',
      topic: 'Department No-Show Rate Analysis',
      entities: [highest.department, lowest.department],
      evidencePoints,
      contextData: { highest, lowest, rankings: noShowByDept, hospitalAvgNoShow: kpis.noShowRate },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${highest.department} has the highest no-show rate across all hospital departments at ${highest.noShowRate}%, with ${highest.noShowCount.toLocaleString()} missed appointments out of ${highest.scheduledVisits.toLocaleString()} scheduled visits.`,
        evidence: evidencePoints,
        interpretation: `${highest.department}'s no-show rate of ${highest.noShowRate}% exceeds the hospital-wide benchmark (${kpis.noShowRate}%) by ${diffHighest}%.`,
        managementInvestigation: `Examine no-show patterns across appointment days and patient demographics for ${highest.department} to identify actionable attendance trends.`,
      },
    };
  }

  // 3. INTENT: Waiting Time Queries (highest, lowest, or general wait times)
  if (
    qLower.includes('waiting time') ||
    qLower.includes('wait time') ||
    qLower.includes('longest wait') ||
    qLower.includes('shortest wait') ||
    qLower.includes('highest wait') ||
    qLower.includes('lowest wait') ||
    qLower.includes('wait duration')
  ) {
    // Specific department wait time query
    if (mentionedDepts.length === 1 && !qLower.includes('which department') && !qLower.includes('highest') && !qLower.includes('longest')) {
      const deptName = mentionedDepts[0];
      const deptWait = waitTimeByDept.find((d) => d.department === deptName);
      const avgWait = deptWait ? deptWait.avgWait : 0;
      const diff = deptWait ? deptWait.diff : 0;

      const evidencePoints = [
        `${deptName} Average Waiting Time: ${avgWait} minutes across ${deptWait?.patientCount.toLocaleString() || 0} visits.`,
        `Hospital-wide Average Waiting Time: ${kpis.avgWaitingTime} minutes.`,
        `Variance vs Hospital Average: ${diff > 0 ? `+${diff}` : `${diff}`} minutes.`,
        `Waiting Time Ranking: Rank ${waitTimeByDept.findIndex((d) => d.department === deptName) + 1} of ${DEPARTMENTS.length} departments.`,
      ];

      if (isWhy) {
        const finding = `${deptName} has an average waiting time of ${avgWait} minutes, compared with a hospital-wide average of ${kpis.avgWaitingTime} minutes.`;
        const whatDataTellsUs = `The available data establishes that ${deptName} has relatively ${diff >= 0 ? 'high' : 'low'} waiting time. It does not by itself establish why the waiting time is ${diff >= 0 ? 'higher' : 'lower'}.`;
        const potentialFactorsToInvestigate = `The dataset contains variables such as doctor availability, patient volume, consultation duration and arrival patterns. These could be analysed to determine whether any are associated with the ${diff >= 0 ? 'higher' : 'lower'} waiting time.`;
        const limitation = `The current analysis does not establish that any particular factor caused ${deptName}'s ${diff >= 0 ? 'higher' : 'lower'} waiting time.`;
        const potentialNextStep = `Analyse waiting time against doctor availability, patient volume, consultation duration and arrival patterns to identify whether any measurable relationships exist.`;

        return {
          intent: 'SPECIFIC_DEPARTMENT_WAIT_TIME_WHY',
          topic: `${deptName} Waiting Time Causal Inquiry`,
          entities: [deptName],
          evidencePoints,
          contextData: { deptWait, hospitalAvg: kpis.avgWaitingTime },
          hasSufficientData: true,
          isWhyQuestion: true,
          deterministicDraft: {
            finding,
            evidence: evidencePoints,
            interpretation: whatDataTellsUs,
            managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
            whatDataTellsUs,
            potentialFactorsToInvestigate,
            limitation,
            potentialNextStep,
          },
        };
      }

      return {
        intent: 'SPECIFIC_DEPARTMENT_WAIT_TIME',
        topic: `${deptName} Waiting Time Analysis`,
        entities: [deptName],
        evidencePoints,
        contextData: { deptWait, hospitalAvg: kpis.avgWaitingTime },
        hasSufficientData: true,
        deterministicDraft: {
          finding: `The average waiting time for ${deptName} is ${avgWait} minutes (${diff > 0 ? `+${diff} minutes above` : `${Math.abs(diff)} minutes below`} the hospital average of ${kpis.avgWaitingTime} minutes).`,
          evidence: evidencePoints,
          interpretation: `${deptName}'s average waiting time is ${avgWait} minutes across ${deptWait?.patientCount.toLocaleString() || 0} visits (hospital average: ${kpis.avgWaitingTime} minutes).`,
          managementInvestigation: `Evaluate clinician roster coverage and patient arrival patterns during peak clinic hours in ${deptName}.`,
        },
      };
    }

    const highest = waitTimeByDept[0];
    const lowest = waitTimeByDept[waitTimeByDept.length - 1];

    const evidencePoints = [
      `Highest Average Waiting Time Department: ${highest.department} at ${highest.avgWait} minutes (${highest.patientCount.toLocaleString()} visits).`,
      `Hospital-wide Average Waiting Time: ${kpis.avgWaitingTime} minutes.`,
      `Variance vs Hospital Average: +${highest.diff} minutes (${Math.round((highest.diff / kpis.avgWaitingTime) * 100)}% above hospital benchmark).`,
      `Lowest Average Waiting Time Department: ${lowest.department} at ${lowest.avgWait} minutes (${lowest.patientCount.toLocaleString()} visits).`,
      `Department Waiting Time Rankings: ${waitTimeByDept.map((d, idx) => `#${idx + 1} ${d.department}: ${d.avgWait}m`).join(', ')}.`,
    ];

    if (isWhy) {
      const finding = `${highest.department} has an average waiting time of ${highest.avgWait} minutes, compared with a hospital-wide average of ${kpis.avgWaitingTime} minutes (+${highest.diff} minutes variance).`;
      const whatDataTellsUs = `The available data establishes that ${highest.department} has the highest waiting time across all 8 departments. It does not by itself establish why the waiting time is higher.`;
      const potentialFactorsToInvestigate = `The dataset contains variables such as doctor availability, patient volume, consultation duration and arrival patterns. These could be analysed to determine whether any are associated with the higher waiting time.`;
      const limitation = `The current analysis does not establish that any particular factor caused ${highest.department}'s higher waiting time.`;
      const potentialNextStep = `Analyse waiting time against doctor availability, patient volume, consultation duration and arrival patterns to identify whether any measurable relationships exist.`;

      return {
        intent: 'HIGHEST_WAITING_TIME_DEPARTMENT_WHY',
        topic: 'Highest Waiting Time Causal Inquiry',
        entities: [highest.department, lowest.department],
        evidencePoints,
        contextData: { highest, lowest, rankings: waitTimeByDept, hospitalAvgWait: kpis.avgWaitingTime },
        hasSufficientData: true,
        isWhyQuestion: true,
        deterministicDraft: {
          finding,
          evidence: evidencePoints,
          interpretation: whatDataTellsUs,
          managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
          whatDataTellsUs,
          potentialFactorsToInvestigate,
          limitation,
          potentialNextStep,
        },
      };
    }

    return {
      intent: 'HIGHEST_WAITING_TIME_DEPARTMENT',
      topic: 'Department Waiting Time Analysis',
      entities: [highest.department, lowest.department],
      evidencePoints,
      contextData: { highest, lowest, rankings: waitTimeByDept, hospitalAvgWait: kpis.avgWaitingTime },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${highest.department} has the highest average waiting time across the hospital at ${highest.avgWait} minutes, exceeding the hospital average of ${kpis.avgWaitingTime} minutes by ${highest.diff} minutes.`,
        evidence: evidencePoints,
        interpretation: `${highest.department}'s average waiting time is ${highest.avgWait} minutes across ${highest.patientCount.toLocaleString()} visits (+${highest.diff}m vs hospital average).`,
        managementInvestigation: `Review attending physician schedules and patient arrival pacing during peak morning hours in ${highest.department}.`,
      },
    };
  }

  // 4. INTENT: Patient Volume / Throughput Queries
  if (
    qLower.includes('volume') ||
    qLower.includes('most patient') ||
    qLower.includes('highest patient') ||
    qLower.includes('busiest') ||
    qLower.includes('patient count') ||
    qLower.includes('throughput') ||
    qLower.includes('encounters')
  ) {
    const top1 = volumeByDept[0];
    const top2 = volumeByDept[1];
    const top3 = volumeByDept[2];

    const evidencePoints = [
      `Highest Volume Department: ${top1.department} with ${top1.visits.toLocaleString()} visits (${top1.percentage}% of all hospital encounters).`,
      `Second Highest Department: ${top2.department} with ${top2.visits.toLocaleString()} visits (${top2.percentage}%).`,
      `Third Highest Department: ${top3.department} with ${top3.visits.toLocaleString()} visits (${top3.percentage}%).`,
      `Total Hospital Patient Volume: ${records.length.toLocaleString()} verified encounter records.`,
      `Complete Volume Breakdown: ${volumeByDept.map((d, idx) => `#${idx + 1} ${d.department}: ${d.visits.toLocaleString()} (${d.percentage}%)`).join(', ')}.`,
    ];

    return {
      intent: 'PATIENT_VOLUME_ANALYSIS',
      topic: 'Department Patient Volume Breakdown',
      entities: [top1.department, top2.department, top3.department],
      evidencePoints,
      contextData: { topVolume: volumeByDept, totalVisits: records.length },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${top1.department} manages the highest patient volume across MediCore Health Network with ${top1.visits.toLocaleString()} visits (${top1.percentage}% of all hospital encounters), followed by ${top2.department} (${top2.visits.toLocaleString()} visits, ${top2.percentage}%).`,
        evidence: evidencePoints,
        interpretation: `High patient volume concentration in ${top1.department} and ${top2.department} places substantial operational load on outpatient clinics, nursing staff, and shared diagnostic imaging services.`,
        managementInvestigation: `Evaluate clinical support staff allocation ratios between high-volume departments and lower-volume specialty clinics, and investigate whether fast-track triage corridors can ease peak check-in crowding.`,
      },
    };
  }

  // 5. INTENT: Diagnostic Test Turnaround Time (TAT) Queries
  if (
    qLower.includes('diagnostic') ||
    qLower.includes('turnaround') ||
    qLower.includes('tat') ||
    qLower.includes('lab') ||
    qLower.includes('test') ||
    qLower.includes('mri') ||
    qLower.includes('ct scan') ||
    qLower.includes('x-ray') ||
    qLower.includes('ultrasound') ||
    qLower.includes('blood test') ||
    qLower.includes('ecg')
  ) {
    const longest = diagnosticTat[0];
    const shortest = diagnosticTat[diagnosticTat.length - 1];

    const evidencePoints = [
      `Longest Turnaround Time Test: ${longest.testType} with an average TAT of ${longest.avgTat} hours (benchmark: ${longest.targetTat}h, variance: +${longest.diff}h).`,
      `Volume for ${longest.testType}: ${longest.volume.toLocaleString()} orders completed; same-day result completion rate: ${longest.sameDayPct}%.`,
      `Shortest Turnaround Time Test: ${shortest.testType} with an average TAT of ${shortest.avgTat} hours (benchmark: ${shortest.targetTat}h, same-day rate: ${shortest.sameDayPct}%).`,
      `Hospital Diagnostic Benchmark TAT: ${kpis.avgDiagnosticTat} hours across all diagnostic categories.`,
      `Diagnostic Test Rankings: ${diagnosticTat.map((t, idx) => `#${idx + 1} ${t.testType}: ${t.avgTat}h (Target: ${t.targetTat}h, Vol: ${t.volume.toLocaleString()})`).join(', ')}.`,
    ];

    if (isWhy) {
      const finding = `${longest.testType} has an average diagnostic turnaround time of ${longest.avgTat} hours, compared with its benchmark of ${longest.targetTat} hours and a hospital diagnostic average of ${kpis.avgDiagnosticTat} hours.`;
      const whatDataTellsUs = `The available data establishes that ${longest.testType} has the longest turnaround time and a same-day completion rate of ${longest.sameDayPct}%. It does not by itself establish what caused the turnaround time to exceed target.`;
      const potentialFactorsToInvestigate = `The dataset contains variables such as diagnostic test volume, ordering department, day of the week, and month. These could be analysed to determine whether test volumes or ordering clinic workflows are associated with the longer turnaround time.`;
      const limitation = `The current analysis does not establish that any particular factor caused ${longest.testType}'s longer turnaround time. The dataset does not contain equipment downtime logs, radiologist or lab technician staffing shifts, or transport times between clinical units and the imaging suite.`;
      const potentialNextStep = `Analyse diagnostic turnaround time against order volumes, ordering departments, and days of the week to identify whether measurable relationships exist.`;

      return {
        intent: 'DIAGNOSTIC_TAT_ANALYSIS_WHY',
        topic: 'Diagnostic Turnaround Time Causal Inquiry',
        entities: [longest.testType, shortest.testType],
        evidencePoints,
        contextData: { longest, shortest, diagnosticTat, hospitalAvgTat: kpis.avgDiagnosticTat },
        hasSufficientData: true,
        isWhyQuestion: true,
        deterministicDraft: {
          finding,
          evidence: evidencePoints,
          interpretation: whatDataTellsUs,
          managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
          whatDataTellsUs,
          potentialFactorsToInvestigate,
          limitation,
          potentialNextStep,
        },
      };
    }

    return {
      intent: 'DIAGNOSTIC_TAT_ANALYSIS',
      topic: 'Diagnostic Turnaround Time (TAT) Analysis',
      entities: [longest.testType, shortest.testType],
      evidencePoints,
      contextData: { longest, shortest, diagnosticTat, hospitalAvgTat: kpis.avgDiagnosticTat },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${longest.testType} has the longest diagnostic turnaround time across the hospital at ${longest.avgTat} hours, exceeding its clinical target of ${longest.targetTat} hours by +${longest.diff} hours.`,
        evidence: evidencePoints,
        interpretation: `Turnaround times for ${longest.testType} average ${longest.avgTat} hours compared to clinical target ${longest.targetTat} hours. Same-day completion is ${longest.sameDayPct}%.`,
        managementInvestigation: `Review ordering volume distributions and diagnostic test scheduling across clinical departments.`,
      },
    };
  }

  // 6. INTENT: Bed Occupancy / Inpatient Ward Queries
  if (
    qLower.includes('ward') ||
    qLower.includes('occupancy') ||
    qLower.includes('bed') ||
    qLower.includes('icu') ||
    qLower.includes('inpatient') ||
    qLower.includes('admitted') ||
    qLower.includes('capacity')
  ) {
    const highest = bedOccupancy[0];
    const lowest = bedOccupancy[bedOccupancy.length - 1];

    const evidencePoints = [
      `Highest Bed Occupancy Ward: ${highest.ward} at ${highest.occupancyPct}% occupancy (${highest.admissionsCount.toLocaleString()} admissions, discharge delay rate: ${highest.delayRate}%).`,
      `Clinical Warning Threshold: ${highest.warningThreshold}% occupancy (status: ${highest.isWarning ? 'CRITICAL - Exceeds safe operational threshold' : 'Optimal - Within target threshold'}).`,
      `Hospital-wide Inpatient Bed Occupancy: ${kpis.bedOccupancy}%.`,
      `Lowest Occupancy Ward: ${lowest.ward} at ${lowest.occupancyPct}% (${lowest.admissionsCount.toLocaleString()} admissions).`,
      `All Inpatient Wards: ${bedOccupancy.map((w) => `${w.ward}: ${w.occupancyPct}% occupancy (Admissions: ${w.admissionsCount.toLocaleString()}, Delayed Discharges: ${w.delayRate}%)`).join('; ')}.`,
    ];

    if (isWhy) {
      const finding = `${highest.ward} has an average bed occupancy rate of ${highest.occupancyPct}%, compared with a hospital-wide bed occupancy average of ${kpis.bedOccupancy}%.`;
      const whatDataTellsUs = `The available data establishes that ${highest.ward} has relatively high bed occupancy and a ${highest.delayRate}% delayed discharge rate. It does not by itself establish what caused the occupancy level.`;
      const potentialFactorsToInvestigate = `The dataset contains variables such as admitting department, patient volume, length of stay in days, and discharge delay status. These could be analysed to determine whether specific clinical services or stay durations are associated with the higher occupancy.`;
      const limitation = `The current analysis does not establish that any particular factor caused ${highest.ward}'s higher occupancy. The dataset does not contain nurse-to-patient staffing ratios, patient clinical acuity scores, or post-discharge care facility placement availability.`;
      const potentialNextStep = `Analyse length of stay distributions and discharge delay frequencies across admitting departments to determine whether measurable correlations exist.`;

      return {
        intent: 'BED_OCCUPANCY_ANALYSIS_WHY',
        topic: 'Inpatient Bed Occupancy Causal Inquiry',
        entities: [highest.ward, lowest.ward],
        evidencePoints,
        contextData: { highest, lowest, bedOccupancy, hospitalBedOcc: kpis.bedOccupancy },
        hasSufficientData: true,
        isWhyQuestion: true,
        deterministicDraft: {
          finding,
          evidence: evidencePoints,
          interpretation: whatDataTellsUs,
          managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
          whatDataTellsUs,
          potentialFactorsToInvestigate,
          limitation,
          potentialNextStep,
        },
      };
    }

    return {
      intent: 'BED_OCCUPANCY_ANALYSIS',
      topic: 'Inpatient Bed Occupancy & Capacity',
      entities: [highest.ward, lowest.ward],
      evidencePoints,
      contextData: { highest, lowest, bedOccupancy, hospitalBedOcc: kpis.bedOccupancy },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${highest.ward} has the highest bed occupancy across MediCore Health Network at ${highest.occupancyPct}%, ${highest.isWarning ? 'exceeding' : 'approaching'} the 85% clinical strain warning threshold with a ${highest.delayRate}% discharge delay rate.`,
        evidence: evidencePoints,
        interpretation: `Inpatient bed occupancy in ${highest.ward} is ${highest.occupancyPct}% with a discharge delay rate of ${highest.delayRate}%.`,
        managementInvestigation: `Review discharge coordination workflows and length of stay patterns for admitted patients in ${highest.ward}.`,
      },
    };
  }

  // 7. INTENT: Length of Stay (LOS) Queries
  if (
    qLower.includes('length of stay') ||
    qLower.includes('los') ||
    qLower.includes('stay duration') ||
    qLower.includes('days admitted')
  ) {
    const highestLos = losByDept[0];
    const lowestLos = losByDept[losByDept.length - 1];

    const evidencePoints = [
      `Highest Length of Stay Department: ${highestLos.department} with an average of ${highestLos.avgLosDays} days (${highestLos.admissions.toLocaleString()} admissions).`,
      `Hospital-wide Average Length of Stay: ${kpis.avgLengthOfStay} days across all admitted encounters.`,
      `Lowest Length of Stay Department: ${lowestLos.department} with an average of ${lowestLos.avgLosDays} days (${lowestLos.admissions.toLocaleString()} admissions).`,
      `LOS Rankings by Department: ${losByDept.map((d, idx) => `#${idx + 1} ${d.department}: ${d.avgLosDays}d (${d.admissions.toLocaleString()} adm)`).join(', ')}.`,
    ];

    if (isWhy) {
      const finding = `${highestLos.department} records the longest average length of stay at ${highestLos.avgLosDays} days, compared with a hospital-wide average of ${kpis.avgLengthOfStay} days.`;
      const whatDataTellsUs = `The available data establishes that ${highestLos.department} has the highest average length of stay across admitted patients. It does not by itself establish what caused the stay duration.`;
      const potentialFactorsToInvestigate = `The dataset contains variables such as admission ward, patient age, gender, insurance type, and discharge delay status. These could be analysed to examine whether longer hospital stays associate with specific demographic cohorts or discharge delay flags.`;
      const limitation = `The current analysis does not establish that any particular factor caused ${highestLos.department}'s longer length of stay. The dataset does not track patient clinical case-mix acuity, post-operative complication rates, or rehabilitation bed availability.`;
      const potentialNextStep = `Analyse length of stay by patient age group and discharge delay status to determine if measurable relationships exist.`;

      return {
        intent: 'LENGTH_OF_STAY_ANALYSIS_WHY',
        topic: 'Length of Stay Causal Inquiry',
        entities: [highestLos.department, lowestLos.department],
        evidencePoints,
        contextData: { highestLos, lowestLos, losByDept, hospitalAvgLos: kpis.avgLengthOfStay },
        hasSufficientData: true,
        isWhyQuestion: true,
        deterministicDraft: {
          finding,
          evidence: evidencePoints,
          interpretation: whatDataTellsUs,
          managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
          whatDataTellsUs,
          potentialFactorsToInvestigate,
          limitation,
          potentialNextStep,
        },
      };
    }

    return {
      intent: 'LENGTH_OF_STAY_ANALYSIS',
      topic: 'Department Length of Stay (LOS) Analysis',
      entities: [highestLos.department, lowestLos.department],
      evidencePoints,
      contextData: { highestLos, lowestLos, losByDept, hospitalAvgLos: kpis.avgLengthOfStay },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `${highestLos.department} records the longest average length of stay at ${highestLos.avgLosDays} days across ${highestLos.admissions.toLocaleString()} admissions (hospital average: ${kpis.avgLengthOfStay} days).`,
        evidence: evidencePoints,
        interpretation: `Average length of stay in ${highestLos.department} is ${highestLos.avgLosDays} days across ${highestLos.admissions.toLocaleString()} admissions.`,
        managementInvestigation: `Review discharge planning milestones and ward transition protocols for ${highestLos.department}.`,
      },
    };
  }

  // 8. INTENT: Monthly Trends & Financial Performance Queries
  if (
    qLower.includes('month') ||
    qLower.includes('trend') ||
    qLower.includes('six months') ||
    qLower.includes('6 months') ||
    qLower.includes('over time') ||
    qLower.includes('billing') ||
    qLower.includes('revenue') ||
    qLower.includes('financial') ||
    qLower.includes('claim') ||
    qLower.includes('outstanding')
  ) {
    const firstMonth = monthlyVolume[0];
    const lastMonth = monthlyVolume[monthlyVolume.length - 1];
    let peakVolMonth = monthlyVolume[0];
    monthlyVolume.forEach((m) => {
      if (m.total > peakVolMonth.total) peakVolMonth = m;
    });

    const totalBilled = monthlyBilling.reduce((acc, m) => acc + m.totalBilled, 0);
    const totalClaimed = monthlyBilling.reduce((acc, m) => acc + m.insuranceClaimed, 0);
    const totalOutstanding = monthlyBilling.reduce((acc, m) => acc + m.outstanding, 0);

    const evidencePoints = [
      `Volume Trajectory: Shifted from ${firstMonth.total.toLocaleString()} visits in ${firstMonth.label} to ${lastMonth.total.toLocaleString()} visits in ${lastMonth.label}.`,
      `Peak Encounter Month: ${peakVolMonth.label} with ${peakVolMonth.total.toLocaleString()} patient visits (OPD: ${peakVolMonth.OPD.toLocaleString()}, Emergency: ${peakVolMonth.Emergency.toLocaleString()}, Follow-up: ${peakVolMonth.FollowUp.toLocaleString()}).`,
      `Total Six-Month Hospital Billing: $${totalBilled.toLocaleString()} (Insurance Claims: $${totalClaimed.toLocaleString()}, Outstanding Balance: $${totalOutstanding.toLocaleString()}).`,
      `Monthly Volume Sequence: ${monthlyVolume.map((m) => `${m.label}: ${m.total.toLocaleString()}`).join(' → ')}.`,
      `Monthly Financial Sequence: ${monthlyBilling.map((m) => `${m.label}: Billed $${m.totalBilled.toLocaleString()} / Outst. $${m.outstanding.toLocaleString()}`).join('; ')}.`,
    ];

    return {
      intent: 'MONTHLY_TRENDS_AND_FINANCIAL',
      topic: 'Six-Month Operational & Financial Trends',
      entities: [peakVolMonth.label],
      evidencePoints,
      contextData: { monthlyVolume, monthlyBilling, totalBilled, totalOutstanding, peakMonth: peakVolMonth.label },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `Hospital volume peaked in ${peakVolMonth.label} with ${peakVolMonth.total.toLocaleString()} patient visits. Cumulative billing across the six-month evaluation period totaled $${totalBilled.toLocaleString()}, with $${totalOutstanding.toLocaleString()} currently outstanding.`,
        evidence: evidencePoints,
        interpretation: `Patient demand increased steadily heading into mid-year before stabilizing. Emergency and follow-up ratios remained consistent, while outstanding billing balances follow predictable insurance reimbursement lags.`,
        managementInvestigation: `Review claims processing lead times with top commercial and government payers, and assess clinical capacity buffers in advance of anticipated peak volume months.`,
      },
    };
  }

  // 9. INTENT: Operational Bottlenecks / Management Investigation Patterns
  if (
    qLower.includes('pattern') ||
    qLower.includes('investigate') ||
    qLower.includes('bottleneck') ||
    qLower.includes('problem') ||
    qLower.includes('issue') ||
    qLower.includes('recommend') ||
    qLower.includes('summary') ||
    qLower.includes('overview')
  ) {
    const highestWait = waitTimeByDept[0];
    const highestNoShow = noShowByDept[0];
    const longestTat = diagnosticTat[0];
    const highestWard = bedOccupancy[0];

    const evidencePoints = [
      `Queue Bottleneck: ${highestWait.department} has the highest waiting time at ${highestWait.avgWait} minutes (+${highestWait.diff}m vs hospital avg of ${kpis.avgWaitingTime}m).`,
      `Capacity Waste: ${highestNoShow.department} has the highest no-show rate at ${highestNoShow.noShowRate}% (${highestNoShow.noShowCount.toLocaleString()} missed visits).`,
      `Diagnostic Delay: ${longestTat.testType} has the longest turnaround time at ${longestTat.avgTat} hours (+${longestTat.diff}h above clinical target).`,
      `Inpatient Strain: ${highestWard.ward} is operating at ${highestWard.occupancyPct}% occupancy with ${highestWard.delayRate}% delayed discharges.`,
      `Hospital Total Throughput: ${records.length.toLocaleString()} visits, $${kpis.totalBilling.toLocaleString()} total revenue.`,
    ];

    return {
      intent: 'OPERATIONAL_PATTERNS_SUMMARY',
      topic: 'Key Operational Bottlenecks & Priorities',
      entities: [highestWait.department, highestNoShow.department, longestTat.testType, highestWard.ward],
      evidencePoints,
      contextData: { highestWait, highestNoShow, longestTat, highestWard, kpis },
      hasSufficientData: true,
      deterministicDraft: {
        finding: `MediCore's primary operational vulnerabilities are concentrated in: (1) Outpatient queue delays in ${highestWait.department} (${highestWait.avgWait}m wait), (2) Slot utilization loss in ${highestNoShow.department} (${highestNoShow.noShowRate}% no-shows), (3) Diagnostic TAT delays in ${longestTat.testType} (${longestTat.avgTat}h), and (4) Bed occupancy strain in ${highestWard.ward} (${highestWard.occupancyPct}%).`,
        evidence: evidencePoints,
        interpretation: `These four interrelated operational pressures create cross-departmental friction: slow diagnostic turnaround extends clinic waits, outpatient queues discourage appointment punctuality, and ward discharge delays block emergency admissions.`,
        managementInvestigation: `Prioritize four immediate management interventions: (1) Staggered morning clinic arrival slots in ${highestWait.department}, (2) Automated SMS reminders and 5% overbooking in ${highestNoShow.department}, (3) Dedicated inpatient scanning windows for ${longestTat.testType}, and (4) Rapid morning discharge rounds in ${highestWard.ward}.`,
      },
    };
  }

  // 10. DEFAULT / GENERAL FALLBACK: Provide verified comprehensive hospital facts
  const highestWait = waitTimeByDept[0];
  const highestNoShow = noShowByDept[0];
  const topVol = volumeByDept[0];
  const longestTat = diagnosticTat[0];
  const highestWard = bedOccupancy[0];

  const evidencePoints = [
    `Total Verified Encounter Dataset: ${records.length.toLocaleString()} visits across 8 clinical departments.`,
    `Hospital-wide Average Waiting Time: ${kpis.avgWaitingTime} minutes (Highest: ${highestWait.department} at ${highestWait.avgWait}m).`,
    `Hospital-wide Scheduled No-Show Rate: ${kpis.noShowRate}% (Highest: ${highestNoShow.department} at ${highestNoShow.noShowRate}%).`,
    `Highest Volume Department: ${topVol.department} with ${topVol.visits.toLocaleString()} visits (${topVol.percentage}% of total).`,
    `Diagnostic Test Performance: Average TAT of ${kpis.avgDiagnosticTat} hours (Longest: ${longestTat.testType} at ${longestTat.avgTat}h).`,
    `Inpatient Bed Occupancy: Average of ${kpis.bedOccupancy}% (Highest: ${highestWard.ward} at ${highestWard.occupancyPct}%).`,
    `Financial Performance: Total Billed = $${kpis.totalBilling.toLocaleString()}, Total Claims = $${kpis.totalClaimAmount.toLocaleString()}, Outstanding = $${kpis.totalOutstanding.toLocaleString()}.`,
  ];

  if (isWhy) {
    const finding = `Across ${records.length.toLocaleString()} patient encounters, MediCore Health Network maintains an average waiting time of ${kpis.avgWaitingTime} minutes, a scheduled no-show rate of ${kpis.noShowRate}%, and an inpatient bed occupancy rate of ${kpis.bedOccupancy}%.`;
    const whatDataTellsUs = `The available data establishes the observed operational values across hospital departments and units. It does not by itself establish what caused these values.`;
    const potentialFactorsToInvestigate = `The dataset contains variables such as doctor availability, patient volume, consultation duration, appointment type, arrival patterns, patient age group, gender, insurance type, length of stay, and diagnostic test types. These could be analysed to examine whether measurable associations exist.`;
    const limitation = `The current analysis does not establish that any particular factor caused the observed operational values. The dataset does not contain transportation information, socioeconomic information, patient satisfaction, or registration processing times.`;
    const potentialNextStep = `Formulate focused operational analyses correlating the specific metric of interest against available scheduling, clinician availability, or demographic variables in the dataset.`;

    return {
      intent: 'GENERAL_HOSPITAL_OPERATIONS_WHY',
      topic: 'General Operational Causal Inquiry',
      entities: [topVol.department, highestWait.department, highestNoShow.department],
      evidencePoints,
      contextData: { kpis, highestWait, highestNoShow, topVol, longestTat, highestWard },
      hasSufficientData: true,
      isWhyQuestion: true,
      deterministicDraft: {
        finding,
        evidence: evidencePoints,
        interpretation: whatDataTellsUs,
        managementInvestigation: `${potentialFactorsToInvestigate}\n\nLimitation: ${limitation}\n\nNext step: ${potentialNextStep}`,
        whatDataTellsUs,
        potentialFactorsToInvestigate,
        limitation,
        potentialNextStep,
      },
    };
  }

  return {
    intent: 'GENERAL_HOSPITAL_OPERATIONS',
    topic: 'MediCore Hospital Operations Overview',
    entities: [topVol.department, highestWait.department, highestNoShow.department],
    evidencePoints,
    contextData: { kpis, highestWait, highestNoShow, topVol, longestTat, highestWard },
    hasSufficientData: true,
    deterministicDraft: {
      finding: `Across ${records.length.toLocaleString()} patient encounters, MediCore Health Network maintains an average waiting time of ${kpis.avgWaitingTime} minutes, a scheduled no-show rate of ${kpis.noShowRate}%, and an inpatient bed occupancy rate of ${kpis.bedOccupancy}%.`,
      evidence: evidencePoints,
      interpretation: `Hospital operational metrics demonstrate stable high-volume throughput across departments.`,
      managementInvestigation: `Review department-specific operational metrics against clinical targets to identify priority improvement opportunities.`,
    },
  };
}
