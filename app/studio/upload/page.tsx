import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import UploadForm from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio/upload");

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Add a video" backHref="/studio" />
      <UploadForm />
    </div>
  );
}
