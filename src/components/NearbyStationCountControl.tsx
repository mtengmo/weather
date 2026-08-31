import type { NearbyStationCount } from "../models/types";

interface NearbyStationCountControlProps {
  count: NearbyStationCount;
  onChange: (count: NearbyStationCount) => void;
}

const OPTIONS: NearbyStationCount[] = [0, 1, 2, 3, 4];

export default function NearbyStationCountControl({
  count,
  onChange,
}: NearbyStationCountControlProps) {
  return (
    <label className="nearby-station-count">
      Nearby stations{" "}
      <select
        value={count}
        onChange={(e) => onChange(Number(e.target.value) as NearbyStationCount)}
      >
        {OPTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}
