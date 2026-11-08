import { useEffect, useMemo, useRef, useState } from "react";
import { product } from "../engine/catalogue";
import { maskId } from "../engine/gstin";
import { DOC_KINDS, parseDocument, runKyc, type Check, type DocKind, type KycResult, type ParsedDoc } from "../engine/kyc";
import type { Order } from "../engine/orders";
import { fmtDate, t, type Key, type Lang } from "../i18n/strings";
import { KYC_DEMOS } from "../data/demos";
import { readDocument, readSpecimenSync, SPECIMENS, specimenImage } from "../services/ocr";
import { KYC_REGISTRY } from "../services/registry";
import type { QuoteResult } from "./Quote";

interface Slot { name: string; image?: string; status: "reading" | "done" | "error"; parsed?: ParsedDoc; edited?: string[] }

/** Fields shown under each document, in order. Identifiers are masked unless the owner is editing them. */
const SHOW: Record<DocKind, string[]> = {
  gst: ["gstin", "tradeName", "legalName", "address"],
  udyam: ["udyamNumber", "name", "city", "state"],
  id: ["name", "designation", "business", "idNumber", "validTill"],
  address: ["billedTo", "address", "billDate"],
};
const MASK = new Set(["gstin", "udyamNumber", "idNumber"]);
const DATES = new Set(["validTill", "billDate"]);
const GST_ERR: Record<string, Key> = { length: "gstErr_length", state: "gstErr_state", pan: "gstErr_pan", entity: "gstErr_entity", z: "gstErr_z", checksum: "gstErr_checksum" };
const STATUS_HI: Record<string, string> = { Cancelled: "रद्द", Suspended: "निलंबित" };
const sameId = (a: string, b: string) => a.toUpperCase().replace(/O/g, "0") === b.toUpperCase().replace(/O/g, "0");

/** Specimen applicant whose GST certificate carries this GSTIN, so the demo can pick the matching documents. */
const SPECIMEN_GSTIN = Object.fromEntries(SPECIMENS.filter((s) => s.docs.gst).map((s) => [s.id, parseDocument(readSpecimenSync(s.docs.gst!)!).fields.gstin ?? ""]));

function checkText(c: Check, lang: Lang): string {
  const p = { ...(c.params ?? {}) } as Record<string, string | number>;
  const doc = c.doc ? t(lang, `dk_${c.doc}` as Key) : "";
  const pf = c.status === "pass" ? "pass" : "fail";
  for (const k of ["date", "cutoff"]) if (typeof p[k] === "string" && p[k]) p[k] = fmtDate(p[k] as string, lang);
  switch (c.code) {
    case "missing": case "unreadable": return t(lang, `c_${c.code}`, { doc });
    case "wrong_kind": return t(lang, "c_wrong_kind", { doc, found: t(lang, `dk_${p.found}` as Key) });
    case "field_missing": return t(lang, "c_field_missing", { doc, field: t(lang, `f_${p.field}` as Key).toLowerCase() });
    case "gstin_format": {
      const base = t(lang, "c_gstin_format", { masked: p.masked, reason: t(lang, GST_ERR[p.error as string]) });
      return p.pos ? `${base} ${t(lang, "c_gstin_near", p)}` : base;
    }
    case "gstin_registry": {
      if (p.state === "Active") return t(lang, "c_gstin_registry_Active", p);
      const base = p.state === "notfound" ? t(lang, "c_gstin_registry_notfound", p)
        : t(lang, "c_gstin_registry_inactive", { masked: p.masked, state: lang === "hi" ? STATUS_HI[p.state as string] : String(p.state).toLowerCase() });
      return `${base} ${t(lang, c.status === "fail" ? "c_gst_needed" : "c_gst_udyam_ok")}`;
    }
    case "names_match": return t(lang, `c_names_match_${pf}`, { ...p, doc });
    case "gst_name": case "gst_address": case "udyam_registry": case "id_valid": case "address_recent": case "address_match":
    case "gstin_quote": case "state_match": case "applicant_match":
      return t(lang, `c_${c.code}_${pf}` as Key, p);
    case "udyam_format": case "udyam_name": case "udyam_place": return t(lang, `c_${c.code}`, p);
    case "signatory": return t(lang, `c_signatory_${p.kind}` as Key, p);
    case "pan_format": return t(lang, c.status === "warn" ? "c_pan_format_warn" : "c_pan_format_fail", p);
    case "business_proof": return c.status === "pass" ? t(lang, "c_business_proof_pass") : t(lang, p.need === "gst" ? "c_business_proof_gst" : "c_business_proof_any");
  }
}

export type KycSnapshot = NonNullable<Order["kyc"]>;

export function Kyc({ lang, quote, applicant, onContinue, onExpert }: {
  lang: Lang; quote: QuoteResult; applicant?: string;
  onContinue: (r: KycResult, snap: KycSnapshot) => void; onExpert: (reason: string) => void;
}) {
  const { profile } = quote;
  const needsGst = quote.items.some((i) => product(i.productId).requiresGstin);
  const [specimen, setSpecimen] = useState<string | null>(null);
  const [slots, setSlots] = useState<Partial<Record<DocKind, Slot>>>({});
  const [editing, setEditing] = useState<DocKind | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pan, setPan] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState(0);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const match = profile.gstin ? Object.entries(SPECIMEN_GSTIN).find(([, g]) => sameId(g, profile.gstin!))?.[0] : undefined;

  async function read(kind: DocKind, name: string, image?: string) {
    setSlots((s) => ({ ...s, [kind]: { name, image, status: "reading" } }));
    const lines = await readDocument(name);
    setSlots((s) => (s[kind]?.name !== name ? s : { ...s, [kind]: lines ? { name, image, status: "done", parsed: parseDocument(lines) } : { name, image, status: "error" } }));
  }
  function loadSpecimen(id: string) {
    const sp = SPECIMENS.find((x) => x.id === id)!;
    setSpecimen(id);
    setSlots({});
    setEditing(null);
    setConfirmed(false);
    for (const kind of DOC_KINDS) if (sp.docs[kind]) void read(kind, sp.docs[kind]!, specimenImage(sp.docs[kind]!));
  }
  function upload(kind: DocKind, file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setSpecimen(null);
    setConfirmed(false);
    void read(kind, file.name, url);
  }
  function startEdit(kind: DocKind) {
    setEditing(kind);
    setDraft({ ...slots[kind]!.parsed!.fields });
  }
  function saveEdit(kind: DocKind) {
    const s = slots[kind]!;
    const changed = SHOW[kind].filter((f) => (draft[f] ?? "") !== (s.parsed!.fields[f] ?? ""));
    const fields = { ...s.parsed!.fields, ...draft };
    if (fields.gstin) fields.gstin = fields.gstin.toUpperCase().replace(/\s/g, "");
    setSlots((all) => ({ ...all, [kind]: { ...s, parsed: { ...s.parsed!, fields }, edited: [...new Set([...(s.edited ?? []), ...changed])] } }));
    setEditing(null);
    setConfirmed(false);
  }

  const done = Object.values(slots).filter((s) => s.status === "done");
  const reading = Object.values(slots).some((s) => s.status === "reading");
  const result = useMemo(() => {
    if (!done.length || reading) return null;
    const docs = Object.fromEntries(Object.entries(slots).filter(([, s]) => s.parsed).map(([k, s]) => [k, s.parsed]));
    return runKyc({ docs, needsGst, application: { name: applicant, gstin: profile.gstin, state: profile.state, pan: pan || undefined } }, KYC_REGISTRY);
  }, [slots, pan]); // eslint-disable-line react-hooks/exhaustive-deps
  const fails = result?.checks.filter((c) => c.status === "fail") ?? [];
  const canGo = !!result && result.status !== "fix" && confirmed && !editing;

  const snapshot = (): KycSnapshot => ({
    checks: result!.checks,
    docs: Object.fromEntries(Object.entries(slots).filter(([, s]) => s.parsed).map(([k, s]) => [k,
      Object.fromEntries(Object.entries(s.parsed!.fields).map(([f, v]) => [f, MASK.has(f) ? maskId(v) : v]))])),
    edited: Object.entries(slots).flatMap(([k, s]) => (s.edited ?? []).map((f) => `${k}.${f}`)),
  });

  const note = (kind: DocKind) =>
    kind === "gst" ? t(lang, needsGst ? "dn_gst_need" : "dn_gst_opt")
      : kind === "udyam" ? t(lang, needsGst ? "dn_udyam_opt" : "dn_gst_opt")
        : t(lang, kind === "id" ? "dn_id" : "dn_address");

  const docChecksFor = (kinds: DocKind[], extra: Check["code"][] = []) =>
    result?.checks.filter((c) => (c.doc && kinds.includes(c.doc)) || extra.includes(c.code)) ?? [];
  const stepChecks = [docChecksFor(["gst", "udyam"], ["business_proof", "pan_format"]), docChecksFor(["id"]), docChecksFor(["address"])];
  const stepState = (i: number) => {
    const kinds: DocKind[][] = [["gst", "udyam"], ["id"], ["address"]];
    if (i === 3) return result ? result.status : "";
    if (!kinds[i].some((k) => slots[k]?.status === "done") && !(i === 0 && pan)) return slots[kinds[i][0]]?.status === "error" ? "fix" : "";
    const cs = stepChecks[i];
    return cs.some((c) => c.status === "fail") ? "fix" : cs.some((c) => c.status === "warn") ? "review" : "verified";
  };

  const renderDoc = (kind: DocKind) => {
    const s = slots[kind];
    const docChecks = result?.checks.filter((c) => c.doc === kind && c.status !== "pass") ?? [];
    const state = !s ? "empty" : s.status !== "done" ? s.status : docChecks.some((c) => c.status === "fail") ? "bad" : docChecks.length ? "warn" : "good";
    const fields = SHOW[kind].filter((f) => editing === kind || s?.parsed?.fields[f]);
    return (
      <section key={kind} className={`doc ${state}`} aria-label={t(lang, `dk_${kind}` as Key)}>
        <div className="doc-head">
          {s?.image ? <img className="thumb" src={s.image} alt="" onError={(e) => (e.currentTarget.style.display = "none")} /> : <span className="thumb empty" aria-hidden="true">{kind === "id" ? "ID" : kind === "address" ? "₹" : kind === "gst" ? "GST" : "U"}</span>}
          <div className="doc-title">
            <b>{t(lang, `dk_${kind}` as Key)}</b>
            <span className="fine">{s?.status === "reading" ? t(lang, "reading") : s ? s.name : note(kind)}</span>
          </div>
          <label className="upload">
            {t(lang, s ? "replace" : "upload")}
            <input type="file" accept="image/*" capture="environment" className="vh" onChange={(e) => { upload(kind, e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        {s?.status === "error" && <p className="doc-err">{t(lang, "cantRead")}</p>}
        {s?.parsed?.readable && (
          <>
            <dl className="fields">
              {fields.map((f) => (
                <div key={f}><dt>{t(lang, `f_${f}` as Key)}</dt><dd className={MASK.has(f) ? "num" : undefined}>
                  {editing === kind
                    ? <input className="input small" value={draft[f] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))} aria-label={t(lang, `f_${f}` as Key)} />
                    : MASK.has(f) ? maskId(s.parsed!.fields[f]) : DATES.has(f) ? fmtDate(s.parsed!.fields[f], lang) : s.parsed!.fields[f]}
                  {s.edited?.includes(f) && editing !== kind ? <small className="edited"> ✎</small> : null}
                </dd></div>
              ))}
            </dl>
            <div className="doc-actions">
              {s.edited?.length ? <span className="fine">{t(lang, "editedNote")}</span> : <span />}
              {editing === kind
                ? <button className="textbtn" onClick={() => saveEdit(kind)}>{t(lang, "saveFields")}</button>
                : <button className="textbtn" onClick={() => startEdit(kind)} disabled={!!editing}>{t(lang, "editFields")}</button>}
            </div>
          </>
        )}
      </section>
    );
  };

  const checkList = (cs: Check[]) => (
    <ul className="check-list">
      {[...cs].sort((a, b) => rank(a) - rank(b)).map((c, i) => (
        <li key={i} className={c.status}><span className={`tag ${c.status === "pass" ? "in" : c.status === "warn" ? "opt" : "out"}`}>{c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✕"}</span>{checkText(c, lang)}</li>
      ))}
    </ul>
  );

  const STEPS: Key[] = ["ks_business", "ks_id", "ks_address", "ks_review"];
  const WHY: Key[] = ["ks_business_why", "ks_id_why", "ks_address_why", "ks_review_why"];
  const passed = result?.checks.filter((c) => c.status === "pass").length ?? 0;
  const total = result?.checks.length ?? 0;

  return (
    <>
      <main className="scroll kyc" lang={lang}>
        <ol className="kyc-steps">
          {STEPS.map((k, i) => (
            <li key={k}>
              <button className={`kstep ${i === step ? "now" : ""} ${stepState(i)}`} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                <i aria-hidden="true">{stepState(i) === "verified" ? "✓" : stepState(i) === "fix" ? "!" : stepState(i) === "review" ? "•" : i + 1}</i>
                <span>{t(lang, k)}</span>
              </button>
            </li>
          ))}
        </ol>

        <details className="sample">
          <summary>{t(lang, "ks_sample")}{match ? ` · ${match} ${t(lang, "specMatch").toLowerCase()}` : ""}</summary>
          <div className="chips">
            {KYC_DEMOS.map((d) => (
              <button key={d.id} className={`chip ${match === d.id ? "match" : ""}`} aria-pressed={specimen === d.id} onClick={() => { loadSpecimen(d.id); setStep(3); }} title={d.shows}>
                {d.id}{match === d.id ? " ★" : ""}
              </button>
            ))}
          </div>
          {specimen && <p className="fine specimen-note">{specimen}: {KYC_DEMOS.find((d) => d.id === specimen)?.shows}</p>}
        </details>

        <header className="step-head">
          <span className="eyebrow">{t(lang, "ks_step", { n: step + 1 })}</span>
          <h2>{t(lang, STEPS[step])}</h2>
          <p>{t(lang, WHY[step])}</p>
        </header>

        {step === 0 && (
          <>
            {renderDoc("gst")}
            <div className="or"><span>{t(lang, "ks_or")}</span></div>
            {renderDoc("udyam")}
            {!needsGst && (
              <>
                <div className="or"><span>{t(lang, "ks_or")}</span></div>
                <section className="doc">
                  <label className="field">
                    <span className="pan-label">{t(lang, "panLabel")}</span>
                    <input className="input num" value={pan} maxLength={10} onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCPX1234K" />
                    <span className="help">{t(lang, "panHelp")}</span>
                  </label>
                </section>
              </>
            )}
          </>
        )}
        {step === 1 && renderDoc("id")}
        {step === 2 && renderDoc("address")}
        {step < 3 && stepChecks[step].length > 0 && (
          <section className="checks">
            {stepChecks[step].every((c) => c.status === "pass") && <p className="ok-line">{t(lang, "ks_doc_ok")}</p>}
            {checkList(stepChecks[step])}
          </section>
        )}

        {step === 3 && (
          <>
            <section className="app-card" aria-label={t(lang, "appTitle")}>
              <h3>{t(lang, "appTitle")}</h3>
              {applicant && <span>{t(lang, "appSigner", { name: applicant })}</span>}
              {profile.gstin && <span className="num">{t(lang, "appGstin", { masked: maskId(profile.gstin.toUpperCase()) })}</span>}
              {profile.state && <span>{t(lang, "appState", { state: profile.state })}</span>}
            </section>
            {result ? (
              <>
                <div className="score">
                  <div className="ring" style={{ background: `conic-gradient(var(--ok) ${(passed / Math.max(1, total)) * 360}deg, var(--surface-2) 0)` }}><b className="num">{passed}/{total}</b></div>
                  <p>{t(lang, "ks_score", { n: passed, total })}</p>
                </div>
                {GROUPS.map(([key, codes]) => {
                  const cs = result.checks.filter((c) => codes.includes(c.code));
                  if (!cs.length) return null;
                  const st = cs.some((c) => c.status === "fail") ? "fix" : cs.some((c) => c.status === "warn") ? "review" : "verified";
                  return (
                    <section key={key} className={`group ${st}`}>
                      <h3><span className="gdot" aria-hidden="true">{st === "verified" ? "✓" : st === "fix" ? "✕" : "!"}</span>{t(lang, key)}</h3>
                      {checkList(cs)}
                    </section>
                  );
                })}
                {result.status === "fix" && <button className="secondary" onClick={() => onExpert(checkText(fails[0], "en"))}>{t(lang, "kycExpert")}</button>}
              </>
            ) : <p className="lead">{t(lang, "kyc_waiting")}</p>}
          </>
        )}
      </main>
      <footer className="footer" lang={lang}>
        {step < 3 ? (
          <div className="row2 equal">
            <button className="secondary" disabled={step === 0} onClick={() => setStep((n) => n - 1)}>{t(lang, "ks_prev")}</button>
            <button className="primary" onClick={() => setStep((n) => n + 1)} disabled={!!editing}>{t(lang, "ks_next")}</button>
          </div>
        ) : (
          <>
            <p className={`kyc-status ${result?.status ?? ""}`} role="status">
              {!result ? t(lang, "kyc_waiting") : result.status === "fix" ? t(lang, "kyc_fix", { n: fails.length }) : t(lang, result.status === "review" ? "kyc_review" : "kyc_verified")}
            </p>
            {result && result.status !== "fix" && (
              <label className="agree">
                <input type="checkbox" className="check" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!editing} />
                <span>{t(lang, "confirmFields")}</span>
              </label>
            )}
            <button className="primary" disabled={!canGo} onClick={() => result && onContinue(result, snapshot())}>
              {result?.status === "fix" ? t(lang, "fixFirst") : t(lang, "kycContinue")}
            </button>
          </>
        )}
      </footer>
    </>
  );
}

/** Review groups: every check sits under the question an owner would ask. */
const GROUPS: [Key, Check["code"][]][] = [
  ["kg_docs", ["missing", "unreadable", "wrong_kind", "field_missing"]],
  ["kg_business", ["gstin_format", "gstin_registry", "gst_name", "gst_address", "udyam_format", "udyam_registry", "udyam_name", "udyam_place", "pan_format", "business_proof"]],
  ["kg_application", ["gstin_quote", "state_match", "applicant_match", "names_match"]],
  ["kg_signatory", ["signatory", "id_valid"]],
  ["kg_address", ["address_recent", "address_match"]],
];

const rank = (c: Check) => (c.status === "fail" ? 0 : c.status === "warn" ? 1 : 2);
