"use client";

// Shows an ISO moment as hh:mm in the viewer's own time zone.
export default function LocalTime({ at }) {
  return <span suppressHydrationWarning>{new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>;
}
