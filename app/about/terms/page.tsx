import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Terms of use — ${APP_NAME}` };

export default function TermsPage() {
  return (
    <div>
      <PageHeader title="Terms of use" backHref="/you" />
      <div className="mx-auto max-w-2xl px-4 py-4 text-[16px] leading-relaxed">
        <p>
          Welcome to {APP_NAME}. These terms are the deal between you and{" "}
          {APP_NAME} when you use the app. We&apos;ve written them in plain
          language on purpose — if anything is unclear, ask us at
          support@reely.app.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">1. Who can use {APP_NAME}</h2>
        <p>
          You must be at least 13 years old to create an account. Anyone can
          watch without an account; rating, commenting, making friends, and
          creating require one.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">2. Your account</h2>
        <p>
          Your account is yours. Keep your password to yourself, and pick one
          that isn&apos;t easy to guess. You&apos;re responsible for what happens under
          your account, so if you think someone else got into it, change your
          password and tell us at support@reely.app.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">3. Your videos and your rights</h2>
        <p>
          When you upload a video, you confirm that you own or control all
          the rights in it — including the music, the performers, any artwork
          shown, and the locations where you filmed. If someone else&apos;s work
          appears in your video, you need their permission first.
        </p>
        <p className="mt-3">
          You keep ownership of everything you upload. To run the service,
          you grant {APP_NAME} a non-exclusive, worldwide, royalty-free
          license to host, stream, thumbnail, feature, and promote your video
          inside the service — for example, showing it in channels, charts,
          and search. This license is only about making {APP_NAME} work; it
          ends for a video when the video is deleted.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">4. What&apos;s not allowed</h2>
        <p>
          The rules of the road live in our{" "}
          <Link href="/about/guidelines" className="font-semibold text-accent underline">
            community guidelines
          </Link>
          . In short: nothing sexual, nothing hateful, nothing violent or
          dangerous, no bullying, no scams or spam, no impersonation, and
          nothing you don&apos;t have the rights to post. The guidelines are part
          of these terms.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">5. Moderation</h2>
        <p>
          Anyone can report a video, creator, or comment inside the app. Our
          moderators review reports and may remove content or suspend
          accounts that break the rules. Repeat or severe violations mean a
          permanent ban. We try to be fair and quick, and we make these calls
          to keep {APP_NAME} safe for everyone.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">6. Deleting your account</h2>
        <p>
          You can delete your account any time from Settings → Delete
          account. When you do, your uploaded videos are removed along with
          the account. See the{" "}
          <Link href="/about/privacy" className="font-semibold text-accent underline">
            privacy policy
          </Link>{" "}
          for exactly what gets deleted.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">7. Disclaimers</h2>
        <p>
          {APP_NAME} is provided &quot;as is.&quot; We work hard to keep it running
          smoothly, but we can&apos;t promise it will always be available,
          bug-free, or that any particular video will stay up. Videos are
          made by their creators, and their views are their own.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">8. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, {APP_NAME} isn&apos;t liable for
          indirect losses — things like lost profits, lost data, or damages
          caused by content other people posted. Nothing in these terms takes
          away rights that the law says you always have.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">9. Changes to these terms</h2>
        <p>
          If we make meaningful changes to these terms, we&apos;ll update this
          page and let you know in the app. Continuing to use {APP_NAME}{" "}
          after a change means you accept the new terms.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">10. Contact</h2>
        <p>
          Questions about these terms? Email us at support@reely.app. We read
          everything.
        </p>
      </div>
    </div>
  );
}
