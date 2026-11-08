"use client";

import { Children, useState, useTransition } from "react";
import { saveCategoryOrder, saveFolderOrder } from "@/app/actions";

// Drag-and-drop ordering for categories or a category's folders.
// Grab the ⠿ handle: a line shows where the item will land, and the order changes (and saves) only when you drop.
export default function SortableFolders({ category, names, children, kind = "folder" }) {
  const [order, setOrder] = useState(names);
  const [drag, setDrag] = useState(null);
  const [armed, setArmed] = useState(null);
  const [target, setTarget] = useState(null); // { name, after }
  const [, start] = useTransition();
  const byName = new Map(Children.toArray(children).map((c, i) => [names[i], c]));

  const over = (e, name) => {
    if (drag === null) return;
    e.preventDefault();
    if (drag === name) return setTarget(null);
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (!target || target.name !== name || target.after !== after) setTarget({ name, after });
  };

  const reset = () => { setDrag(null); setArmed(null); setTarget(null); };

  const drop = (e) => {
    e.preventDefault();
    if (drag !== null && target) {
      const next = order.filter((n) => n !== drag);
      next.splice(next.indexOf(target.name) + (target.after ? 1 : 0), 0, drag);
      if (next.join("\n") !== order.join("\n")) {
        setOrder(next);
        start(() => (kind === "category" ? saveCategoryOrder(next) : saveFolderOrder(category, next)));
      }
    }
    reset();
  };

  return (
    <>
      {order.map((name) => (
        <div
          key={name}
          className={`folder-sort${kind === "category" ? " cat" : ""}${drag === name ? " dragging" : ""}${target?.name === name ? (target.after ? " drop-after" : " drop-before") : ""}`}
          draggable={armed === name}
          onDragStart={(e) => { setDrag(name); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", name); }}
          onDragOver={(e) => over(e, name)}
          onDrop={drop}
          onDragEnd={reset}
        >
          <button type="button" className="folder-grip" aria-label={`Drag to move ${name}`} title="Drag to reorder" onMouseDown={() => setArmed(name)} onMouseUp={() => setArmed(null)}>⠿</button>
          {byName.get(name)}
        </div>
      ))}
    </>
  );
}
