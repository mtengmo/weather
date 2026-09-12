import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <label className="nearby-station-count">
      {t("nearbyStationCount.label")}{" "}
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
