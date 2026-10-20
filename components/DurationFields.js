export default function DurationFields({ seconds = 30 * 60, name = "duration" }) {
  return (
    <label style={{ width: 130 }}>Minutes
      <input name={`${name}_min`} type="number" min="1" required defaultValue={Math.max(1, Math.ceil(seconds / 60))} />
    </label>
  );
}
