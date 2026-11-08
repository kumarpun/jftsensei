"use client";

export default function DeleteFolderForm({ action, category, folder, count }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete folder "${folder}"? Its ${count} set(s) stay in ${category}, outside any folder.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="folder" value={folder} />
      <button className="sm danger">Delete folder</button>
    </form>
  );
}
