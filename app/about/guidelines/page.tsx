import PageHeader from "@/components/PageHeader";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Community guidelines — ${APP_NAME}` };

export default function GuidelinesPage() {
  return (
    <div>
      <PageHeader title="Community guidelines" backHref="/you" />
      <div className="mx-auto max-w-2xl px-4 py-4 text-[16px] leading-relaxed">
        <p>
          {APP_NAME} is a place for tiny shows and big feelings. People of all
          ages watch here, side by side. These rules keep it a place everyone
          can enjoy. They apply to everything you post: videos, comments,
          channel names, profiles — all of it.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Keep it clean</h2>
        <p>
          No pornography or sexual content of any kind. {APP_NAME} is not the
          place for it, full stop.
        </p>
        <p className="mt-3">
          Anything that sexualizes or exploits a minor is met with zero
          tolerance. We remove it, permanently ban the account immediately,
          and report it to the authorities.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Be kind to each other</h2>
        <p>
          No threats, bullying, or harassment. Disagreeing with a video is
          fine — going after the person who made it is not. Don&apos;t pile on,
          don&apos;t intimidate, don&apos;t try to make someone feel unsafe.
        </p>
        <p className="mt-3">
          No hate based on who someone is — their race, ethnicity, religion,
          disability, gender, sexual orientation, age, or anything else about
          their identity. Everyone gets to be here.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Keep it safe</h2>
        <p>
          No graphic violence. Fictional drama and spooky stories are welcome
          (that&apos;s what the Horror category is for) — real gore and cruelty
          are not.
        </p>
        <p className="mt-3">
          Don&apos;t encourage or show dangerous or illegal activity. If copying
          what&apos;s in your video could land someone in the hospital or in
          trouble with the law, don&apos;t post it.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">Keep it honest</h2>
        <p>
          No scams and no spam. Don&apos;t trick people, don&apos;t flood comments or
          uploads with junk, and don&apos;t try to game the Popcorn Score.
        </p>
        <p className="mt-3">
          No impersonation. Don&apos;t pretend to be another person, creator, or
          organization. Parody is fine when it&apos;s obviously parody.
        </p>
        <p className="mt-3">
          Only post what&apos;s yours. If you didn&apos;t make it — or don&apos;t have
          permission for the video, the music, and everything in it — don&apos;t
          upload it. See our copyright page for how takedowns work.
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">How enforcement works</h2>
        <p>
          Every video and comment on {APP_NAME} can be reported. If something
          feels wrong, tap Report and tell us why — it takes a few seconds.
          You can also block any creator, which hides their videos and
          comments from you everywhere in the app.
        </p>
        <p className="mt-3">
          Our moderators review reports promptly. When something breaks these
          rules, we can remove the content, and we can suspend the account
          that posted it. Repeat violations, or a single severe one, mean a
          permanent ban.
        </p>
        <p className="mt-3">
          Most people never need to think about any of this. Make things you
          love, be decent to each other, and you&apos;ll be fine. Questions? Write
          to support@reely.app.
        </p>
      </div>
    </div>
  );
}
