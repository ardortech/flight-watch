"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteWatchAndGoHome } from "@/lib/actions/watches";

/** Delete with inline confirm; the dashboard then shows the Undo bar. */
export function DeleteWatch({ locale, id, route }: { locale: string; id: string; route: string }) {
  const t = useTranslations("WatchDetail");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center rounded-lg border border-[#e3c4c4] bg-white px-4 font-semibold text-[#9a2b2b] hover:bg-[#fbeded]"
      >
        {t("delete")}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={t("confirmQuestion", { route })} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ebcaca] bg-[#fbeded] px-4 py-3">
      <span className="text-sm text-[#6e1f1f]">
        <strong>{t("confirmQuestion", { route })}</strong>
        {t("confirmBody")}
      </span>
      <div className="flex gap-2">
        <button type="button" autoFocus onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border border-[#c4cac4] bg-white px-4 font-bold text-ink">
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteWatchAndGoHome(locale, id))}
          className="min-h-11 rounded-lg bg-[#9a2b2b] px-4 font-bold text-white hover:bg-[#7f2222] disabled:opacity-60"
        >
          {t("confirmDelete")}
        </button>
      </div>
    </div>
  );
}
