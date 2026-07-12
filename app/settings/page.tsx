import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="Settings" backHref="/you" />

      <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-xl font-bold">Change password</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          Forgot it instead? Use your recovery code on the{" "}
          <Link href="/reset" className="font-semibold text-accent underline">
            reset page
          </Link>
          .
        </p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
