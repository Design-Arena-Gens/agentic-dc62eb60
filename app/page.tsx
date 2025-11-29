"use client";

import { FormEvent, useMemo, useState } from "react";
import { defaultPolicy } from "@/lib/policy";
import { ApplicantInput, EligibilityPolicy, VerificationResponse } from "@/types";

type UiState = {
  loading: boolean;
  error: string | null;
  response: VerificationResponse | null;
};

const initialApplicant: ApplicantInput = {
  fullName: "",
  dateOfBirth: "",
  passportNumber: "",
  nationality: "",
  visaType: "tourist"
};

function PolicyEditor({
  policy,
  onChange
}: {
  policy: EligibilityPolicy;
  onChange: (policy: EligibilityPolicy) => void;
}) {
  const update = <K extends keyof EligibilityPolicy>(key: K, value: EligibilityPolicy[K]) => {
    onChange({ ...policy, [key]: value });
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-lg font-semibold text-white">Eligibility Policy</h2>
      <p className="text-sm text-slate-400">
        Adjust the validation policy for visa eligibility checks.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Minimum Passport Validity (months)</span>
          <input
            type="number"
            min={0}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={policy.minPassportValidityMonths}
            onChange={(event) => update("minPassportValidityMonths", Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Minimum Applicant Age</span>
          <input
            type="number"
            min={0}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={policy.minApplicantAge}
            onChange={(event) => update("minApplicantAge", Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Maximum Applicant Age</span>
          <input
            type="number"
            min={0}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={policy.maxApplicantAge}
            onChange={(event) => update("maxApplicantAge", Number(event.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Required Document Types (comma separated)</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={policy.requireDocumentTypes.join(", ")}
            onChange={(event) =>
              update(
                "requireDocumentTypes",
                event.target.value
                  .split(",")
                  .map((token) => token.trim())
                  .filter(Boolean)
              )
            }
          />
        </label>
      </div>
      <div className="mt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>Prohibited Nationalities (comma separated)</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={policy.prohibitedNationalities.join(", ")}
            onChange={(event) =>
              update(
                "prohibitedNationalities",
                event.target.value
                  .split(",")
                  .map((token) => token.trim())
                  .filter(Boolean)
              )
            }
          />
        </label>
      </div>
    </section>
  );
}

function ApplicantForm({
  value,
  onChange
}: {
  value: ApplicantInput;
  onChange: (value: ApplicantInput) => void;
}) {
  const update = <K extends keyof ApplicantInput>(key: K, updateValue: ApplicantInput[K]) => {
    onChange({ ...value, [key]: updateValue });
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-lg font-semibold text-white">Applicant Details</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Full Name</span>
          <input
            type="text"
            required
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={value.fullName}
            onChange={(event) => update("fullName", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Date of Birth</span>
          <input
            type="date"
            required
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={value.dateOfBirth}
            onChange={(event) => update("dateOfBirth", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Passport Number</span>
          <input
            type="text"
            required
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 uppercase"
            value={value.passportNumber}
            onChange={(event) => update("passportNumber", event.target.value.toUpperCase())}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Nationality</span>
          <input
            type="text"
            required
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={value.nationality}
            onChange={(event) => update("nationality", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Visa Type</span>
          <select
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 capitalize"
            value={value.visaType}
            onChange={(event) => update("visaType", event.target.value)}
          >
            <option value="tourist">Tourist</option>
            <option value="business">Business</option>
            <option value="work">Work</option>
            <option value="student">Student</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function ResponseView({ response }: { response: VerificationResponse }) {
  const prettyJson = useMemo(() => JSON.stringify(response, null, 2), [response]);

  return (
    <section className="rounded-xl border border-emerald-600/40 bg-emerald-950/30 p-4">
      <h2 className="text-lg font-semibold text-emerald-300">Verification Result</h2>
      <p className="text-sm text-emerald-200/70">{response.summary}</p>
      <div className="mt-4 grid gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
            Eligibility
          </h3>
          <p className="text-sm text-white">
            Decision: <span className="font-semibold uppercase">{response.eligibility.decision}</span>{" "}
            · Score: {response.eligibility.score}
          </p>
          {response.eligibility.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-100/80">
              {response.eligibility.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
            Recommended Next Actions
          </h3>
          <ul className="mt-2 space-y-2">
            {response.recommendedActions.map((item) => (
              <li key={item.action} className="rounded border border-emerald-700/30 p-2 text-sm">
                <span className="font-semibold uppercase text-emerald-300">{item.priority}</span>:{" "}
                {item.action}
              </li>
            ))}
          </ul>
        </div>
        <details className="rounded border border-slate-700/60 bg-slate-950/60 p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-white">Raw JSON Output</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-emerald-100">
            {prettyJson}
          </pre>
        </details>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [applicant, setApplicant] = useState<ApplicantInput>(initialApplicant);
  const [policy, setPolicy] = useState<EligibilityPolicy>(defaultPolicy);
  const [uiState, setUiState] = useState<UiState>({
    loading: false,
    error: null,
    response: null
  });
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files || files.length === 0) {
      setUiState({ loading: false, error: "Please attach at least one document image.", response: null });
      return;
    }

    setUiState({ loading: true, error: null, response: null });
    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("documents", file));
      body.append("applicant", JSON.stringify(applicant));
      body.append("policy", JSON.stringify(policy));

      const response = await fetch("/api/verify", {
        method: "POST",
        body
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error ?? "Verification failed");
      }
      const payload: VerificationResponse = await response.json();
      setUiState({ loading: false, error: null, response: payload });
    } catch (error) {
      setUiState({
        loading: false,
        error: error instanceof Error ? error.message : "Unexpected error",
        response: null
      });
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-bold text-white">
          AI Document Verifier for Government-Issued IDs
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Upload travel documents, passports, visas, or national ID cards. The verifier extracts MRZ
          and textual data, performs validation, and assesses visa eligibility using configurable
          policies. All results are returned as a structured JSON payload.
        </p>
      </header>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <ApplicantForm value={applicant} onChange={setApplicant} />
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-lg font-semibold text-white">Document Upload</h2>
          <p className="text-sm text-slate-400">
            Accepted formats: passport or ID images in PNG, JPG, or WEBP. Multiple files supported.
          </p>
          <input
            type="file"
            multiple
            required
            accept="image/png,image/jpeg,image/webp"
            className="mt-4 block w-full rounded border border-dashed border-slate-700 bg-slate-950 px-3 py-6 text-sm"
            onChange={(event) => setFiles(event.target.files)}
          />
        </section>
        <PolicyEditor policy={policy} onChange={setPolicy} />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={uiState.loading}
            className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uiState.loading ? "Processing…" : "Verify Documents"}
          </button>
          {uiState.error && <p className="text-sm text-rose-400">{uiState.error}</p>}
        </div>
      </form>

      {uiState.response && <ResponseView response={uiState.response} />}
    </main>
  );
}
