// The storefront routes get a full-viewport dark canvas behind the content
// (fixed so it also covers the tab-bar clearance padding), plus white focus
// rings via the night-scope wrapper.
export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="night-scope">
      <div className="night-canvas fixed inset-0 -z-10" aria-hidden />
      {children}
    </div>
  );
}
