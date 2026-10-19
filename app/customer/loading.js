// Shown instantly on tab switches while the server renders the next page.
export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      <div className="card" style={{ height: 120, opacity: 0.5 }} />
      <div className="card" style={{ height: 120, opacity: 0.5 }} />
      <div className="card" style={{ height: 120, opacity: 0.5 }} />
    </div>
  );
}
