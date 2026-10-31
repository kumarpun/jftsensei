"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables itself while its parent <form action> is pending,
// so a double click cannot create duplicate entries.
export default function SubmitButton({ children, pendingText, disabled, ...props }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
