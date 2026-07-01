import type { SanitizedSource } from "../api";

type SourcePickerProps = {
  label: string;
  sources: SanitizedSource[];
  value: string;
  onChange: (sourceId: string) => void;
};

export function SourcePicker({
  label,
  sources,
  value,
  onChange,
}: SourcePickerProps) {
  return (
    <label className="source-picker">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={sources.length === 0}
      >
        {sources.length === 0 ? <option value="">No sources loaded</option> : null}
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </label>
  );
}
