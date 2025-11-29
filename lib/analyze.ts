import { ApplicantInput, DocumentAnalysis, VerificationResponse, EligibilityPolicy } from "@/types";
import { runOcr } from "./ocr";
import { detectDocumentType, extractStructuredFields, integrateMrz } from "./extract";
import { findMrzCandidates, parseMrz } from "./mrz";
import { averagedConfidence } from "./utils";
import { evaluateEligibility, globalValidations, validateDocument } from "./validate";

export async function analyzeSingleDocument(
  buffer: Buffer,
  index: number,
  applicant: ApplicantInput
): Promise<DocumentAnalysis> {
  const ocr = await runOcr(buffer);
  const mrzCandidates = findMrzCandidates(ocr.text);
  const mrz = mrzCandidates.length ? parseMrz(mrzCandidates[0]) : null;
  const textFields = extractStructuredFields(ocr.text);
  const mergedFields = integrateMrz(textFields, mrz);
  const detectedType = detectDocumentType(ocr.text) ?? mergedFields.documentType?.value ?? null;

  const documentValidations = validateDocument(
    {
      documentIndex: index,
      detectedType,
      text: ocr.text,
      fields: mergedFields,
      mrz,
      validations: [],
      overallConfidence: 0
    },
    applicant
  );

  const overallConfidence = averagedConfidence([
    ocr.confidence,
    ...Object.values(mergedFields).map((field) => field.confidence),
    ...documentValidations.map((validation) => validation.confidence)
  ]);

  return {
    documentIndex: index,
    detectedType,
    text: ocr.text,
    fields: mergedFields,
    mrz,
    validations: documentValidations,
    overallConfidence
  };
}

export async function verifyDocuments(
  buffers: Buffer[],
  applicant: ApplicantInput,
  policy: EligibilityPolicy
): Promise<VerificationResponse> {
  const analyses: DocumentAnalysis[] = [];
  for (let i = 0; i < buffers.length; i += 1) {
    const analysis = await analyzeSingleDocument(buffers[i], i, applicant);
    analyses.push(analysis);
  }

  const global = globalValidations(analyses);
  const eligibility = evaluateEligibility(applicant, analyses, policy);

  const overallConfidence = averagedConfidence([
    ...analyses.map((doc) => doc.overallConfidence),
    ...global.map((validation) => validation.confidence)
  ]);

  const recommendedActions = [];
  if (eligibility.decision !== "eligible") {
    recommendedActions.push({
      action: "Escalate for manual review",
      priority: "high" as const
    });
  }
  if (analyses.some((doc) => doc.validations.some((validation) => validation.status === "fail"))) {
    recommendedActions.push({
      action: "Request resubmission of unclear or inconsistent documents",
      priority: "medium" as const
    });
  }
  if (!recommendedActions.length) {
    recommendedActions.push({
      action: "Proceed with visa application submission",
      priority: "low" as const
    });
  }

  const summary = `Processed ${analyses.length} document(s); eligibility decision: ${eligibility.decision.toUpperCase()}.`;

  return {
    summary,
    overallConfidence,
    applicant,
    documents: analyses,
    eligibility,
    validations: global,
    recommendedActions
  };
}
