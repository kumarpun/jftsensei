"use client";

import { useEffect, useState } from "react";

// "Free" badge for a set whose category has no price yet: clicking it shows a tooltip telling the admin to set the category price.
export default function NoPriceHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <span className="nopr-wrap">
      <button type="button" className="badge nopr-btn" aria-expanded={show} onClick={() => setShow((v) => !v)}>Free</button>
      {show && <span className="nopr-tip" role="tooltip">Add a price in the category first (category ⋮ → Price / days)</span>}
    </span>
  );
}
