import { screenshotsBlocked, openingDate } from "@/lib/settings";
import OpeningDateForm from "@/components/OpeningDateForm";
import { setScreenshotsBlocked } from "@/app/actions";

export default async function AdminSettings() {
  const blocked = await screenshotsBlocked();
  const opening = await openingDate();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">App-wide switches. The mobile app picks changes up the next time it opens or returns to the foreground.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Opening date notice</h3>
        <p className="muted">Shows customers (web and mobile app) a title, the date and a live countdown at the top of their home screen. It disappears when the date arrives.</p>
        <OpeningDateForm label={opening?.label ?? ""} at={opening?.at ?? ""} />
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Screenshots &amp; screen recording</h3>
        <p className="muted">
          Currently <strong>{blocked ? "blocked" : "allowed"}</strong> in the mobile app.
        </p>
        <form action={setScreenshotsBlocked}>
          <input type="hidden" name="blocked" value={blocked ? "0" : "1"} />
          <button className="btn primary" type="submit">{blocked ? "Allow screenshots" : "Block screenshots"}</button>
        </form>
      </div>
    </>
  );
}
