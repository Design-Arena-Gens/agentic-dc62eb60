import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyDocuments } from "@/lib/analyze";
import { sanitizePolicy, defaultPolicy } from "@/lib/policy";
import { ApplicantInput, EligibilityPolicy } from "@/types";

const applicantSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.string().nonempty(),
  passportNumber: z.string().min(3),
  nationality: z.string().min(2),
  visaType: z.string().min(2)
});

const policySchema = z
  .object({
    minPassportValidityMonths: z.number().min(0).max(120).optional(),
    minApplicantAge: z.number().min(0).max(120).optional(),
    maxApplicantAge: z.number().min(0).max(120).optional(),
    prohibitedNationalities: z.array(z.string()).optional(),
    requireDocumentTypes: z.array(z.string()).optional(),
    visaTypeRules: z
      .record(
        z.object({
          minAge: z.number().min(0).max(120),
          maxStayDays: z.number().min(0),
          notes: z.string().optional()
        })
      )
      .optional()
  })
  .partial()
  .optional();

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const applicantPayload = formData.get("applicant");
    const policyPayload = formData.get("policy");
    const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File);

    if (!applicantPayload) {
      return NextResponse.json(
        { error: "Missing applicant payload" },
        {
          status: 400
        }
      );
    }

    const applicantParsed = applicantSchema.safeParse(
      typeof applicantPayload === "string" ? JSON.parse(applicantPayload) : applicantPayload
    );
    if (!applicantParsed.success) {
      return NextResponse.json(
        { error: "Invalid applicant payload", details: applicantParsed.error.flatten() },
        { status: 400 }
      );
    }
    const applicant: ApplicantInput = applicantParsed.data;

    let policy: EligibilityPolicy = structuredClone(defaultPolicy);
    if (policyPayload) {
      const rawPolicy =
        typeof policyPayload === "string" ? JSON.parse(policyPayload) : (policyPayload as any);
      const policyParsed = policySchema.safeParse(rawPolicy);
      if (policyParsed.success) {
        policy = sanitizePolicy(policyParsed.data ?? null);
      }
    }

    if (!files.length) {
      return NextResponse.json(
        { error: "No documents provided for verification" },
        { status: 400 }
      );
    }

    const buffers: Buffer[] = [];
    for (const file of files) {
      buffers.push(await fileToBuffer(file));
    }

    const result = await verifyDocuments(buffers, applicant, policy);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Verification error", error);
    return NextResponse.json(
      {
        error: "Internal processing error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
