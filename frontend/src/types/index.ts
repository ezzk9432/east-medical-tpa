export type UserRole = "CASE_MANAGER" | "MEDICAL_STAFF" | "FINANCE" | "ADMIN" | "VIEWER";

export type CaseStatus = "NEW" | "HAS_SERVICE" | "ASSIST_CLOSE" | "MONEY_PROCESS" | "CLOSED" | "CANCELLED";

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
  nationality?: string | null;
  passportNumber?: string | null;
  policyNumber?: string | null;
  phone?: string | null;
  email?: string | null;
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
}

export interface CaseDocument {
  id: string;
  caseId: string;
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

export interface Case {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  isUrgent: boolean;
  patientId: string;
  patient: Patient;
  contractId?: string | null;
  contract?: Contract | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  medicalInfo?: MedicalInfo | null;
  caseServices?: CaseService[];
  documents?: CaseDocument[];
  notes?: CaseNote[];
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
