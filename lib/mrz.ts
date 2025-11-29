import { ParsedMrz, MrzField } from "@/types";

const WEIGHTS = [7, 3, 1];
const MRZ_ALLOWED = /^[A-Z0-9<]+$/;

function charValue(char: string): number {
  if (char === "<") return 0;
  if (/[0-9]/.test(char)) return Number(char);
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return code - 55; // A => 10
  }
  return 0;
}

function computeChecksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += charValue(data[i]) * WEIGHTS[i % WEIGHTS.length];
  }
  return sum % 10;
}

function verifyChecksum(data: string, checksumChar: string): boolean {
  if (!checksumChar || !/[0-9]/.test(checksumChar)) return false;
  const target = Number(checksumChar);
  return computeChecksum(data) === target;
}

function normalize(line: string): string {
  return line.replace(/\s+/g, "").toUpperCase();
}

function determineFormat(lines: string[]): ParsedMrz["format"] {
  if (lines.length === 3 && lines.every((line) => line.length === 30)) return "TD1";
  if (lines.length === 2 && lines.every((line) => line.length === 36)) return "TD2";
  if (lines.length === 2 && lines.every((line) => line.length === 44)) return "TD3";
  return "UNKNOWN";
}

export function findMrzCandidates(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter((line) => line.length > 25 && MRZ_ALLOWED.test(line));

  const candidates: string[][] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const twoLine = lines.slice(i, i + 2);
    if (twoLine.length === 2 && (twoLine[0].length === twoLine[1].length)) {
      candidates.push(twoLine);
    }
    const threeLine = lines.slice(i, i + 3);
    if (
      threeLine.length === 3 &&
      (threeLine[0].length === threeLine[1].length && threeLine[1].length === threeLine[2].length)
    ) {
      candidates.push(threeLine);
    }
  }
  return candidates;
}

function field(value: string | null, confidence: number, raw?: string, checksumValid?: boolean): MrzField {
  return {
    label: "",
    value,
    confidence,
    raw,
    checksumValid
  };
}

export function parseMrz(lines: string[]): ParsedMrz | null {
  if (!lines.length) return null;
  const format = determineFormat(lines);
  if (format === "UNKNOWN") {
    return {
      format,
      raw: lines,
      fields: {}
    };
  }

  try {
    if (format === "TD3") {
      const [line1, line2] = lines;
      const documentType = line1.slice(0, 2);
      const issuingCountry = line1.slice(2, 5);
      const nameSection = line1.slice(5);
      const [surnameRaw, givenRaw] = nameSection.split("<<");
      const passportNumber = line2.slice(0, 9);
      const passportChecksum = line2.slice(9, 10);
      const nationality = line2.slice(10, 13);
      const birthDate = line2.slice(13, 19);
      const birthChecksum = line2.slice(19, 20);
      const sex = line2.slice(20, 21);
      const expiryDate = line2.slice(21, 27);
      const expiryChecksum = line2.slice(27, 28);
      const optionalData = line2.slice(28, 42);
      const compositeChecksum = line2.slice(43, 44);

      const compositeData = `${passportNumber}${passportChecksum}${birthDate}${birthChecksum}${expiryDate}${expiryChecksum}${optionalData}`;

      return {
        format,
        raw: lines,
        fields: {
          documentType: field(documentType.replace(/</g, ""), 85, documentType),
          issuingCountry: field(issuingCountry.replace(/</g, ""), 85, issuingCountry),
          surnames: field(surnameRaw?.replace(/</g, " ").trim() ?? null, 80, surnameRaw),
          givenNames: field(givenRaw?.replace(/</g, " ").trim() ?? null, 80, givenRaw),
          passportNumber: field(
            passportNumber.replace(/</g, ""),
            verifyChecksum(passportNumber, passportChecksum) ? 95 : 70,
            passportNumber,
            verifyChecksum(passportNumber, passportChecksum)
          ),
          nationality: field(nationality.replace(/</g, ""), 85, nationality),
          dateOfBirth: field(
            birthDate.replace(/</g, ""),
            verifyChecksum(birthDate, birthChecksum) ? 95 : 70,
            birthDate,
            verifyChecksum(birthDate, birthChecksum)
          ),
          sex: field(sex === "<" ? null : sex, 75, sex),
          expiryDate: field(
            expiryDate.replace(/</g, ""),
            verifyChecksum(expiryDate, expiryChecksum) ? 95 : 70,
            expiryDate,
            verifyChecksum(expiryDate, expiryChecksum)
          ),
          optionalData: field(optionalData.replace(/</g, ""), 60, optionalData, verifyChecksum(compositeData, compositeChecksum))
        }
      };
    }

    if (format === "TD1") {
      const [line1, line2, line3] = lines;
      const documentType = line1.slice(0, 2);
      const issuingCountry = line1.slice(2, 5);
      const nameSection = `${line3}`;
      const [surnameRaw, givenRaw] = nameSection.split("<<");
      const passportNumber = line1.slice(5, 14);
      const passportChecksum = line1.slice(14, 15);
      const nationality = line2.slice(5, 8);
      const birthDate = line2.slice(0, 6);
      const birthChecksum = line2.slice(6, 7);
      const sex = line2.slice(7, 8);
      const expiryDate = line2.slice(8, 14);
      const expiryChecksum = line2.slice(14, 15);
      const optionalData = line1.slice(15, 30) + line2.slice(15, 30);
      const compositeChecksum = line3.slice(29, 30);

      const compositeData = `${passportNumber}${passportChecksum}${optionalData}${birthDate}${birthChecksum}${expiryDate}${expiryChecksum}`;

      return {
        format,
        raw: lines,
        fields: {
          documentType: field(documentType.replace(/</g, ""), 80, documentType),
          issuingCountry: field(issuingCountry.replace(/</g, ""), 80, issuingCountry),
          surnames: field(surnameRaw?.replace(/</g, " ").trim() ?? null, 75, surnameRaw),
          givenNames: field(givenRaw?.replace(/</g, " ").trim() ?? null, 75, givenRaw),
          passportNumber: field(
            passportNumber.replace(/</g, ""),
            verifyChecksum(passportNumber, passportChecksum) ? 95 : 65,
            passportNumber,
            verifyChecksum(passportNumber, passportChecksum)
          ),
          nationality: field(nationality.replace(/</g, ""), 80, nationality),
          dateOfBirth: field(
            birthDate.replace(/</g, ""),
            verifyChecksum(birthDate, birthChecksum) ? 95 : 65,
            birthDate,
            verifyChecksum(birthDate, birthChecksum)
          ),
          sex: field(sex === "<" ? null : sex, 70, sex),
          expiryDate: field(
            expiryDate.replace(/</g, ""),
            verifyChecksum(expiryDate, expiryChecksum) ? 95 : 65,
            expiryDate,
            verifyChecksum(expiryDate, expiryChecksum)
          ),
          optionalData: field(optionalData.replace(/</g, ""), 55, optionalData, verifyChecksum(compositeData, compositeChecksum))
        }
      };
    }

    if (format === "TD2") {
      const [line1, line2] = lines;
      const documentType = line1.slice(0, 2);
      const issuingCountry = line1.slice(2, 5);
      const nameSection = line1.slice(5);
      const [surnameRaw, givenRaw] = nameSection.split("<<");
      const passportNumber = line2.slice(0, 9);
      const passportChecksum = line2.slice(9, 10);
      const nationality = line2.slice(10, 13);
      const birthDate = line2.slice(13, 19);
      const birthChecksum = line2.slice(19, 20);
      const sex = line2.slice(20, 21);
      const expiryDate = line2.slice(21, 27);
      const expiryChecksum = line2.slice(27, 28);
      const optionalData = line2.slice(28, 35);
      const compositeChecksum = line2.slice(35, 36);
      const compositeData = `${passportNumber}${passportChecksum}${birthDate}${birthChecksum}${expiryDate}${expiryChecksum}${optionalData}`;

      return {
        format,
        raw: lines,
        fields: {
          documentType: field(documentType.replace(/</g, ""), 80, documentType),
          issuingCountry: field(issuingCountry.replace(/</g, ""), 80, issuingCountry),
          surnames: field(surnameRaw?.replace(/</g, " ").trim() ?? null, 75, surnameRaw),
          givenNames: field(givenRaw?.replace(/</g, " ").trim() ?? null, 75, givenRaw),
          passportNumber: field(
            passportNumber.replace(/</g, ""),
            verifyChecksum(passportNumber, passportChecksum) ? 95 : 65,
            passportNumber,
            verifyChecksum(passportNumber, passportChecksum)
          ),
          nationality: field(nationality.replace(/</g, ""), 80, nationality),
          dateOfBirth: field(
            birthDate.replace(/</g, ""),
            verifyChecksum(birthDate, birthChecksum) ? 95 : 65,
            birthDate,
            verifyChecksum(birthDate, birthChecksum)
          ),
          sex: field(sex === "<" ? null : sex, 70, sex),
          expiryDate: field(
            expiryDate.replace(/</g, ""),
            verifyChecksum(expiryDate, expiryChecksum) ? 95 : 65,
            expiryDate,
            verifyChecksum(expiryDate, expiryChecksum)
          ),
          optionalData: field(optionalData.replace(/</g, ""), 55, optionalData, verifyChecksum(compositeData, compositeChecksum))
        }
      };
    }
  } catch (error) {
    console.error("MRZ parsing error", error);
  }

  return null;
}
