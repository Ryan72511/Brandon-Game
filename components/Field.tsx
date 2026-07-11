"use client";

// The one form-field look, in one place. Every text input/textarea/select
// in the app shares these styles — new forms compose these instead of
// repeating the className stack.
const FIELD_CLASS =
  "rounded-xl border-2 border-line bg-surface text-lg font-normal outline-none focus:border-accent";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      <span>
        {label} {hint && <span className="font-normal text-ink-soft">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-14 px-4 ${FIELD_CLASS} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`p-4 ${FIELD_CLASS} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-14 px-4 ${FIELD_CLASS} ${props.className ?? ""}`} />;
}

export function SubmitButton({
  busy,
  children,
  disabled,
}: {
  busy: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="min-h-14 rounded-xl bg-accent font-bold text-white disabled:opacity-40"
    >
      {busy ? "One moment…" : children}
    </button>
  );
}
