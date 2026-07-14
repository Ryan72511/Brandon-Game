import { Suspense } from "react";
import ForgotForm from "@/components/ForgotForm";
import GaspMark from "@/components/GaspMark";

export default function ForgotPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center text-center">
        <GaspMark size={56} />
        <h1 className="mt-3 text-3xl font-bold display">Forgot your password?</h1>
        <p className="mt-2 text-ink-soft">We&apos;ll email you a link to pick a new one.</p>
      </div>
      <Suspense>
        <ForgotForm />
      </Suspense>
    </div>
  );
}
