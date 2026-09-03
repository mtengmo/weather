interface CombineForecastToggleProps {
  combined: boolean;
  onChange: (combined: boolean) => void;
}

export default function CombineForecastToggle({ combined, onChange }: CombineForecastToggleProps) {
  return (
    <div className="combine-forecast-toggle" role="group" aria-label="Combine forecast sources">
      <button type="button" aria-pressed={combined} onClick={() => onChange(true)}>
        Combine forecast sources on
      </button>
      <button type="button" aria-pressed={!combined} onClick={() => onChange(false)}>
        Combine forecast sources off
      </button>
    </div>
  );
}
