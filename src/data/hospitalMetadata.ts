import { DepartmentName, DiagnosticTestType, DoctorInfo, InsuranceType, VisitType, WardType } from '../types';

export const DEPARTMENTS: DepartmentName[] = [
  'General Medicine',
  'Cardiology',
  'Orthopaedics',
  'Paediatrics',
  'Obstetrics & Gynaecology',
  'Emergency',
  'General Surgery',
  'Neurology',
];

export const WARDS: WardType[] = ['General Ward', 'Private Ward', 'ICU'];

export const VISIT_TYPES: VisitType[] = ['OPD', 'Emergency', 'Follow-up'];

export const APPOINTMENT_TYPES = ['Scheduled', 'Walk-in'] as const;

export const INSURANCE_TYPES: InsuranceType[] = [
  'Private Insurance',
  'Government Insurance',
  'Self-pay',
];

export const DIAGNOSTIC_TESTS: DiagnosticTestType[] = [
  'Blood Panel',
  'X-Ray',
  'MRI Scan',
  'CT Scan',
  'Ultrasound',
  'ECG',
];

export const AGE_GROUPS = ['0-17', '18-35', '36-50', '51-65', '65+'] as const;

export const DOCTORS: DoctorInfo[] = [
  // General Medicine
  { id: 'DOC-GM-01', name: 'Dr. Marcus Vance', department: 'General Medicine', specialty: 'Internal Medicine' },
  { id: 'DOC-GM-02', name: 'Dr. Anita Desai', department: 'General Medicine', specialty: 'Preventive Care' },
  { id: 'DOC-GM-03', name: 'Dr. Robert Torres', department: 'General Medicine', specialty: 'Geriatrics' },

  // Cardiology
  { id: 'DOC-CARD-01', name: 'Dr. Elena Rostova', department: 'Cardiology', specialty: 'Interventional Cardiology' },
  { id: 'DOC-CARD-02', name: 'Dr. Jonathan Blake', department: 'Cardiology', specialty: 'Electrophysiology' },

  // Orthopaedics
  { id: 'DOC-ORTHO-01', name: 'Dr. Samuel Mwangi', department: 'Orthopaedics', specialty: 'Joint Reconstruction' },
  { id: 'DOC-ORTHO-02', name: 'Dr. Rachel Kim', department: 'Orthopaedics', specialty: 'Sports Medicine' },

  // Paediatrics
  { id: 'DOC-PED-01', name: 'Dr. Chloe Martin', department: 'Paediatrics', specialty: 'Neonatal & Child Health' },
  { id: 'DOC-PED-02', name: 'Dr. Omar Farooq', department: 'Paediatrics', specialty: 'Paediatric Pulmonology' },

  // Obstetrics & Gynaecology
  { id: 'DOC-OBGYN-01', name: 'Dr. Sarah Sterling', department: 'Obstetrics & Gynaecology', specialty: 'Maternal-Fetal Medicine' },
  { id: 'DOC-OBGYN-02', name: 'Dr. Maya Lin', department: 'Obstetrics & Gynaecology', specialty: 'Gynaecological Surgery' },

  // Emergency
  { id: 'DOC-ER-01', name: 'Dr. David Keller', department: 'Emergency', specialty: 'Trauma & Acute Resuscitation' },
  { id: 'DOC-ER-02', name: 'Dr. Priya Patel', department: 'Emergency', specialty: 'Emergency Medicine' },
  { id: 'DOC-ER-03', name: 'Dr. Lucas Silva', department: 'Emergency', specialty: 'Critical Emergency Care' },

  // General Surgery
  { id: 'DOC-SURG-01', name: 'Dr. Vikram Sethi', department: 'General Surgery', specialty: 'Minimally Invasive Surgery' },
  { id: 'DOC-SURG-02', name: 'Dr. Beatrice Campbell', department: 'General Surgery', specialty: 'Colorectal & General Surgery' },

  // Neurology
  { id: 'DOC-NEURO-01', name: 'Dr. Aris Thorne', department: 'Neurology', specialty: 'Stroke & Vascular Neurology' },
  { id: 'DOC-NEURO-02', name: 'Dr. Christine Huang', department: 'Neurology', specialty: 'Neurophysiology' },
];

export const DEPARTMENT_CONFIG: Record<
  DepartmentName,
  {
    volumeWeight: number;
    baseWaitMinutes: number;
    diagnosticLikelihood: number;
    admissionRate: number;
    avgBilling: number;
    primaryTests: DiagnosticTestType[];
    color: string;
  }
> = {
  'General Medicine': {
    volumeWeight: 0.23, // high OPD congestion
    baseWaitMinutes: 38,
    diagnosticLikelihood: 0.48,
    admissionRate: 0.08,
    avgBilling: 420,
    primaryTests: ['Blood Panel', 'X-Ray', 'ECG', 'Ultrasound'],
    color: '#2563eb', // blue
  },
  'Cardiology': {
    volumeWeight: 0.16, // high volume
    baseWaitMinutes: 44,
    diagnosticLikelihood: 0.82,
    admissionRate: 0.19,
    avgBilling: 1650,
    primaryTests: ['ECG', 'Blood Panel', 'CT Scan', 'MRI Scan'],
    color: '#dc2626', // red
  },
  'Orthopaedics': {
    volumeWeight: 0.17, // high volume
    baseWaitMinutes: 42,
    diagnosticLikelihood: 0.74,
    admissionRate: 0.14,
    avgBilling: 1150,
    primaryTests: ['X-Ray', 'MRI Scan', 'CT Scan'],
    color: '#0891b2', // cyan
  },
  'Paediatrics': {
    volumeWeight: 0.11,
    baseWaitMinutes: 28,
    diagnosticLikelihood: 0.35,
    admissionRate: 0.07,
    avgBilling: 340,
    primaryTests: ['Blood Panel', 'Ultrasound', 'X-Ray'],
    color: '#16a34a', // green
  },
  'Obstetrics & Gynaecology': {
    volumeWeight: 0.09,
    baseWaitMinutes: 32,
    diagnosticLikelihood: 0.65,
    admissionRate: 0.22,
    avgBilling: 1250,
    primaryTests: ['Ultrasound', 'Blood Panel'],
    color: '#db2777', // pink
  },
  'Emergency': {
    volumeWeight: 0.13,
    baseWaitMinutes: 24, // triage-driven but high stress
    diagnosticLikelihood: 0.88,
    admissionRate: 0.34,
    avgBilling: 2100,
    primaryTests: ['CT Scan', 'Blood Panel', 'X-Ray', 'ECG'],
    color: '#ea580c', // orange
  },
  'General Surgery': {
    volumeWeight: 0.06,
    baseWaitMinutes: 35,
    diagnosticLikelihood: 0.78,
    admissionRate: 0.42,
    avgBilling: 2850,
    primaryTests: ['CT Scan', 'Ultrasound', 'Blood Panel', 'MRI Scan'],
    color: '#7c3aed', // violet
  },
  'Neurology': {
    volumeWeight: 0.05,
    baseWaitMinutes: 41,
    diagnosticLikelihood: 0.79,
    admissionRate: 0.18,
    avgBilling: 1950,
    primaryTests: ['MRI Scan', 'CT Scan', 'Blood Panel'],
    color: '#0d9488', // teal
  },
};

export const TEST_BENCHMARKS: Record<
  DiagnosticTestType,
  {
    baseTatHours: number;
    laborIntensity: 'Low' | 'Medium' | 'High';
    cost: number;
    sameDayTargetPct: number;
  }
> = {
  'Blood Panel': { baseTatHours: 2.2, laborIntensity: 'Low', cost: 120, sameDayTargetPct: 0.95 },
  'ECG': { baseTatHours: 1.4, laborIntensity: 'Low', cost: 150, sameDayTargetPct: 0.98 },
  'X-Ray': { baseTatHours: 3.5, laborIntensity: 'Medium', cost: 280, sameDayTargetPct: 0.88 },
  'Ultrasound': { baseTatHours: 4.8, laborIntensity: 'Medium', cost: 380, sameDayTargetPct: 0.82 },
  'CT Scan': { baseTatHours: 6.5, laborIntensity: 'High', cost: 850, sameDayTargetPct: 0.72 },
  'MRI Scan': { baseTatHours: 11.2, laborIntensity: 'High', cost: 1400, sameDayTargetPct: 0.54 },
};
