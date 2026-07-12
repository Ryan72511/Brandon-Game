import PageHeader from "@/components/PageHeader";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Copyright & takedowns — ${APP_NAME}` };

export default function CopyrightPage() {
  return (
    <div>
      <PageHeader title="Copyright & takedowns" backHref="/you" />
      <div className="mx-auto max-w-2xl px-4 py-4 text-[16px] leading-relaxed">
        <p>
          Creators on {APP_NAME} promise at upload that they own or control
          the rights to everything in their videos — the footage, the music,
          the performances, the artwork. When that promise is broken, here is
          how to tell us and what we do about it.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">If your work was posted without permission</h2>
        <p>
          You don&apos;t need a {APP_NAME} account to file a report. Email{" "}
          <span className="font-semibold">support@gasp.app</span> and
          include:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            What your work is — a description, and a link or copy if you
            have one.
          </li>
          <li>A link to the {APP_NAME} video that uses it.</li>
          <li>Your name and how we can reach you.</li>
        </ul>
        <p className="mt-3">
          If you do have an account, there&apos;s an even faster route: every
          video&apos;s Report option includes a copyright reason. Reports filed
          in the app land in the same moderation queue.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">What happens next</h2>
        <p>
          We remove disputed content promptly while we review the claim. If
          the claim checks out, the video stays down. If it turns out to be a
          mistake, we restore the video. Either way, we&apos;ll follow up with
          you at the contact info you gave us.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Repeat infringers</h2>
        <p>
          Accounts that repeatedly upload content they don&apos;t have rights to
          are banned. One honest mistake is a conversation; a pattern is a
          goodbye.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">A note for creators</h2>
        <p>
          The safest video is one where everything in it is yours: your
          footage, your music (or music you&apos;ve licensed), your art. When in
          doubt, leave it out — or get written permission first.
        </p>
      </div>
    </div>
  );
}
