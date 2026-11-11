"use client";

// Shows an ISO moment as hh:mm in Nepal time (Asia/Kathmandu), whatever the viewer's zone.
export default function LocalTime({ at }) {
  return <span suppressHydrationWarning>{new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" })} NPT</span>;
}
