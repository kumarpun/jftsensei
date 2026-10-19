export default function DurationFields({ seconds = 30 * 60, name = "duration" }) {
  return (
    <div className="row" style={{ alignItems: "flex-end" }}>
      <label style={{ width: 110 }}>Minutes
        <input name={`${name}_min`} type="number" min="0" defaultValue={Math.floor(seconds / 60)} />
      </label>
      <label style={{ width: 110 }}>Seconds
        <input name={`${name}_sec`} type="number" min="0" max="59" defaultValue={seconds % 60} />
      </label>
    </div>
  );
}
