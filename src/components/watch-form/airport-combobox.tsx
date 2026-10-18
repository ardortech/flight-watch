"use client";

import { useId, useMemo, useState } from "react";
import { airportCity, airportName } from "@/lib/watches/describe";
import { searchAirports, type SearchableAirport } from "@/lib/watches/airport-search";

type Props = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  noMatch: string;
  airports: readonly SearchableAirport[];
  locale: string;
  /** Selected IATA code, or "" while nothing valid is picked. */
  value: string;
  onChange: (iata: string) => void;
  error?: string;
};

function display(a: SearchableAirport | undefined, locale: string) {
  return a ? `${a.iata} · ${airportCity(a, locale)}` : "";
}

/** Airport autocomplete (WAI-ARIA combobox). Submits the IATA code through a hidden input. */
export function AirportCombobox({ id, name, label, placeholder, noMatch, airports, locale, value, onChange, error }: Props) {
  const byCode = useMemo(() => new Map(airports.map((a) => [a.iata, a])), [airports]);
  const [text, setText] = useState(() => display(byCode.get(value), locale));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const errorId = `${id}-error`;

  const results = useMemo(() => (open ? searchAirports(airports, text) : []), [airports, text, open]);

  function choose(a: SearchableAirport) {
    onChange(a.iata);
    setText(display(a, locale));
    setOpen(false);
  }

  function onType(next: string) {
    setText(next);
    setOpen(true);
    setActive(0);
    // Typing an exact code selects it, so the field works without the list too.
    const exact = byCode.get(next.trim().toUpperCase());
    onChange(exact ? exact.iata : "");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const showList = open && text.trim() !== "" && !(value && text === display(byCode.get(value), locale));

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${results[active].iata}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`field ${error ? "border-high" : ""}`}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!showList}
        className="absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-auto rounded-lg border border-[#c4cac4] bg-white py-1 shadow-lg"
      >
        {results.map((a, i) => (
          <li
            key={a.iata}
            id={`${listId}-${a.iata}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: runs before the input's blur closes the list.
            onMouseDown={(e) => {
              e.preventDefault();
              choose(a);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 ${i === active ? "bg-low-bg" : ""}`}
          >
            <span className="w-10 shrink-0 font-mono font-semibold">{a.iata}</span>
            <span className="min-w-0">
              <span className="block truncate">{airportCity(a, locale)}</span>
              <span className="block truncate text-xs text-muted">{airportName(a, locale)}</span>
            </span>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">{noMatch}</li>}
      </ul>
      {error && (
        <p id={errorId} className="text-sm text-high">
          {error}
        </p>
      )}
    </div>
  );
}
