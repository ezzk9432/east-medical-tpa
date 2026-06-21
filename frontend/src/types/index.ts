export type UserRole = "CASE_MANAGER" | "MEDICAL_STAFF" | "FINANCE" | "ADMIN" | "VIEWER";

export type CaseStatus = "NEW" | "HAS_SERVICE" | "ASSIST_CLOSE" | "MONEY_PROCESS" | "CLOSED" | "CANCELLED";

export type CaseType = "MEDICAL" | "DENTAL" | "TRAVEL" | "LEGAL" | "OTHER";

export type CaseTypeDetail =
  | "SIMPLE_MEDICAL_OUTPATIENT"
  | "LIGHT_ASSISTANCE_CASE"
  | "HOSPITALIZATION"
  | "EMERGENCY"
  | "REPATRIATION"
  | "EVACUATION"
  | "OTHER";

export type ArrivalChannel = "PHONE" | "EMAIL" | "PORTAL" | "APP" | "WALK_IN" | "OTHER";

export type CaseServiceStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type DocumentCategory = "MEDICAL_REPORT" | "LAB_REPORT" | "POLICY" | "PASSPORT" | "INVOICE" | "OTHER";

export type PaymentStatus = "PENDING" | "PROCESSED" | "PAID" | "REJECTED";

export type Currency = "EUR" | "EGP" | "USD" | "GBP";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  policyNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  province?: string | null;
  county?: string | null;
  district?: string | null;
}

export interface Contract {
  id: string;
  contractNumber: string;
  insurerName: string;
  startDate: string;
  endDate: string;
  deductiblePct: number;
  guaranteedAmount?: number | null;
  currency: Currency;
  isActive: boolean;
  notes?: string | null;
}

export interface Provider {
  id: string;
  name: string;
  type: string;
  country: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface MedicalInfo {
  id: string;
  diagnosis?: string | null;
  icdCode?: string | null;
  symptoms?: string | null;
  treatmentPlan?: string | null;
  attendingDoctor?: string | null;
  admissionDate?: string | null;
  dischargeDate?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: Currency;
  issuedAt: string;
  pdfUrl?: string | null;
}

export interface CaseService {
  id: string;
  caseId: string;
  providerId?: string | null;
  provider?: Provider | null;
  serviceType: string;
  description?: string | null;
  status: CaseServiceStatus;
  priceIn: number;
  priceOut: number;
  currency: Currency;
  exchangeRate: number;
  discountPct: number;
  deductionAmount: number;
  serviceDate?: string | null;
  invoice?: Invoice | null;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  caseServiceId?: string | null;
  category: DocumentCategory;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  version: number;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string };
}

export interface CaseNote {
  id: string;
  content: string;
  authorId?: string | null;
  createdAt: string;
}

export interface CaseDiagnosis {
  id: string;
  label: string;
  icdCode?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CaseActivity {
  id: string;
  message: string;
  createdAt: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  isUrgent: boolean;

  caseType?: CaseType | null;
  caseTypeDetail?: CaseTypeDetail | null;
  arrivalChannel?: ArrivalChannel | null;

  callerName?: string | null;
  callerPhone?: string | null;
  callerEmail?: string | null;
  tourAgency?: string | null;
  customerReference?: string | null;
  description?: string | null;
  noteForProforma?: string | null;

  warrantyStatus?: string | null;
  warrantyCurrency?: Currency | null;
  warrantyLimitAmount?: number | null;

  hasMedicalReport: boolean;
  hasMedicalExpenses: boolean;
  hasPolicyDoc: boolean;
  hasPassportDoc: boolean;

  patientId: string;
  patient: Patient;
  contractId?: string | null;
  contract?: Contract | null;
  clonedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  medicalInfo?: MedicalInfo | null;
  diagnoses?: CaseDiagnosis[];
  caseServices?: CaseService[];
  documents?: CaseDocument[];
  notes?: CaseNote[];
  activities?: CaseActivity[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface DashboardSummary {
  totalCases: number;
  openCases: number;
  closedCases: number;
  urgentCases: number;
  totalProviders: number;
  activeContracts: number;
  pendingPayments: number;
  totalPaidAmount: number;
  casesByStatus: { status: CaseStatus; count: number }[];
}
