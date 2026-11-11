// Where a notification leads, by kind. Pure helper (safe in client components).
export function notificationHref(kind, audience = "admin") {
  if (audience === "user") return "/customer/my-packages";
  switch (kind) {
    case "request":
    case "resend":
      return "/admin/packages";
    default:
      return "/admin/notifications";
  }
}
