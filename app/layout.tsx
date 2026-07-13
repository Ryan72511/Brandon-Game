import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import TabBar from "@/components/TabBar";

// Inter for UI (invisible, legible at 11px, tabular numerals for counts and
// coins); Bricolage Grotesque for display (characterful, built for drama).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Free streaming with a pulse — full series, microdramas, and creator reels on one widescreen stage. Made you gasp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — users must be able to pinch-zoom (WCAG 1.4.4).
  themeColor: "#0b0b10",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, read: false } })
    : 0;
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <TabBar
            mode={user?.mode ?? "watching"}
            signedIn={Boolean(user)}
            username={user?.username ?? null}
            unreadCount={unreadCount}
          />
        </div>
      </body>
    </html>
  );
}
