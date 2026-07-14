import { Suspense } from "react";
import VerifyForm from "@/components/VerifyForm";
import GaspMark from "@/components/GaspMark";

export default function VerifyPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center text-center">
        <GaspMark size={56} />
        <h1 className="mt-3 text-3xl font-bold display">Confirm your email</h1>
      </div>
      <Suspense>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
