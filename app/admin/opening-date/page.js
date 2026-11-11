import { allOpenings } from "@/lib/openings";
import { deleteOpeningDate } from "@/app/actions";
import OpeningAddForm from "@/components/OpeningAddForm";
import LocalTime from "@/components/LocalTime";
import ConfirmButton from "@/components/ConfirmButton";

export default async function AdminOpeningDate() {
  const items = await allOpenings();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Opening date</h1>
          <p className="muted">Each one shows customers (web and mobile app) a title, the date and a live countdown at the top of their home screen. It disappears when the date arrives.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <OpeningAddForm />
      </div>
      <div className="card flush" style={{ maxWidth: 560 }}>
        <div className="card-head"><h3>Dates</h3><span className="muted">{items.length}</span></div>
        {items.map((o) => (
          <div className="row between" key={o.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", gap: 12 }}>
            <div>
              <strong>{o.label}</strong>
              <div className="muted">{o.date}{o.at && <> · <LocalTime at={o.at} /></>}{o.date < today ? " · past" : ""}</div>
            </div>
            <form action={deleteOpeningDate}>
              <input type="hidden" name="id" value={o.id} />
              <ConfirmButton message={`Delete "${o.label}"?`} className="sm">Delete</ConfirmButton>
            </form>
          </div>
        ))}
        {items.length === 0 && <div className="empty" style={{ padding: 20 }}>No dates yet.</div>}
      </div>
    </>
  );
}
