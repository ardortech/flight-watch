"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deleteWatch, restoreWatch } from "@/lib/actions/watches";

export type WatchCard = {
  id: string;
  route: string;
  cities: string;
  dates: string;
  filters: string;
  window: string;
  priceNote: string;
  paused: boolean;
};

type Undo = { id: string; route: string };

/** Watch cards with delete → inline confirm → soft delete → Undo bar (SPEC §7 screen 1). */
export function WatchList({ cards, initialUndo }: { cards: WatchCard[]; initialUndo: Undo | null }) {
  const t = useTranslations("Dashboard");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [undo, setUndo] = useState<Undo | null>(initialUndo);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Hide right away; the server action then refreshes the list from the database.
  const visible = cards.filter((c) => !hidden.includes(c.id));

  function confirmDelete(card: WatchCard) {
    setConfirming(null);
    setError(null);
    setHidden((h) => [...h, card.id]);
    setUndo({ id: card.id, route: card.route });
    startTransition(async () => {
      const { ok } = await deleteWatch(card.id);
      if (!ok) {
        setHidden((h) => h.filter((id) => id !== card.id));
        setUndo(null);
        setError(t("deleteFailed", { route: card.route }));
      }
    });
  }

  function runUndo() {
    if (!undo) return;
    const item = undo;
    setError(null);
    startTransition(async () => {
      const { ok } = await restoreWatch(item.id);
      if (ok) {
        setHidden((h) => h.filter((id) => id !== item.id));
        setUndo(null);
        // Drop ?deleted= so a reload doesn't offer Undo again.
        if (window.location.search.includes("deleted=")) window.history.replaceState(null, "", window.location.pathname);
      } else {
        setError(t("undoFailed", { route: item.route }));
      }
    });
  }

  return (
    <section aria-label={t("list")} className="flex flex-col gap-3">
      {undo && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy py-2.5 pr-3 pl-5 text-ground">
          <span>{t("deleted", { route: undo.route })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runUndo}
              disabled={pending}
              className="min-h-11 rounded-lg border border-[#4a5b6c] px-4 font-bold text-white hover:bg-white/10 disabled:opacity-60"
            >
              {t("undo")}
            </button>
            <button
              type="button"
              onClick={() => setUndo(null)}
              aria-label={t("dismiss")}
              className="inline-flex size-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-high/30 bg-high-bg px-4 py-3 text-sm text-high">
          {error}
        </p>
      )}

      {visible.map((w) => (
        <div key={w.id} className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-stretch">
            <Link
              href={`/watches/${w.id}`}
              className="flex min-w-0 flex-auto flex-wrap items-center gap-x-8 gap-y-5 px-6 py-5 text-ink hover:bg-ground/50"
            >
              <div className="min-w-0 flex-[2_1_260px]">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="font-mono text-[22px] font-semibold tracking-[0.02em]">{w.route}</span>
                  <span className="text-sm text-muted">{w.cities}</span>
                </div>
                <div className="mt-1 text-sm">{w.dates}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {w.paused && <span className="rounded-full bg-high-bg px-2 py-0.5 text-xs font-bold text-high">{t("paused")}</span>}
                  <span className="rounded-full bg-[#eef0ec] px-2 py-0.5 text-xs text-[#3d4650]">{w.filters}</span>
                  <span className="rounded-full bg-[#eef0ec] px-2 py-0.5 text-xs text-[#3d4650]">{w.window}</span>
                </div>
              </div>
              <div className="flex-[1_1_140px] text-xs text-muted">{t("noTrendYet")}</div>
              <div className="flex-[1_1_160px] text-right">
                <div className="text-base font-semibold text-muted">{t("awaitingPrice")}</div>
                <div className="text-[13px] text-muted">{w.priceNote}</div>
              </div>
            </Link>
            <div className="flex items-center border-l border-[#eef0ec] px-2.5">
              <button
                type="button"
                aria-label={t("deleteLabel", { route: w.route })}
                aria-expanded={confirming === w.id}
                title={t("deleteTitle")}
                onClick={() => setConfirming(confirming === w.id ? null : w.id)}
                className="inline-flex size-11 items-center justify-center rounded-lg text-[#6b7680] hover:bg-[#fbeded] hover:text-[#9a2b2b]"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
          {confirming === w.id && (
            <div
              role="alertdialog"
              aria-label={t("confirmLabel", { route: w.route })}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebcaca] bg-[#fbeded] py-3 pr-4 pl-6"
            >
              <span className="text-sm text-[#6e1f1f]">
                <strong>{t("confirmQuestion", { route: w.route })}</strong>
                {t("confirmBody")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirming(null)}
                  className="min-h-11 rounded-lg border border-[#c4cac4] bg-white px-4 font-bold text-ink"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(w)}
                  className="min-h-11 rounded-lg bg-[#9a2b2b] px-4 font-bold text-white hover:bg-[#7f2222]"
                >
                  {t("confirmDelete")}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#c4cac4] bg-white px-6 py-10 text-center">
          <div className="text-lg font-bold">{t("emptyTitle")}</div>
          <div className="text-muted">{t("emptyBody")}</div>
          <Link href="/watches/new" className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 font-bold text-white">
            {t("emptyCta")}
          </Link>
        </div>
      )}
    </section>
  );
}

export function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}
