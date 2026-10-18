"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInWithMagicLink, type SignInState } from "@/lib/actions/auth";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Login");
  const [state, action, pending] = useActionState<SignInState, FormData>(signInWithMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="mt-6 rounded-lg border border-low/30 bg-low-bg p-4 text-low">
        <p className="font-semibold">{t("sentTitle")}</p>
        <p className="mt-1 text-sm">{t("sent", { email: state.email ?? "" })}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="email" className="block text-sm font-medium">
        {t("emailLabel")}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        placeholder={t("emailPlaceholder")}
        aria-invalid={state.status === "invalid"}
        aria-describedby={state.status === "invalid" || state.status === "error" ? "email-error" : undefined}
        className="block w-full rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-amber/50"
      />
      {(state.status === "invalid" || state.status === "error") && (
        <p id="email-error" role="alert" className="text-sm text-high">
          {t(state.status)}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-amber px-4 py-2 font-semibold text-navy hover:bg-amber-strong disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
