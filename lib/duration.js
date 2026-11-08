export function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} sec`;
  return r ? `${m} min ${r} sec` : `${m} min`;
}

// Reads the `<name>_min` form field into total seconds (minimum 1 minute).
// With `optional`, a blank field means no time limit (0).
export function parseDuration(formData, name = "duration", optional = false) {
  if (optional && String(formData.get(`${name}_min`) ?? "").trim() === "") return 0;
  const m = Math.max(1, Math.floor(Number(formData.get(`${name}_min`)) || 30));
  return m * 60;
}
