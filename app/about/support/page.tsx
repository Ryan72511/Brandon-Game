import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Support — ${APP_NAME}` };

const PAGES = [
  {
    href: "/about/guidelines",
    title: "Community guidelines",
    sub: "The rules that keep Gasp friendly",
  },
  {
    href: "/about/terms",
    title: "Terms of use",
    sub: "The deal between you and Gasp",
  },
  {
    href: "/about/privacy",
    title: "Privacy policy",
    sub: "What we collect (very little) and what we don't",
  },
  {
    href: "/about/copyright",
    title: "Copyright & takedowns",
    sub: "How rights holders can report infringement",
  },
];

export default function SupportPage() {
  return (
    <div>
      <PageHeader title="Support" backHref="/you" />
      <div className="mx-auto max-w-2xl px-4 py-4 text-[16px] leading-relaxed">
        <p>
          Stuck, confused, or found something broken? We&apos;re a small team and
          we actually read our inbox.
        </p>

        <div className="mt-4 rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-lg font-bold">Email us</p>
          <p className="mt-1">
            <a href="mailto:support@gasp.app" className="font-semibold text-accent underline">
              support@gasp.app
            </a>
          </p>
          <p className="mt-2 text-[15px] text-ink-soft">
            Include your username, what you were doing, what happened, and —
            if it&apos;s about a video — a link to it. Screenshots help a lot.
          </p>
        </div>

        <h2 className="mt-6 mb-2 text-lg font-bold">Seeing something that breaks the rules?</h2>
        <p>
          The fastest route for content issues is the Report button inside
          the app — on any video, creator, or comment. Reports go straight
          to our moderators. You can also block a creator to hide their
          videos and comments from your {APP_NAME} entirely.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">The fine print, in plain words</h2>
        <div className="mt-2 flex flex-col gap-3">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{p.title}</span>
                <span className="block text-[14px] text-ink-soft">{p.sub}</span>
              </span>
              <span className="text-ink-soft" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
