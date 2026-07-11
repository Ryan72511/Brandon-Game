// Search shares the storefront's dark canvas so hopping between the channel
// wall and search doesn't flash from dark to white.
export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="night-scope">
      <div className="night-canvas fixed inset-0 -z-10" aria-hidden />
      {children}
    </div>
  );
}
