import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import EditProfileForm from "@/components/EditProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/you/edit");

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Edit profile" backHref="/you" />
      <EditProfileForm
        initial={{
          displayName: user.displayName,
          bio: user.bio,
          avatarEmoji: user.avatarEmoji,
          avatarColor: user.avatarColor,
        }}
      />
    </div>
  );
}
