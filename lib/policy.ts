import { EligibilityPolicy } from "@/types";

export const defaultPolicy: EligibilityPolicy = {
  minPassportValidityMonths: 6,
  minApplicantAge: 18,
  maxApplicantAge: 75,
  prohibitedNationalities: [],
  requireDocumentTypes: ["passport"],
  visaTypeRules: {
    tourist: {
      minAge: 0,
      maxStayDays: 90,
      notes: "Standard tourist visa requirements"
    },
    business: {
      minAge: 21,
      maxStayDays: 90,
      notes: "Business visits require invitation letter"
    },
    work: {
      minAge: 21,
      maxStayDays: 365,
      notes: "Work visas require sponsorship documentation"
    }
  }
};

export function sanitizePolicy(input: Partial<EligibilityPolicy> | null | undefined): EligibilityPolicy {
  if (!input) return structuredClone(defaultPolicy);
  return {
    minPassportValidityMonths: input.minPassportValidityMonths ?? defaultPolicy.minPassportValidityMonths,
    minApplicantAge: input.minApplicantAge ?? defaultPolicy.minApplicantAge,
    maxApplicantAge: input.maxApplicantAge ?? defaultPolicy.maxApplicantAge,
    prohibitedNationalities: input.prohibitedNationalities ?? [],
    requireDocumentTypes: input.requireDocumentTypes ?? defaultPolicy.requireDocumentTypes,
    visaTypeRules: Object.keys(input.visaTypeRules ?? {}).length
      ? Object.fromEntries(
          Object.entries(input.visaTypeRules!).map(([key, value]) => [
            key.toLowerCase(),
            {
              minAge: value?.minAge ?? defaultPolicy.minApplicantAge,
              maxStayDays: value?.maxStayDays ?? 90,
              notes: value?.notes
            }
          ])
        )
      : defaultPolicy.visaTypeRules
  };
}
