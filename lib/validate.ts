import { ApplicantInput, DocumentAnalysis, EligibilityPolicy, ValidationResult } from "@/types";
import { calculateAge, monthsUntil, normalizeName, parseFlexibleDate } from "./utils";

function makeResult(
  id: string,
  status: ValidationResult["status"],
  message: string,
  confidence: number,
  relatedFields?: string[]
): ValidationResult {
  return {
    id,
    status,
    message,
    confidence,
    relatedFields
  };
}

function nameSimilarity(a: string, b: string): number {
  const clean = (value: string) => normalizeName(value).toLowerCase();
  const tokens = (value: string) => clean(value).split(/\s+/).filter(Boolean);
  const aTokens = tokens(a);
  const bTokens = tokens(b);
  if (!aTokens.length || !bTokens.length) return 0;
  let matches = 0;
  aTokens.forEach((token) => {
    if (bTokens.some((candidate) => candidate.startsWith(token) || candidate === token)) {
      matches += 1;
    }
  });
  return Math.round((matches / Math.max(aTokens.length, bTokens.length)) * 100);
}

export function validateDocument(
  document: DocumentAnalysis,
  applicant: ApplicantInput
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { fields, mrz } = document;

  const expiry = fields.expiryDate?.value || null;
  if (expiry) {
    const months = monthsUntil(expiry);
    if (months === null) {
      results.push(makeResult("expiry_parse", "warn", "Unable to parse expiry date", 40, ["expiryDate"]));
    } else if (months < 0) {
      results.push(
        makeResult("expiry_past", "fail", "Document appears to be expired", 90, ["expiryDate"])
      );
    } else if (months < 6) {
      results.push(
        makeResult(
          "expiry_soon",
          "warn",
          `Document expires in less than 6 months (${months} months)`,
          70,
          ["expiryDate"]
        )
      );
    } else {
      results.push(
        makeResult("expiry_valid", "pass", "Expiry date is valid", 85, ["expiryDate"])
      );
    }
  }

  const applicantDob = parseFlexibleDate(applicant.dateOfBirth);
  const docDob = fields.dateOfBirth?.value;
  if (applicantDob && docDob) {
    if (applicantDob === docDob) {
      results.push(
        makeResult("dob_match", "pass", "Applicant date of birth matches document", 90, [
          "dateOfBirth"
        ])
      );
    } else {
      results.push(
        makeResult("dob_mismatch", "fail", "Applicant date of birth does not match document", 90, [
          "dateOfBirth"
        ])
      );
    }
  }

  if (fields.fullName?.value) {
    const similarity = nameSimilarity(fields.fullName.value, applicant.fullName);
    if (similarity > 80) {
      results.push(
        makeResult(
          "name_match",
          "pass",
          "Applicant name aligns with document holder name",
          similarity,
          ["fullName"]
        )
      );
    } else {
      results.push(
        makeResult(
          "name_mismatch",
          "warn",
          "Applicant name differs from document holder name",
          similarity,
          ["fullName"]
        )
      );
    }
  }

  if (fields.passportNumber?.value && applicant.passportNumber) {
    const docPass = fields.passportNumber.value.replace(/[^A-Z0-9]/gi, "");
    const applicantPass = applicant.passportNumber.replace(/[^A-Z0-9]/gi, "");
    if (docPass === applicantPass) {
      results.push(
        makeResult("passport_match", "pass", "Passport number matches application", 95, [
          "passportNumber"
        ])
      );
    } else {
      results.push(
        makeResult(
          "passport_mismatch",
          "fail",
          "Passport number does not match application",
          95,
          ["passportNumber"]
        )
      );
    }
  }

  if (mrz) {
    const checksumFields = Object.entries(mrz.fields).filter(
      ([, value]) => typeof value?.checksumValid === "boolean"
    );
    if (checksumFields.length) {
      const failures = checksumFields.filter(([, value]) => value?.checksumValid === false);
      if (failures.length) {
        results.push(
          makeResult(
            "mrz_checksum_fail",
            "fail",
            "One or more MRZ checksum validations failed",
            95,
            failures.map(([key]) => key)
          )
        );
      } else {
        results.push(
          makeResult("mrz_checksum_pass", "pass", "MRZ check digits validated successfully", 95, [
            ...checksumFields.map(([key]) => key)
          ])
        );
      }
    }
  }

  return results;
}

export function globalValidations(documents: DocumentAnalysis[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!documents.length) {
    results.push(makeResult("documents_missing", "fail", "No readable documents supplied", 30));
  }
  return results;
}

export function evaluateEligibility(
  applicant: ApplicantInput,
  documents: DocumentAnalysis[],
  policy: EligibilityPolicy
) {
  const reasons: string[] = [];
  const matchedRules: string[] = [];
  let score = 75;
  let finalDecision: "eligible" | "ineligible" | "review" = "eligible";

  const primaryDoc = documents[0];
  const expiry = primaryDoc?.fields.expiryDate?.value;
  if (expiry) {
    const months = monthsUntil(expiry);
    if (months !== null && months < policy.minPassportValidityMonths) {
      reasons.push(
        `Passport validity below required minimum of ${policy.minPassportValidityMonths} months`
      );
      score -= 25;
      finalDecision = "ineligible";
    }
  }

  const applicantAge = calculateAge(applicant.dateOfBirth);
  if (applicantAge !== null) {
    if (applicantAge < policy.minApplicantAge) {
      reasons.push(`Applicant younger than required minimum age of ${policy.minApplicantAge}`);
      finalDecision = "ineligible";
      score -= 30;
    } else if (applicantAge > policy.maxApplicantAge) {
      reasons.push(`Applicant exceeds maximum age of ${policy.maxApplicantAge}`);
      finalDecision = "ineligible";
      score -= 30;
    } else {
      matchedRules.push("age_band_ok");
    }
  }

  const nationality = applicant.nationality.toUpperCase();
  if (policy.prohibitedNationalities.map((n) => n.toUpperCase()).includes(nationality)) {
    reasons.push(`Nationality ${applicant.nationality} is not eligible`);
    finalDecision = "ineligible";
    score -= 40;
  } else {
    matchedRules.push("nationality_allowed");
  }

  const visaRule = policy.visaTypeRules[applicant.visaType.toLowerCase()];
  if (visaRule) {
    matchedRules.push(`visa_rule_${applicant.visaType.toLowerCase()}`);
    if (applicantAge !== null && applicantAge < visaRule.minAge) {
      reasons.push(
        `Applicant does not meet minimum age ${visaRule.minAge} for visa type ${applicant.visaType}`
      );
      finalDecision = "ineligible";
      score -= 25;
    }
  } else {
    reasons.push(`No configured policy for visa type ${applicant.visaType}`);
    finalDecision = "review";
    score -= 10;
  }

  const detectedTypes = documents
    .map((doc) => doc.detectedType)
    .filter(Boolean)
    .map((value) => value!.toLowerCase());
  const missingTypes = policy.requireDocumentTypes.filter(
    (type) => !detectedTypes.includes(type.toLowerCase())
  );
  if (missingTypes.length) {
    reasons.push(`Missing required document types: ${missingTypes.join(", ")}`);
    finalDecision = "ineligible";
    score -= 25;
  } else {
    matchedRules.push("required_documents_present");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    decision: finalDecision,
    score,
    reasons,
    matchedRules
  };
}
