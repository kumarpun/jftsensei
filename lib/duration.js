export function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} sec`;
  return r ? `${m} min ${r} sec` : `${m} min`;
}

// Reads `<name>_min` and `<name>_sec` form fields into total seconds (minimum 10).
export function parseDuration(formData, name = "duration") {
  const m = Math.max(0, Math.floor(Number(formData.get(`${name}_min`)) || 0));
  const s = Math.max(0, Math.floor(Number(formData.get(`${name}_sec`)) || 0));
  return Math.max(10, m * 60 + s || 30 * 60);
}
