import PageHeader from "@/components/PageHeader";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Privacy policy — ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader title="Privacy policy" backHref="/you" />
      <div className="mx-auto max-w-2xl px-4 py-4 text-[16px] leading-relaxed">
        <p className="text-ink-soft">Effective July 2026</p>
        <p className="mt-3">
          {APP_NAME} collects as little as possible and shares nothing. This
          page explains exactly what we keep and why — no legal fog.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">What we collect</h2>
        <p>When you use {APP_NAME} with an account, we store:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Your username, display name, avatar, and bio — plus creator info
            (about, tools, process) if you fill it in.
          </li>
          <li>
            Your email address — used only for your account and to help you get
            back in if you forget your password. We never post it, show it to
            other people, or sell or share it.
          </li>
          <li>
            Your password, stored only as a scrypt hash. We never see or
            store the password itself. Your recovery code is stored the same
            hashed way — used only to reset a forgotten password.
          </li>
          <li>
            The year you were born — used only to keep {APP_NAME}
            age-appropriate (we don&apos;t store your full birth date).
          </li>
          <li>
            What you make: uploaded videos with their captions and poster
            images, series, and channels.
          </li>
          <li>
            What you do: ratings (your Popcorn votes), comments, friendships,
            channel follows, blocks, and reports you file.
          </li>
          <li>
            Watch history: which videos you watched and how far you got. This
            powers Continue Watching for you and view analytics for
            creators.
          </li>
          <li>In-app notifications, like friend requests and new videos.</li>
        </ul>

        <h2 className="mt-6 mb-2 text-lg font-bold">What we don&apos;t collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>No phone number, no full name required, no home address.</li>
          <li>No advertising, and no ad profiles.</li>
          <li>No third-party analytics or tracking SDKs.</li>
          <li>No selling or sharing of your data with anyone.</li>
          <li>No tracking you across other apps or websites.</li>
        </ul>

        <h2 className="mt-6 mb-2 text-lg font-bold">Where your data lives</h2>
        <p>
          Your data stays on {APP_NAME}&apos;s servers. The only outside companies
          involved are the hosting providers that run those servers for us,
          and they only store the data — they don&apos;t get to use it for
          anything else.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">How long we keep it</h2>
        <p>
          We keep your data for as long as your account exists. When you
          delete your account, your personal data and your uploaded videos
          are removed.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Your choices</h2>
        <p>
          You can edit your profile any time, and you can delete your
          account from Settings → Delete account, which removes your data as
          described above. For anything else — a question, a copy of your
          data, or help with deletion — email support@gasp.app.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">For parents</h2>
        <p>
          {APP_NAME} accounts are for people 13 and older. We don&apos;t knowingly
          create accounts for younger children. If you believe a child under
          13 has an account, email support@gasp.app and we&apos;ll remove it.
          Watching doesn&apos;t require an account, and creators must flag mature
          content, which is labeled and kept off kid-focused surfaces.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Changes and contact</h2>
        <p>
          If this policy changes in a meaningful way, we&apos;ll update this page
          and the effective date, and let you know in the app. Questions go
          to support@gasp.app.
        </p>
      </div>
    </div>
  );
}
