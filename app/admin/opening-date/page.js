import { openingDate } from "@/lib/settings";
import OpeningDateForm from "@/components/OpeningDateForm";

export default async function AdminOpeningDate() {
  const opening = await openingDate();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Opening date</h1>
          <p className="muted">Shows customers (web and mobile app) a title, the date and a live countdown at the top of their home screen. It disappears when the date arrives.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <OpeningDateForm label={opening?.label ?? ""} at={opening?.at ?? ""} />
      </div>
    </>
  );
}
