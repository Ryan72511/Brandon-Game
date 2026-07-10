// Channel detail pages share the storefront's dark canvas so tapping a tile
// doesn't flash from dark to white.
export default function ChannelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="night-scope">
      <div className="night-canvas fixed inset-0 -z-10" aria-hidden />
      {children}
    </div>
  );
}
