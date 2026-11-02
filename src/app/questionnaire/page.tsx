"use client";

// The accreditation questionnaire: four short steps, stored by the desk as
// evidence (version, answers, basis). Submitting moves the member to review.
//
//   POST /capital/questionnaire {answers, basis, investing_as, state_of_residence, entities}

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe, useToken } from "@/lib/useMe";

type InvestingAs = "individual" | "family_office" | "entity";
type Basis = "income" | "net_worth" | "entity_assets" | "family_office" | "other";
type EntityDraft = { name: string; kind: string; state: string };

const BASES: { value: Basis; label: string; detail: string }[] = [
  { value: "income", label: "Income", detail: "$200,000 individually, or $300,000 with a spouse or spousal equivalent, in each of the last two years, with the same expected this year." },
  { value: "net_worth", label: "Net worth", detail: "Over $1,000,000, alone or with a spouse or spousal equivalent, excluding your primary residence." },
  { value: "entity_assets", label: "Trust or entity", detail: "Over $5,000,000 in assets and not formed to invest in the offering, or every equity owner is accredited." },
  { value: "family_office", label: "Family office", detail: "Over $5,000,000 in assets under management, directed by a person with financial and business experience." },
  { value: "other", label: "Another Rule 501(a) basis", detail: "Describe it below; the desk will follow up." },
];

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export default function QuestionnairePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useToken();
  const { me, preview } = useMe();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [investingAs, setInvestingAs] = useState<InvestingAs>((me?.investing_as as InvestingAs) || "individual");
  const [entities, setEntities] = useState<EntityDraft[]>(me?.entities.length ? me.entities.map((e) => ({ name: e.name, kind: e.kind, state: e.state ?? "" })) : [{ name: "", kind: "individual", state: "" }]);
  const [basis, setBasis] = useState<Basis>("net_worth");
  const [basisDetail, setBasisDetail] = useState("");
  const [experience, setExperience] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [state, setState] = useState(me?.state_of_residence ?? "");
  const [acks, setAcks] = useState({ accurate: false, restricted: false, docs: false });

  const entitiesOk = entities.every((e) => e.name.trim().length > 1);
  const canSubmit = acks.accurate && acks.restricted && acks.docs && state.length === 2 && entitiesOk;
  const stepLabels = useMemo(() => ["About you", "Accreditation", "Experience", "Acknowledgements"], []);

  if (preview) return <div className="card">Operators preview the portal; the questionnaire belongs to members.</div>;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api("/capital/questionnaire", {
        method: "POST",
        authToken: await token(),
        body: JSON.stringify({
          answers: { basis, basis_detail: basisDetail || null, experience, objectives, entities: entities.map((e) => e.name), acknowledged_at: new Date().toISOString() },
          basis, investing_as: investingAs, state_of_residence: state,
          entities: entities.map((e, i) => ({ name: e.name.trim(), kind: e.kind, state: e.state || null, is_default: i === 0 })),
        }),
      });
      await qc.invalidateQueries({ queryKey: ["capital-me"] });
      router.replace("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid place-items-center py-6">
      <div className="card elev-md w-[min(720px,100%)] gap-6 p-8">
        <div>
          <span className="kicker">Accreditation questionnaire</span>
          <h1 className="text-h2 m-0 mb-2">Tell us how you qualify</h1>
          <p className="text-mutedFg m-0">Under Rule 501(a) of Regulation D. We may ask for supporting documentation before accepting a subscription. Nothing here is an investment.</p>
        </div>
        {me?.questionnaire_notes ? <div className="notice"><span><strong className="text-ink">From the desk.</strong> {me.questionnaire_notes}</span></div> : null}
        <div className="grid gap-2.5">
          <div className="flex justify-between text-xs font-semibold tracking-[0.07em] uppercase text-mutedFg"><span>{stepLabels[step - 1]}</span><span className="num">{step} of 4</span></div>
          <div className="grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map((n) => <span key={n} className={`h-1 rounded-full ${n <= step ? "bg-accent-600" : "bg-[var(--color-neutral-300)]"}`} />)}</div>
        </div>

        {step === 1 ? (
          <div className="grid gap-5">
            <fieldset className="border-0 m-0 p-0">
              <legend className="text-sm font-medium mb-2.5">I'm investing as</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([["individual", "Private investor", "Individually, jointly or through a personal trust"], ["family_office", "Family office", "Single or multi-family office"], ["entity", "Other entity", "LLC, partnership or fund"]] as const).map(([v, l, note]) => (
                  <label key={v} className={`grid gap-1 content-start p-3.5 rounded-md border cursor-pointer ${investingAs === v ? "border-accent-600 bg-accent-100" : "border-dividerStrong bg-surface"}`}>
                    <input type="radio" name="as" className="sr-only" checked={investingAs === v} onChange={() => setInvestingAs(v)} />
                    <span className="text-sm font-semibold">{l}</span><span className="text-xs text-mutedFg">{note}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3">
              <div className="flex justify-between items-baseline"><span className="text-sm font-medium">Investing entities</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntities((e) => [...e, { name: "", kind: investingAs === "family_office" ? "family_office" : "llc", state: "" }])}>Add another</button></div>
              {entities.map((e, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_110px_auto] gap-2 items-end">
                  <div className="field"><label>{i === 0 ? "Name (holds the participations)" : "Name"}</label><input className="input" value={e.name} onChange={(ev) => setEntities((arr) => arr.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} placeholder={investingAs === "individual" ? "Your name, or a personal trust" : "Entity name"} /></div>
                  <div className="field"><label>Kind</label><select className="input" value={e.kind} onChange={(ev) => setEntities((arr) => arr.map((x, j) => (j === i ? { ...x, kind: ev.target.value } : x)))}><option value="individual">Individual</option><option value="trust">Trust</option><option value="llc">LLC</option><option value="partnership">Partnership</option><option value="family_office">Family office</option><option value="other">Other</option></select></div>
                  <div className="field"><label>State</label><select className="input" value={e.state} onChange={(ev) => setEntities((arr) => arr.map((x, j) => (j === i ? { ...x, state: ev.target.value } : x)))}><option value="">—</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  {entities.length > 1 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntities((arr) => arr.filter((_, j) => j !== i))}>Remove</button> : <span />}
                </div>
              ))}
            </div>
            <div className="field"><label>State of residence</label><select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">Choose a state</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select><span className="field-hint">Each state where a member resides receives a notice filing from us after a first sale.</span></div>
            <div className="flex justify-end"><button type="button" className="btn btn-primary btn-lg" disabled={!entitiesOk || state.length !== 2} onClick={() => setStep(2)}>Continue</button></div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5">
            <fieldset className="border-0 m-0 p-0 grid gap-2.5">
              <legend className="text-sm font-medium mb-1">Which basis applies?</legend>
              {BASES.map((b) => (
                <label key={b.value} className={`grid gap-1 p-3.5 rounded-md border cursor-pointer ${basis === b.value ? "border-accent-600 bg-accent-100" : "border-dividerStrong bg-surface"}`}>
                  <input type="radio" name="basis" className="sr-only" checked={basis === b.value} onChange={() => setBasis(b.value)} />
                  <span className="text-sm font-semibold">{b.label}</span><span className="text-xs text-mutedFg">{b.detail}</span>
                </label>
              ))}
            </fieldset>
            <div className="field"><label>Supporting facts <span className="text-mutedFg font-normal">Optional</span></label><textarea className="input min-h-24" value={basisDetail} onChange={(e) => setBasisDetail(e.target.value)} placeholder="Anything that helps the desk confirm the basis. Never send account numbers here." /></div>
            <div className="flex justify-between"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary btn-lg" onClick={() => setStep(3)}>Continue</button></div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5">
            <div className="field"><label>Experience with private credit or real estate lending</label><textarea className="input min-h-28" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Prior participations, notes, funds, or operating experience." /></div>
            <fieldset className="border-0 m-0 p-0 grid gap-2">
              <legend className="text-sm font-medium mb-1">Objectives</legend>
              {["Short-duration income", "Collateral-level exposure", "Diversification across loans", "Capital preservation", "Reinvest at payoff"].map((o) => (
                <label key={o} className="flex items-center gap-2.5 text-sm cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-accent-600" checked={objectives.includes(o)} onChange={(e) => setObjectives((arr) => (e.target.checked ? [...arr, o] : arr.filter((x) => x !== o)))} /><span>{o}</span></label>
              ))}
            </fieldset>
            <div className="flex justify-between"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(2)}>Back</button><button type="button" className="btn btn-primary btn-lg" onClick={() => setStep(4)}>Continue</button></div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4">
            {([["accurate", "The information in this questionnaire is accurate and complete, and I will tell Qualified Commercial if it changes."], ["restricted", "I understand that participations are restricted securities, are not FDIC insured, may lose value, and cannot be freely resold."], ["docs", "I understand that no offering is shown to me until the desk has reviewed this questionnaire and the waiting period has passed, and that each offering is made only through its private placement memorandum."]] as const).map(([k, text]) => (
              <label key={k} className="flex items-start gap-2.5 text-sm cursor-pointer leading-[1.55]"><input type="checkbox" className="mt-0.5 w-[18px] h-[18px] flex-none accent-accent-600" checked={acks[k]} onChange={(e) => setAcks((a) => ({ ...a, [k]: e.target.checked }))} /><span>{text}</span></label>
            ))}
            {err ? <div className="text-[var(--color-danger)] text-sm font-semibold" role="alert">{err}</div> : null}
            <div className="flex justify-between"><button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(3)}>Back</button><button type="button" className="btn btn-primary btn-lg" disabled={!canSubmit || busy} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit questionnaire"}</button></div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
