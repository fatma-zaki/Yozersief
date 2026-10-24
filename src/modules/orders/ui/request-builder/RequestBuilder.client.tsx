"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  ClipboardCheck,
  LayoutGrid,
  Send,
  SlidersVertical,
  TriangleAlert,
  Upload,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { CategoryKey, PublicCategory } from "@/modules/catalog";
import type { BlobUploadMode } from "../../domain/files";
import { ar, t } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import { cairoDateString } from "@/lib/format";
import {
  buildChecks,
  categoryLabel,
  emptyDraft,
  fileError,
  isOrg,
  productLabel,
  readiness as readinessOf,
  updateDraft,
  type Check,
  type DraftFile,
  type RequestDraft,
} from "../../domain/request";
import { BuilderHeader, MobileHeader, type StepState } from "./chrome";
import { Confirmation } from "./Confirmation.client";
import { builderCatalog, StepContact, StepDetails, StepFiles, StepReview, StepType } from "./steps";
import { clearSubmissionKey, DEMO_MODE, getOrCreateSubmissionKey, submitRequest } from "./submit";
import s from "./builder.module.css";

const b = ar.order.builder;
const STEP_ICONS = [LayoutGrid, SlidersVertical, Upload, User, ClipboardCheck];
/** Draft survives a reload in this tab (files are not kept: browsers can't restore them). */
const STORAGE_KEY = "yz:order-draft:v1";

/** Focus a field (or heading) once the new step has rendered (design: "fix it" jumps there). */
function focusLater(id: string) {
  window.setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 60);
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type Saved = { draft: Omit<RequestDraft, "files">; step: Step; maxStep: Step };

function loadSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(value: Saved | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the draft just isn't kept across reloads.
  }
}

/**
 * Request builder (brief B5; design: docs/design/youzersef-order-journey.html, Flow-P1…6,
 * Flow-B1…6, Request-Mobile.html). Five steps + confirmation, a live "what's next" hint (and a
 * readiness checklist with "fix it" on phones), per-step validation on "next", and a review
 * that blocks sending until everything is ready.
 */
export function RequestBuilder({
  initialCategory,
  uploadMode,
  categories,
}: {
  initialCategory: CategoryKey | null;
  uploadMode: BlobUploadMode | null;
  /** What the catalog offers now (dashboard → products): categories and visible product types. */
  categories: readonly PublicCategory[];
}) {
  const catalog = useMemo(() => builderCatalog(categories), [categories]);
  /** The catalog at mount, for the one-time draft restore below. */
  const catalogAtMount = useRef(catalog);
  const [draft, setDraft] = useState<RequestDraft>(() => ({
    ...emptyDraft(),
    ...(initialCategory ? { cat: initialCategory } : {}),
  }));
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [showErr, setShowErr] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState("");
  const [today] = useState(() => cairoDateString(new Date()));
  const [hydrated, setHydrated] = useState(false);
  /** Local File blobs keyed by DraftFile.id (not serialisable; lost on reload). */
  const fileBlobs = useRef(new Map<string, File>());

  // Restore the tab's draft once, then keep it saved.
  useEffect(() => {
    // Syncing from sessionStorage after hydration (it doesn't exist on the server).
    const saved = loadSaved();
    if (saved && saved.step < 6) {
      // A category or product hidden since the draft was saved can't be ordered any more.
      const offered = catalogAtMount.current.categories.find((c) => c.key === saved.draft.cat);
      const cat = offered ? saved.draft.cat : "";
      const prod = offered?.products.some((p) => p.key === saved.draft.prod)
        ? saved.draft.prod
        : "";
      setDraft({ ...emptyDraft(), ...saved.draft, cat, prod, files: [] });
      setStep(saved.step);
      setMaxStep(saved.maxStep);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || step === 6) return;
    const { files: _files, ...rest } = draft;
    void _files;
    save({ draft: rest, step, maxStep });
  }, [draft, step, maxStep, hydrated]);

  const set = useCallback((patch: Partial<RequestDraft>) => {
    setDraft((d) => updateDraft(d, patch));
    setSubmitError(null);
  }, []);

  const checks = useMemo(
    () => buildChecks(draft, today, { ...catalog.categoryNames, ...catalog.productNames }),
    [draft, today, catalog],
  );
  const ready = readinessOf(checks);
  const current = Math.min(step, 5) as 1 | 2 | 3 | 4 | 5;
  const stepIssues = checks.filter((c) => c.step === current && c.status === "attn");
  const errors: Record<string, string> = {};
  if (showErr[current]) for (const c of stepIssues) errors[c.id] = c.msg;

  const goStep = (n: Step) => {
    setStep(n);
    setMaxStep((m) => (n > m ? n : m));
    focusLater("step-h");
  };

  const next = () => {
    if (stepIssues.length) {
      setShowErr((e) => ({ ...e, [current]: true }));
      focusLater(stepIssues[0]!.field);
      return;
    }
    goStep((current + 1) as Step);
  };

  const fix = (c: Check) => {
    setShowErr((e) => ({ ...e, [c.step]: true }));
    setStep(c.step);
    setMaxStep((m) => (c.step > m ? c.step : m));
    focusLater(c.field);
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const perPiece = isOrg(draft) && draft.perPiece;
    const nextBlobs = new Map(fileBlobs.current);
    const picked: DraftFile[] = Array.from(event.target.files ?? []).map((file) => {
      const error = fileError(file, perPiece);
      const id = `f${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      if (!error) nextBlobs.set(id, file);
      return {
        id,
        name: file.name,
        size: file.size,
        status: error ? "failed" : "done",
        ...(error ? { error } : {}),
        ...(!error && file.type.startsWith("image/") ? { thumb: URL.createObjectURL(file) } : {}),
      };
    });
    event.target.value = "";
    fileBlobs.current = nextBlobs;
    if (picked.length) set({ files: [...draft.files, ...picked] });
  };

  const removeFile = (id: string) => {
    const file = draft.files.find((f) => f.id === id);
    if (file?.thumb) URL.revokeObjectURL(file.thumb);
    fileBlobs.current.delete(id);
    set({ files: draft.files.filter((f) => f.id !== id) });
  };

  const onSubmit = async () => {
    if (step !== 5 || submitting) return;
    if (!ready.ready) {
      setShowErr({ 1: true, 2: true, 3: true, 4: true });
      const first = ready.attention[0]!;
      setStep(first.step);
      focusLater(first.field);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const submissionKey = getOrCreateSubmissionKey();
      const result = await submitRequest(draft, {
        submissionKey,
        fileBlobs: fileBlobs.current,
        uploadMode,
      });
      if (result.ok) {
        for (const f of draft.files) if (f.thumb) URL.revokeObjectURL(f.thumb);
        fileBlobs.current.clear();
        clearSubmissionKey();
        setOrderRef(result.ref);
        setStep(6);
        save(null);
        focusLater("ok-h");
      } else {
        setSubmitError(t(b.submitFailed, { reason: result.error }));
      }
    } catch {
      setSubmitError(t(b.submitFailed, { reason: b.submitFailedNetwork }));
    } finally {
      setSubmitting(false);
    }
  };

  const stepStates: StepState[] = [1, 2, 3, 4, 5].map((n) => {
    if (n === step) return "current";
    const hasIssue = checks.some((c) => c.step === n && c.status === "attn");
    if (showErr[n] && hasIssue) return "issue";
    if (n <= maxStep && !hasIssue) return "done";
    return "todo";
  });

  const StepIcon = STEP_ICONS[current - 1]!;
  const productName = draft.prod
    ? productLabel(draft.prod, catalog.productNames)
    : draft.cat
      ? (catalog.categoryNames[draft.cat] ?? categoryLabel(draft.cat))
      : "";
  const mobileSub =
    t(b.stepOf, { n: current }) + (productName && current > 1 ? ` · ${productName}` : "");
  const done = step === 6;

  const attention = ready.attention;
  const tip =
    attention.length === 0
      ? b.tipReady
      : current === 5 && attention.some((c) => showErr[c.step])
        ? b.tipPastSteps
        : current < 5 && stepIssues.length === 0
          ? t(b.tipStepDone, { action: current === 4 ? b.toReview : b.next })
          : current < 5
            ? t(b.tipNext, {
                label: stepIssues[0]!.label,
                more:
                  stepIssues.length === 1
                    ? ""
                    : stepIssues.length === 2
                      ? b.tipMoreOne
                      : t(b.tipMoreMany, { n: stepIssues.length - 1 }),
              })
            : b.tipReview;

  return (
    <div className={s.root}>
      <BuilderHeader
        step={step}
        maxStep={maxStep}
        stepStates={stepStates}
        onGo={(n) => n <= maxStep && goStep(n as Step)}
        showStepper={!done}
        demo={DEMO_MODE}
      />
      <MobileHeader
        step={current}
        title={b.titles[current - 1]!}
        sub={mobileSub}
        onBack={current > 1 && !done ? () => goStep((current - 1) as Step) : null}
        readiness={ready}
        checks={checks}
        onFix={fix}
        done={done}
        demo={DEMO_MODE}
      />

      <main
        id="main"
        className="relative isolate mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-4 pb-32 lg:px-6 lg:pt-2 lg:pb-16"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
        <img
          src="/brand/ornament-teal.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[60px] -left-80 -z-10 hidden size-[700px] lg:block dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
        <img
          src="/brand/ornament-mint.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[60px] -left-80 -z-10 hidden size-[700px] opacity-20 dark:lg:block"
        />

        {done ? (
          <Confirmation draft={draft} orderRef={orderRef} />
        ) : (
          <form
            noValidate
            aria-labelledby="step-h"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
            className={cn(
              s.card,
              s.formCard,
              s.animUp,
              "mx-auto flex w-full max-w-[920px] min-w-0 flex-col gap-[26px] rounded-[30px] px-4 py-6 sm:px-8 sm:py-[30px]",
            )}
          >
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className={cn(s.tile, "size-[52px] rounded-2xl! [&_svg]:size-[26px]")}
              >
                <StepIcon strokeWidth={1.75} />
              </span>
              <div className="flex flex-col">
                <span className={cn(s.muted, "text-[13px] font-bold")}>
                  {t(b.stepOf, { n: current })}
                </span>
                <h1
                  id="step-h"
                  tabIndex={-1}
                  className={cn(
                    s.strong,
                    "m-0 text-2xl leading-9 font-extrabold sm:text-[28px] sm:leading-10",
                  )}
                >
                  {b.titles[current - 1]}
                </h1>
              </div>
            </div>
            <p className={cn(s.muted, "-mt-3.5 mb-0 text-[15px] leading-[26px]")}>
              {b.hints[current - 1]}
            </p>

            {showErr[current] && stepIssues.length > 0 && current < 5 ? (
              <div role="alert" className={cn(s.alert, s.pop)}>
                <TriangleAlert aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                <span>{t(b.stepErrors, { n: stepIssues.length })}</span>
              </div>
            ) : null}

            {current === 1 ? <StepType d={draft} set={set} e={errors} catalog={catalog} /> : null}
            {current === 2 ? (
              <StepDetails d={draft} set={set} e={errors} catalog={catalog} />
            ) : null}
            {current === 3 ? (
              <StepFiles d={draft} set={set} e={errors} onFiles={onFiles} onRemove={removeFile} />
            ) : null}
            {current === 4 ? <StepContact d={draft} set={set} e={errors} today={today} /> : null}
            {current === 5 ? (
              <StepReview
                catalog={catalog}
                d={draft}
                checks={checks}
                onEdit={(n) => goStep(n)}
                submitError={submitError}
              />
            ) : null}

            {/* Actions: in the card on desktop, a sticky bar on phones (Request-Mobile.html). */}
            <div
              className={cn(
                s.line,
                s.actionBar,
                "flex items-center gap-3 border-t pt-5 [&_button]:whitespace-nowrap",
                "max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-40 max-lg:rounded-[26px] max-lg:border max-lg:p-2.5 max-lg:pb-[max(0.625rem,env(safe-area-inset-bottom))]",
              )}
            >
              {current > 1 ? (
                <button
                  type="button"
                  onClick={() => goStep((current - 1) as Step)}
                  className={cn(
                    s.btn,
                    s.soft,
                    "min-h-[50px] px-5 text-[15px] sm:px-6 [&_svg]:size-[18px]",
                  )}
                >
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                  {b.back}
                </button>
              ) : null}
              <span
                aria-live="polite"
                className={cn(
                  s.muted,
                  "hidden min-w-0 flex-[1_1_200px] items-center justify-center gap-2 text-center text-[13px] leading-5 lg:flex",
                )}
              >
                {attention.length === 0 ? (
                  <CircleCheck
                    aria-hidden="true"
                    className={cn(s.accent, "size-4 shrink-0")}
                    strokeWidth={1.75}
                  />
                ) : (
                  <ArrowLeft
                    aria-hidden="true"
                    className={cn(s.accent, "size-4 shrink-0")}
                    strokeWidth={1.75}
                  />
                )}
                {tip}
              </span>
              {current < 5 ? (
                <button
                  key="next"
                  type="button"
                  onClick={next}
                  className={cn(
                    s.btn,
                    s.cta,
                    "min-h-[52px] grow px-[34px] text-base font-extrabold lg:grow-0 [&_svg]:size-5",
                  )}
                >
                  <span className="lg:hidden">
                    {current === 4
                      ? b.toReview
                      : t(b.nextTo, { step: b.stepShort[current as 1 | 2 | 3 | 4] })}
                  </span>
                  <span className="max-lg:hidden">{current === 4 ? b.toReview : b.next}</span>
                  <ArrowLeft aria-hidden="true" strokeWidth={1.75} />
                </button>
              ) : (
                // Distinct key: reusing the "next" element as a submit button mid-click would
                // submit the form the moment the review step opens.
                <button
                  key="submit"
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className={cn(
                    s.btn,
                    s.cta,
                    "min-h-14 grow px-10 text-[17px] font-extrabold lg:grow-0 [&_svg]:size-5",
                  )}
                >
                  <Send aria-hidden="true" strokeWidth={1.75} />
                  {submitting ? b.submitting : submitError ? b.resubmit : b.submit}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
