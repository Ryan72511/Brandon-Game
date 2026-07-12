import { Suspense } from "react";
import { APP_TAGLINE } from "@/lib/constants";
import AuthForm from "@/components/AuthForm";
import GaspWordmark from "@/components/GaspWordmark";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center text-center">
        <GaspWordmark height={56} />
        <p className="mt-3 text-ink-soft">{APP_TAGLINE}</p>
      </div>
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
