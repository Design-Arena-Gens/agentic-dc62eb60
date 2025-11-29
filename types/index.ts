export type FieldConfidence = {
  label: string;
  value: string | null;
  confidence: number;
  source?: string;
};

export type MrzField = FieldConfidence & {
  raw?: string;
  checksumValid?: boolean;
};

export type ParsedMrz = {
  format: "TD1" | "TD2" | "TD3" | "UNKNOWN";
  raw: string[];
  fields: {
    documentType?: MrzField;
    issuingCountry?: MrzField;
    surnames?: MrzField;
    givenNames?: MrzField;
    passportNumber?: MrzField;
    nationality?: MrzField;
    dateOfBirth?: MrzField;
    sex?: MrzField;
    expiryDate?: MrzField;
    optionalData?: MrzField;
  };
};

export type ValidationResult = {
  id: string;
  status: "pass" | "fail" | "warn";
  message: string;
  confidence: number;
  relatedFields?: string[];
};

export type EligibilityPolicy = {
  minPassportValidityMonths: number;
  minApplicantAge: number;
  maxApplicantAge: number;
  prohibitedNationalities: string[];
  visaTypeRules: Record<
    string,
    {
      minAge: number;
      maxStayDays: number;
      notes?: string;
    }
  >;
  requireDocumentTypes: string[];
};

export type ApplicantInput = {
  fullName: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
};

export type DocumentAnalysis = {
  documentIndex: number;
  detectedType: string | null;
  text: string;
  fields: Record<string, FieldConfidence>;
  mrz?: ParsedMrz | null;
  validations: ValidationResult[];
  overallConfidence: number;
};

export type EligibilityDecision = {
  decision: "eligible" | "ineligible" | "review";
  score: number;
  reasons: string[];
  matchedRules: string[];
};

export type VerificationResponse = {
  summary: string;
  overallConfidence: number;
  applicant: ApplicantInput;
  documents: DocumentAnalysis[];
  eligibility: EligibilityDecision;
  validations: ValidationResult[];
  recommendedActions: { action: string; priority: "low" | "medium" | "high" }[];
};
