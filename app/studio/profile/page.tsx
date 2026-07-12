import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { parseTags } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import CreatorProfileForm from "@/components/CreatorProfileForm";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio/profile");

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Your creator page" backHref="/studio" />
      <p className="text-ink-soft">
        This is what people see when they tap your name. Tell them who you are and how you
        make your videos — Gasp celebrates the maker.
      </p>
      <CreatorProfileForm
        initial={{
          displayName: user.displayName,
          bio: user.bio,
          creatorAbout: user.creatorAbout,
          creatorProcess: user.creatorProcess,
          creatorTools: parseTags(user.creatorTools),
        }}
        username={user.username}
      />
    </div>
  );
}
