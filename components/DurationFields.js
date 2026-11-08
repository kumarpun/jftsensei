export default function DurationFields({ seconds = 30 * 60, name = "duration", optional = false }) {
  const mins = seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : "";
  return (
    <label style={{ width: 130 }}>Minutes
      <input name={`${name}_min`} type="number" min="1" required={!optional} placeholder={optional ? "No limit" : undefined} defaultValue={optional ? mins : mins || 1} />
    </label>
  );
}
