"use client";

export default function DeleteCategoryForm({ action, category, count }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete category "${category}" and all ${count} set(s) in it, with their questions and results? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="category" value={category} />
      <button className="sm danger">Delete category</button>
    </form>
  );
}
