import { Suspense } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🍿
        </p>
        <h1 className="mt-2 text-3xl font-bold">{APP_NAME}</h1>
        <p className="text-ink-soft">{APP_TAGLINE}</p>
      </div>
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
