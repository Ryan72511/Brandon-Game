import { Suspense } from "react";
import ResetForm from "@/components/ResetForm";

export default function ResetPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🍿
        </p>
        <h1 className="mt-2 text-3xl font-bold">Reset your password</h1>
      </div>
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
