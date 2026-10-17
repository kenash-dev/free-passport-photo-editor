import { COUNTRIES } from '../data/countries';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function CountrySelect({ value, onChange }: Props) {
  return (
    <label className="field">
      <span className="field-label">Country / document</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Select a country…
        </option>
        {COUNTRIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.document === 'passport' ? ' passport' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
