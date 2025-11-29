import { FieldConfidence, ParsedMrz } from "@/types";
import { normalizeName, parseFlexibleDate } from "./utils";

type FieldMap = Record<string, FieldConfidence>;

function setField(
  fields: FieldMap,
  key: string,
  value: string | null,
  confidence: number,
  source?: string
) {
  if (!value) return;
  const existing = fields[key];
  if (!existing || confidence >= existing.confidence) {
    fields[key] = {
      label: key,
      value,
      confidence: Math.min(100, Math.max(0, confidence)),
      source
    };
  }
}

export function detectDocumentType(text: string): string | null {
  const upper = text.toUpperCase();
  if (upper.includes("PASSPORT")) return "passport";
  if (upper.includes("DRIVING LICENCE") || upper.includes("DRIVER")) return "driving_licence";
  if (upper.includes("IDENTITY CARD") || upper.includes("NATIONAL ID")) return "national_id";
  if (upper.includes("VISA")) return "visa";
  if (upper.includes("PERMIT")) return "permit";
  return null;
}

export function extractStructuredFields(text: string): FieldMap {
  const fields: FieldMap = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const joined = lines.join(" ");
  const passportMatch = joined.match(/(Passport|Document)\s*(No\.?|Number)?\s*[:\-]?\s*([A-Z0-9]{5,})/i);
  if (passportMatch) {
    setField(fields, "passportNumber", passportMatch[3].replace(/[^A-Z0-9]/gi, ""), 65, "text");
  }

  const nationalityMatch = joined.match(/Nationality\s*[:\-]?\s*([A-Z\s]+)/i);
  if (nationalityMatch) {
    setField(fields, "nationality", normalizeName(nationalityMatch[1]), 60, "text");
  }

  const dobMatch =
    joined.match(/Date\s+of\s+Birth\s*[:\-]?\s*([0-9]{2}[^\w]?[0-9]{2}[^\w]?[0-9]{2,4})/i) ??
    joined.match(/DOB\s*[:\-]?\s*([0-9]{2}[^\w]?[0-9]{2}[^\w]?[0-9]{2,4})/i);
  if (dobMatch) {
    const iso = parseFlexibleDate(dobMatch[1]);
    if (iso) setField(fields, "dateOfBirth", iso, 60, "text");
  }

  const expiryMatch =
    joined.match(/Date\s+of\s+Expiry\s*[:\-]?\s*([0-9]{2}[^\w]?[0-9]{2}[^\w]?[0-9]{2,4})/i) ??
    joined.match(/Expiry\s*Date\s*[:\-]?\s*([0-9]{2}[^\w]?[0-9]{2}[^\w]?[0-9]{2,4})/i);
  if (expiryMatch) {
    const iso = parseFlexibleDate(expiryMatch[1]);
    if (iso) setField(fields, "expiryDate", iso, 60, "text");
  }

  const surnameMatch = joined.match(/Surname\s*[:\-]?\s*([A-Z\s]+)/i);
  if (surnameMatch) {
    setField(fields, "surname", normalizeName(surnameMatch[1]), 55, "text");
  }

  const givenNamesMatch = joined.match(/Given\s+Names?\s*[:\-]?\s*([A-Z\s]+)/i);
  if (givenNamesMatch) {
    setField(fields, "givenNames", normalizeName(givenNamesMatch[1]), 55, "text");
  }

  for (const line of lines) {
    const keyValue = line.match(
      /^([A-Za-z\s]{3,})[:\-\s]+([A-Za-z0-9\s'\/\.<>-]{3,})$/
    );
    if (keyValue) {
      const key = keyValue[1].trim().toLowerCase().replace(/\s+/g, "_");
      const value = keyValue[2].trim();
      setField(fields, key, value, 40, "text");
    }
  }

  if (fields.surname && fields.givenNames) {
    setField(
      fields,
      "fullName",
      normalizeName(`${fields.surname.value} ${fields.givenNames.value}`),
      Math.round((fields.surname.confidence + fields.givenNames.confidence) / 2),
      "text"
    );
  }

  return fields;
}

export function integrateMrz(fields: FieldMap, mrz: ParsedMrz | null): FieldMap {
  if (!mrz) return fields;
  const clone: FieldMap = { ...fields };

  const mrzFields = mrz.fields;
  if (mrzFields.passportNumber?.value) {
    setField(
      clone,
      "passportNumber",
      mrzFields.passportNumber.value,
      mrzFields.passportNumber.confidence,
      "mrz"
    );
  }
  if (mrzFields.nationality?.value) {
    setField(clone, "nationality", mrzFields.nationality.value, mrzFields.nationality.confidence, "mrz");
  }
  if (mrzFields.dateOfBirth?.value) {
    const iso = parseFlexibleDate(mrzFields.dateOfBirth.value);
    if (iso) setField(clone, "dateOfBirth", iso, mrzFields.dateOfBirth.confidence, "mrz");
  }
  if (mrzFields.expiryDate?.value) {
    const iso = parseFlexibleDate(mrzFields.expiryDate.value);
    if (iso) setField(clone, "expiryDate", iso, mrzFields.expiryDate.confidence, "mrz");
  }
  if (mrzFields.surnames?.value || mrzFields.givenNames?.value) {
    const full = `${mrzFields.surnames?.value ?? ""} ${mrzFields.givenNames?.value ?? ""}`.trim();
    if (full) {
      setField(clone, "fullName", normalizeName(full), 80, "mrz");
    }
  }
  if (mrzFields.sex?.value) {
    setField(clone, "sex", mrzFields.sex.value, 70, "mrz");
  }
  if (mrzFields.documentType?.value) {
    setField(clone, "documentType", mrzFields.documentType.value, 70, "mrz");
  }
  if (mrzFields.issuingCountry?.value) {
    setField(clone, "issuingCountry", mrzFields.issuingCountry.value, 70, "mrz");
  }
  return clone;
}
