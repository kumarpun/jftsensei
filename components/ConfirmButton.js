"use client";

// Submit button that asks for confirmation before the surrounding form posts.
export default function ConfirmButton({ message, children, ...props }) {
  return (
    <button {...props} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
