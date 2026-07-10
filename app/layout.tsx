import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import TabBar from "@/components/TabBar";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Watch and make tiny shows. Build your own channels, rate with popcorn, share with friends.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f0f2f5",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <TabBar
            mode={user?.mode ?? "watching"}
            signedIn={Boolean(user)}
            username={user?.username ?? null}
          />
        </div>
      </body>
    </html>
  );
}
