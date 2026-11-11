"use client";

import { Children, useRef, useState, useTransition } from "react";
import { saveCategoryOrder, saveFolderOrder } from "@/app/actions";

// Drag-and-drop ordering for categories or a category's folders.
// Grab the ⠿ handle or anywhere on the row header (not its buttons): a line shows where the item will land, and the order changes (and saves) only when you drop.
export default function SortableFolders({ category, names, labels, children, kind = "folder" }) {
  const [order, setOrder] = useState(names);
  const [drag, setDrag] = useState(null);
  const armed = useRef(null); // set by the handle; read at dragstart so there is no re-render timing race
  const [target, setTarget] = useState(null); // { name, after }
  const [, start] = useTransition();
  const byName = new Map(Children.toArray(children).map((c, i) => [names[i], c]));

  const over = (e, name) => {
    if (drag === null) return;
    e.preventDefault();
    e.stopPropagation();
    if (drag === name) return setTarget(null);
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (!target || target.name !== name || target.after !== after) setTarget({ name, after });
  };

  const reset = () => { setDrag(null); armed.current = null; setTarget(null); };

  const commit = () => {
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

  const drop = (e) => {
    if (drag === null) return;
    e.preventDefault();
    e.stopPropagation();
    commit();
  };

  // Items are always draggable, but only a drag that started on this item's handle is allowed; others are cancelled.
  // stopPropagation keeps a folder drag from also being handled by the category that contains it.
  const dragStart = (e, name) => {
    e.stopPropagation();
    if (armed.current !== name) return e.preventDefault();
    setDrag(name);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", name);
  };

  // Mouse: pressing anywhere on this item's header (summary / price corner), except controls, arms a drag.
  const arm = (e, name) => {
    if (e.button !== 0 || e.target.closest("button, a, input, select, textarea, label")) return;
    if (e.target.closest("[data-sort-name]") !== e.currentTarget) return; // a nested item handles its own header
    if (!e.target.closest("summary, .cat-price-corner, .folder-menu")) return;
    armed.current = name;
  };

  // Touch / pen: HTML5 drag-and-drop does not fire on touch screens, so the handle drives the drag with pointer events.
  const scope = `${kind}:${category ?? ""}`;
  const touchDown = (e, name) => {
    if (e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(name);
  };
  const touchMove = (e, name) => {
    if (e.pointerType === "mouse" || drag !== name) return;
    if (e.clientY < 70) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-sort-scope]");
    if (!el || el.dataset.sortScope !== scope || el.dataset.sortName === name) return setTarget(null);
    const r = el.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (!target || target.name !== el.dataset.sortName || target.after !== after) setTarget({ name: el.dataset.sortName, after });
  };
  const touchUp = (e) => {
    if (e.pointerType === "mouse") return;
    commit();
  };

  return (
    <>
      {order.map((name) => (
        <div
          key={name}
          className={`folder-sort${kind === "category" ? " cat" : ""}${drag === name ? " dragging" : ""}${target?.name === name ? (target.after ? " drop-after" : " drop-before") : ""}`}
          data-sort-scope={scope}
          data-sort-name={name}
          draggable
          onMouseDown={(e) => arm(e, name)}
          onMouseUp={() => { armed.current = null; }}
          onDragStart={(e) => dragStart(e, name)}
          onDragOver={(e) => over(e, name)}
          onDrop={drop}
          onDragEnd={reset}
        >
          <button type="button" className="folder-grip" aria-label={`Drag to move ${labels?.[names.indexOf(name)] ?? name}`} title="Drag to reorder" onMouseDown={() => { armed.current = name; }} onMouseUp={() => { armed.current = null; }} onPointerDown={(e) => touchDown(e, name)} onPointerMove={(e) => touchMove(e, name)} onPointerUp={touchUp} onPointerCancel={(e) => e.pointerType !== "mouse" && reset()}>⠿</button>
          {byName.get(name)}
        </div>
      ))}
    </>
  );
}
