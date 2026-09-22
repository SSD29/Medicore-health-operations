export type DepartmentName =
  | 'General Medicine'
  | 'Cardiology'
  | 'Orthopaedics'
  | 'Paediatrics'
  | 'Obstetrics & Gynaecology'
  | 'Emergency'
  | 'General Surgery'
  | 'Neurology';

export type VisitType = 'OPD' | 'Emergency' | 'Follow-up';

export type AppointmentType = 'Scheduled' | 'Walk-in';

export type InsuranceType = 'Private Insurance' | 'Government Insurance' | 'Self-pay';

export type WardType = 'General Ward' | 'Private Ward' | 'ICU';

export type DiagnosticTestType =
  | 'Blood Panel'
  | 'X-Ray'
  | 'MRI Scan'
  | 'CT Scan'
  | 'Ultrasound'
  | 'ECG';

export type AgeGroup = '0-17' | '18-35' | '36-50' | '51-65' | '65+';

export type Gender = 'Male' | 'Female' | 'Other';

export interface DoctorInfo {
  id: string;
  name: string;
  department: DepartmentName;
  specialty: string;
}

export interface PatientVisitRecord {
  // Patient / Visit Information
  visit_id: string;
  patient_age: number;
  age_group: AgeGroup;
  gender: Gender;
  visit_date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  day_of_week: string; // Monday, Tuesday, etc.
  department: DepartmentName;
  visit_type: VisitType;
  appointment_type: AppointmentType;
  insurance_type: InsuranceType;

  // Operational Variables
  appointment_time: string | null; // e.g. "09:30" or null for walk-ins
  arrival_time: string; // e.g. "09:15"
  consultation_start_time: string | null; // e.g. "09:45" (null if no_show or cancellation)
  waiting_time_minutes: number | null; // minutes between arrival and consultation
  consultation_duration_minutes: number | null; // minutes with doctor
  doctor_id: string;
  doctor_name: string;
  doctor_available: boolean;
  staff_availability_pct: number; // 50 - 100%
  no_show: boolean;
  cancellation: boolean;

  // Diagnostics
  diagnostic_test_ordered: boolean;
  diagnostic_test_type: DiagnosticTestType | null;
  diagnostic_tat_hours: number | null;
  result_same_day: boolean | null;

  // Inpatient Variables
  admission: boolean;
  ward: WardType | null;
  length_of_stay_days: number | null;
  bed_occupancy_pct_at_admission: number | null;
  discharge_delay: boolean | null;

  // Financial Variables
  billing_amount: number;
  insurance_claim: boolean;
  claim_amount: number | null;
  outstanding_amount: number;
}

export interface FilterState {
  month: string; // 'All' or '2026-03' etc.
  department: string; // 'All' or DepartmentName
  visit_type: string; // 'All' or VisitType
  appointment_type: string; // 'All' or AppointmentType
  gender: string; // 'All' or Gender
  age_group: string; // 'All' or AgeGroup
  insurance_type: string; // 'All' or InsuranceType
  ward: string; // 'All' or WardType or 'Not Admitted'
  searchQuery: string;
}

export interface HospitalKPIs {
  totalVisits: number;
  completedVisits: number;
  avgWaitingTime: number; // minutes
  bedOccupancy: number; // percentage
  noShowRate: number; // percentage
  avgDiagnosticTat: number; // hours
  avgLengthOfStay: number; // days
  totalBilling: number; // currency
  totalClaimAmount: number;
  totalOutstanding: number;
  admissionRate: number; // percentage
}

export interface DeterministicInsights {
  highestWaitDept: { department: DepartmentName; avgWait: number };
  lowestWaitDept: { department: DepartmentName; avgWait: number };
  highestVolumeDept: { department: DepartmentName; volume: number; pct: number };
  highestOccupancyWard: { ward: WardType; occupancy: number };
  longestTatTest: { testType: DiagnosticTestType; avgTat: number };
  peakMonth: { month: string; volume: number };
  highestNoShowDept: { department: DepartmentName; rate: number };
}

// ==========================================
// Operations Analyst Agent Types
// ==========================================

export type AgentStatus =
  | 'IDLE'
  | 'PLANNING'
  | 'AWAITING_INVESTIGATION_APPROVAL'
  | 'INVESTIGATING'
  | 'INVESTIGATION_RESULTS'
  | 'AWAITING_ACTION_APPROVAL'
  | 'COMPLETED';

export type AnalyticalToolName =
  | 'getNoShowRateByDepartment'
  | 'getAverageWaitingTimeByDepartment'
  | 'getPatientVolumeByDepartment'
  | 'getDiagnosticTATByTestType'
  | 'getBedOccupancyByWard'
  | 'getAverageLengthOfStayByDepartment'
  | 'getMonthlyPatientVolume'
  | 'getMonthlyBilling'
  | 'getDepartmentComparison'
  | 'getDoctorAvailabilityByDepartment';

export interface ProposedAnalysis {
  id: string;
  toolName: AnalyticalToolName;
  displayName: string;
  parameters?: Record<string, any>;
  whatItCalculates: string;
  whyRelevant: string;
}

export interface InvestigationPlan {
  objective: string;
  proposedAnalyses: ProposedAnalysis[];
  expectedOutput: string;
  limitations: string;
  createdAt: string;
  version: number;
}

export interface ToolExecutionRecord {
  toolName: AnalyticalToolName;
  displayName: string;
  parameters?: Record<string, any>;
  resultSummary: string;
  fullData: any;
  executedAt: string;
  relevanceRationale: string;
}

export interface InvestigationFindings {
  observedFindings: string[];
  supportingEvidence: string[];
  interpretation: string;
  hypotheses: string[];
  confidence: 'High' | 'Moderate' | 'Preliminary';
  evidenceStrengthRationale: string;
  limitations: string[];
}

export interface PotentialAction {
  id: string;
  action: string;
  evidence: string;
  expectedObjective: string;
  additionalInfoNeeded: string;
  risksAndTradeoffs: string;
  suggestedOwner: string;
  suggestedNextStep: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionTimestamp?: string;
}

export interface ApprovedActionPlanItem {
  id: string;
  approvedAction: string;
  evidenceSupporting: string;
  intendedObjective: string;
  informationRequired: string;
  suggestedOwner: string;
  suggestedNextStep: string;
  approvedAt: string;
}

export interface InvestigationTrailEvent {
  timestamp: string;
  stage:
    | 'Objective Defined'
    | 'Plan Proposed'
    | 'Human Feedback Received'
    | 'Human Plan Approved'
    | 'Tool Executed'
    | 'Follow-up Tool Requested'
    | 'Findings Synthesized'
    | 'Recommendations Generated'
    | 'Action Approved'
    | 'Action Rejected';
  title: string;
  description: string;
  details?: Record<string, any>;
}
