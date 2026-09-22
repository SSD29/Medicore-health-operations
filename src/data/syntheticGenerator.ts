import {
  AgeGroup,
  AppointmentType,
  DepartmentName,
  DiagnosticTestType,
  Gender,
  InsuranceType,
  PatientVisitRecord,
  VisitType,
  WardType,
} from '../types';
import {
  AGE_GROUPS,
  DEPARTMENT_CONFIG,
  DEPARTMENTS,
  DOCTORS,
  INSURANCE_TYPES,
  TEST_BENCHMARKS,
  WARDS,
} from './hospitalMetadata';

// Seeded pseudorandom number generator (Mulberry32) for fast reproducible results
function createSeededRandom(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Format integer with leading zeros
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// Convert minute of day to "HH:MM"
function formatTime(minuteOfDay: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minuteOfDay)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function generateHospitalDataset(targetCount: number = 15000): PatientVisitRecord[] {
  const rand = createSeededRandom(428190);
  const records: PatientVisitRecord[] = [];

  // 6-month date range: 2026-03-01 to 2026-08-31 (184 days)
  const startDate = new Date(2026, 2, 1); // March 1, 2026
  const totalDays = 184;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Pre-calculate daily operational factors across the 184 days for realistic temporal correlation
  interface DayContext {
    dateStr: string;
    monthStr: string;
    dayOfWeek: string;
    volumeMultiplier: number;
    wardOccupancy: Record<WardType, number>;
    deptDoctorAvailability: Record<DepartmentName, { available: boolean; staffPct: number }>;
    diagnosticCongestionFactor: number;
  }

  const dayContexts: DayContext[] = [];

  for (let d = 0; d < totalDays; d++) {
    const curDate = new Date(startDate.getTime() + d * 86400000);
    const yyyy = curDate.getFullYear();
    const mm = pad2(curDate.getMonth() + 1);
    const dd = pad2(curDate.getDate());
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const monthStr = `${yyyy}-${mm}`;
    const dayOfWeek = dayNames[curDate.getDay()];

    // Month wave: July (month 07) and August (month 08) experience higher volume surge
    const monthIdx = curDate.getMonth(); // 2 = Mar, 7 = Aug
    const monthFactor = 1.0 + 0.18 * Math.sin(((monthIdx - 2) / 5) * Math.PI);

    // Day of week wave: Mon-Tue high (1.2), Fri moderate (1.0), Sun low (0.7)
    let dowFactor = 1.0;
    if (dayOfWeek === 'Monday' || dayOfWeek === 'Tuesday') dowFactor = 1.25;
    else if (dayOfWeek === 'Wednesday' || dayOfWeek === 'Thursday') dowFactor = 1.1;
    else if (dayOfWeek === 'Friday') dowFactor = 0.95;
    else if (dayOfWeek === 'Saturday') dowFactor = 0.75;
    else dowFactor = 0.65;

    // Ward occupancy cycles (some periods hit >85-94% peak)
    // General Ward baseline ~78% +- 14%
    const occWave = Math.sin((d / 184) * 4 * Math.PI);
    const baseOcc = 76 + occWave * 12 + (rand() * 8 - 4);
    const gwOcc = Math.min(97, Math.max(58, Math.round(baseOcc + 2)));
    const pwOcc = Math.min(94, Math.max(50, Math.round(baseOcc - 6 + rand() * 10)));
    const icuOcc = Math.min(98, Math.max(62, Math.round(baseOcc + 4 + rand() * 8)));

    // Doctor availability per department
    const deptDoctorAvailability: Record<DepartmentName, { available: boolean; staffPct: number }> =
      {} as any;
    DEPARTMENTS.forEach((dept) => {
      // 91% baseline availability, some days drop to 70% due to rotations/leave
      const isAvailable = rand() > 0.08;
      const staffPct = Math.round(isAvailable ? 78 + rand() * 22 : 55 + rand() * 25);
      deptDoctorAvailability[dept] = { available: isAvailable, staffPct };
    });

    // Diagnostic lab congestion factor
    const diagnosticCongestionFactor = Math.max(0.75, Math.min(1.45, dowFactor * monthFactor + (rand() * 0.3 - 0.15)));

    dayContexts.push({
      dateStr,
      monthStr,
      dayOfWeek,
      volumeMultiplier: monthFactor * dowFactor,
      wardOccupancy: {
        'General Ward': gwOcc,
        'Private Ward': pwOcc,
        'ICU': icuOcc,
      },
      deptDoctorAvailability,
      diagnosticCongestionFactor,
    });
  }

  // Pre-calculate department cumulative distribution
  const deptEntries = Object.entries(DEPARTMENT_CONFIG) as [DepartmentName, typeof DEPARTMENT_CONFIG[DepartmentName]][];
  const totalWeight = deptEntries.reduce((acc, [, conf]) => acc + conf.volumeWeight, 0);

  // Doctor lookup by department
  const doctorsByDept: Record<DepartmentName, typeof DOCTORS> = {} as any;
  DEPARTMENTS.forEach((dept) => {
    doctorsByDept[dept] = DOCTORS.filter((doc) => doc.department === dept);
  });

  // Generate records
  for (let i = 0; i < targetCount; i++) {
    // Select day with volume distribution
    const dayIdx = Math.floor(rand() * totalDays);
    const dayCtx = dayContexts[dayIdx];

    // Pick department weighted
    let rDept = rand() * totalWeight;
    let selectedDept: DepartmentName = 'General Medicine';
    for (const [dept, conf] of deptEntries) {
      if (rDept <= conf.volumeWeight) {
        selectedDept = dept;
        break;
      }
      rDept -= conf.volumeWeight;
    }
    const deptConfig = DEPARTMENT_CONFIG[selectedDept];

    // Visit type: Emergency dept is 100% Emergency. Others: OPD 74%, Follow-up 23%, Emergency 3%
    let visitType: VisitType = 'OPD';
    if (selectedDept === 'Emergency') {
      visitType = 'Emergency';
    } else {
      const vtRand = rand();
      if (vtRand < 0.74) visitType = 'OPD';
      else if (vtRand < 0.97) visitType = 'Follow-up';
      else visitType = 'Emergency';
    }

    // Appointment type: Emergency visits are always Walk-in.
    // Routine OPD: 72% Scheduled, 28% Walk-in. Follow-up: 88% Scheduled, 12% Walk-in.
    let appointmentType: AppointmentType = 'Scheduled';
    if (visitType === 'Emergency') {
      appointmentType = 'Walk-in';
    } else if (visitType === 'OPD') {
      appointmentType = rand() < 0.72 ? 'Scheduled' : 'Walk-in';
    } else {
      appointmentType = rand() < 0.88 ? 'Scheduled' : 'Walk-in';
    }

    // Patient demographics
    // Age based on department specialty
    let age = 38;
    if (selectedDept === 'Paediatrics') {
      age = Math.floor(rand() * 17);
    } else if (selectedDept === 'Obstetrics & Gynaecology') {
      age = Math.floor(18 + rand() * 32);
    } else if (selectedDept === 'Cardiology' || selectedDept === 'Neurology') {
      age = Math.floor(35 + rand() * 52);
    } else if (selectedDept === 'Orthopaedics') {
      age = Math.floor(22 + rand() * 62);
    } else {
      age = Math.floor(rand() * 88);
    }
    age = Math.max(0, Math.min(100, age));

    // Age group
    let ageGroup: AgeGroup = '36-50';
    if (age <= 17) ageGroup = '0-17';
    else if (age <= 35) ageGroup = '18-35';
    else if (age <= 50) ageGroup = '36-50';
    else if (age <= 65) ageGroup = '51-65';
    else ageGroup = '65+';

    // Gender
    let gender: Gender = 'Male';
    if (selectedDept === 'Obstetrics & Gynaecology') {
      gender = 'Female';
    } else {
      const gRand = rand();
      if (gRand < 0.49) gender = 'Female';
      else if (gRand < 0.98) gender = 'Male';
      else gender = 'Other';
    }

    // Insurance type
    let insuranceType: InsuranceType = 'Private Insurance';
    const insRand = rand();
    if (insRand < 0.52) insuranceType = 'Private Insurance';
    else if (insRand < 0.84) insuranceType = 'Government Insurance';
    else insuranceType = 'Self-pay';

    // Doctor selection
    const deptDocs = doctorsByDept[selectedDept];
    const assignedDoctor = deptDocs[Math.floor(rand() * deptDocs.length)];
    const deptAvail = dayCtx.deptDoctorAvailability[selectedDept];
    const doctorAvailable = deptAvail.available;
    const staffAvailabilityPct = deptAvail.staffPct;

    // PATTERN C: No-show and Cancellation
    // Walk-in patients CANNOT be no-shows (Rule 4: walk-in visits should not be treated as no-shows).
    // Scheduled appointments have meaningful no-show rates (10% - 20%), varying by dept, age, day of week.
    let isNoShow = false;
    let isCancellation = false;

    if (appointmentType === 'Scheduled') {
      // Base no-show likelihood
      let noShowChance = 0.11;
      // Department nuances
      if (selectedDept === 'Orthopaedics' || selectedDept === 'General Medicine') noShowChance += 0.04;
      if (selectedDept === 'Paediatrics') noShowChance -= 0.03;
      // Age nuances (young adults miss more than seniors)
      if (ageGroup === '18-35') noShowChance += 0.04;
      if (ageGroup === '65+') noShowChance -= 0.03;
      // Day of week nuances (Friday and Saturday slightly higher)
      if (dayCtx.dayOfWeek === 'Friday' || dayCtx.dayOfWeek === 'Saturday') noShowChance += 0.03;

      const roll = rand();
      if (roll < noShowChance) {
        isNoShow = true;
      } else if (roll < noShowChance + 0.04) {
        isCancellation = true;
      }
    }

    // Time schedule calculation
    // Hospital operates outpatient clinics 08:00 to 18:00 (minute 480 to 1080); ER is 24/7 (minute 0 to 1439)
    let appointmentMinute: number | null = null;
    let arrivalMinute: number;

    if (visitType === 'Emergency') {
      arrivalMinute = Math.floor(rand() * 1440);
    } else {
      // Peak morning clinic rush between 09:00 - 11:30 and afternoon 14:00 - 16:30
      const morningBias = rand() < 0.65;
      if (morningBias) {
        arrivalMinute = Math.floor(480 + rand() * 240); // 08:00 - 12:00
      } else {
        arrivalMinute = Math.floor(780 + rand() * 240); // 13:00 - 17:00
      }
    }

    if (appointmentType === 'Scheduled') {
      // Arrives -20 to +15 mins from scheduled appointment
      const arrivalOffset = Math.floor(rand() * 35) - 20;
      appointmentMinute = Math.max(480, arrivalMinute - arrivalOffset);
    }

    // OPERATIONAL VARIABLES: Waiting Time & Consultation Start
    let consultationStartMinute: number | null = null;
    let waitingTimeMinutes: number | null = null;
    let consultationDurationMinutes: number | null = null;

    if (!isNoShow && !isCancellation) {
      // PATTERN A & B: Congestion & Doctor Availability Impact on Wait Time
      let wait = deptConfig.baseWaitMinutes;

      // Peak hour penalty (09:30 - 11:30 & 14:30 - 16:00)
      if (
        (arrivalMinute >= 570 && arrivalMinute <= 690) ||
        (arrivalMinute >= 870 && arrivalMinute <= 960)
      ) {
        wait += 12 + rand() * 14;
      }

      // Day volume surge
      wait *= dayCtx.volumeMultiplier;

      // Doctor availability impact: if doctor unavailable or reduced staff, wait times spike
      if (!doctorAvailable) {
        wait += 24 + rand() * 20;
      } else if (staffAvailabilityPct < 70) {
        wait += 14 + rand() * 12;
      }

      // Walk-in patients typically wait longer than scheduled
      if (appointmentType === 'Walk-in' && visitType !== 'Emergency') {
        wait += 15 + rand() * 12;
      }

      // Add natural variance
      wait = Math.max(5, Math.round(wait + (rand() * 16 - 8)));
      waitingTimeMinutes = wait;

      consultationStartMinute = arrivalMinute + wait;

      // Consultation duration (10 to 40 mins)
      let baseDur = 15;
      if (selectedDept === 'General Surgery' || selectedDept === 'Neurology') baseDur = 25;
      if (visitType === 'Follow-up') baseDur = 10;
      consultationDurationMinutes = Math.max(6, Math.round(baseDur + rand() * 14));
    }

    // DIAGNOSTICS
    let diagnosticTestOrdered = false;
    let diagnosticTestType: DiagnosticTestType | null = null;
    let diagnosticTatHours: number | null = null;
    let resultSameDay: boolean | null = null;

    if (!isNoShow && !isCancellation) {
      const diagChance = deptConfig.diagnosticLikelihood;
      if (rand() < diagChance) {
        diagnosticTestOrdered = true;
        // Pick primary test for this department
        const possibleTests = deptConfig.primaryTests;
        diagnosticTestType = possibleTests[Math.floor(rand() * possibleTests.length)];
        const testBench = TEST_BENCHMARKS[diagnosticTestType];

        // PATTERN D: Diagnostic Bottleneck (TAT spikes when lab is congested)
        let tat = testBench.baseTatHours * dayCtx.diagnosticCongestionFactor;
        // Natural variance
        tat = parseFloat((tat + (rand() * 1.8 - 0.7)).toFixed(1));
        diagnosticTatHours = Math.max(0.5, tat);

        // Same day result check (usually under 6 hours or scheduled early in day)
        const orderedHour = (consultationStartMinute || arrivalMinute) / 60;
        resultSameDay = diagnosticTatHours <= 6 || (orderedHour < 14 && diagnosticTatHours <= 9);
      }
    }

    // INPATIENT ADMISSION & CAPACITY
    let admission = false;
    let ward: WardType | null = null;
    let lengthOfStayDays: number | null = null;
    let bedOccupancyPctAtAdmission: number | null = null;
    let dischargeDelay: boolean | null = null;

    if (!isNoShow && !isCancellation) {
      let admRate = deptConfig.admissionRate;
      if (visitType === 'Emergency') admRate = 0.36;

      if (rand() < admRate) {
        admission = true;
        // Assign ward
        if (visitType === 'Emergency' && rand() < 0.25) {
          ward = 'ICU';
        } else if (selectedDept === 'Cardiology' && rand() < 0.35) {
          ward = 'ICU';
        } else if (selectedDept === 'Neurology' && rand() < 0.22) {
          ward = 'ICU';
        } else if (insuranceType === 'Private Insurance' && rand() < 0.45) {
          ward = 'Private Ward';
        } else {
          ward = rand() < 0.75 ? 'General Ward' : 'Private Ward';
        }

        bedOccupancyPctAtAdmission = dayCtx.wardOccupancy[ward];

        // Length of stay: ICU is 3-10 days, General 2-6 days, Private 2-5 days
        let baseLos = 3.5;
        if (ward === 'ICU') baseLos = 6.2;
        if (selectedDept === 'General Surgery') baseLos = 4.8;
        if (selectedDept === 'Paediatrics') baseLos = 2.4;
        lengthOfStayDays = Math.max(1, Math.round(baseLos + (rand() * 4 - 1.8)));

        // PATTERN E: High occupancy (>85%) strongly associated with discharge delays
        const highOccupancy = bedOccupancyPctAtAdmission >= 85;
        const delayChance = highOccupancy ? 0.46 : 0.12;
        dischargeDelay = rand() < delayChance;
      }
    }

    // FINANCIAL PERFORMANCE
    // Billing amount calculated logically based on visit type, department, diagnostics, and admission
    let billingAmount = 0;
    if (isNoShow || isCancellation) {
      // Nominal reservation or administrative fee if any, else 0
      billingAmount = isNoShow ? (rand() < 0.3 ? 50 : 0) : 0;
    } else {
      // Base department consultation fee
      let baseFee = deptConfig.avgBilling * (0.8 + rand() * 0.4);
      if (visitType === 'Emergency') baseFee += 350;
      if (visitType === 'Follow-up') baseFee *= 0.6;

      // Diagnostic fee
      if (diagnosticTestOrdered && diagnosticTestType) {
        baseFee += TEST_BENCHMARKS[diagnosticTestType].cost * (0.95 + rand() * 0.15);
      }

      // Admission fee
      if (admission && ward && lengthOfStayDays) {
        const perDiem = ward === 'ICU' ? 2400 : ward === 'Private Ward' ? 950 : 500;
        baseFee += perDiem * lengthOfStayDays;
        if (selectedDept === 'General Surgery') baseFee += 3800; // procedure fee
      }

      billingAmount = Math.round(baseFee);
    }

    // Insurance claim logic
    let insuranceClaim = false;
    let claimAmount: number | null = null;
    let outstandingAmount = billingAmount;

    if (billingAmount > 0 && insuranceType !== 'Self-pay') {
      insuranceClaim = true;
      // Coverage percentage (Private ~80-92%, Govt ~70-85%)
      const coverageRate = insuranceType === 'Private Insurance' ? 0.84 + rand() * 0.12 : 0.72 + rand() * 0.14;
      claimAmount = Math.min(billingAmount, Math.round(billingAmount * Math.min(0.96, coverageRate)));
      // Outstanding amount is patient co-pay or pending insurance balance
      const patientCoPayPaid = rand() < 0.88 ? billingAmount - claimAmount : 0;
      outstandingAmount = Math.max(0, billingAmount - claimAmount - patientCoPayPaid);
    } else if (billingAmount > 0 && insuranceType === 'Self-pay') {
      insuranceClaim = false;
      claimAmount = null;
      // Self-pay collection rate (~82% paid on spot or deposit, ~18% outstanding invoice)
      const isPaid = rand() < 0.82;
      outstandingAmount = isPaid ? 0 : Math.round(billingAmount * (0.3 + rand() * 0.7));
    }

    const visitId = `MED-2026-${pad2(Math.floor(i / 1000) + 1)}-${pad2((i % 1000) + 1).padStart(4, '0')}`;

    records.push({
      visit_id: visitId,
      patient_age: age,
      age_group: ageGroup,
      gender,
      visit_date: dayCtx.dateStr,
      month: dayCtx.monthStr,
      day_of_week: dayCtx.dayOfWeek,
      department: selectedDept,
      visit_type: visitType,
      appointment_type: appointmentType,
      insurance_type: insuranceType,
      appointment_time: appointmentMinute !== null ? formatTime(appointmentMinute) : null,
      arrival_time: formatTime(arrivalMinute),
      consultation_start_time: consultationStartMinute !== null ? formatTime(consultationStartMinute) : null,
      waiting_time_minutes: waitingTimeMinutes,
      consultation_duration_minutes: consultationDurationMinutes,
      doctor_id: assignedDoctor.id,
      doctor_name: assignedDoctor.name,
      doctor_available: doctorAvailable,
      staff_availability_pct: staffAvailabilityPct,
      no_show: isNoShow,
      cancellation: isCancellation,
      diagnostic_test_ordered: diagnosticTestOrdered,
      diagnostic_test_type: diagnosticTestType,
      diagnostic_tat_hours: diagnosticTatHours,
      result_same_day: resultSameDay,
      admission,
      ward,
      length_of_stay_days: lengthOfStayDays,
      bed_occupancy_pct_at_admission: bedOccupancyPctAtAdmission,
      discharge_delay: dischargeDelay,
      billing_amount: billingAmount,
      insurance_claim: insuranceClaim,
      claim_amount: claimAmount,
      outstanding_amount: outstandingAmount,
    });
  }

  return records;
}
