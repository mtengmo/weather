import { useCallback, useState } from "react";
import { getHomeViewPreference, setHomeViewPreference, type HomeViewPreference } from "../services/homeView";

/** The last chosen of Overview / Kustväder, restored on the next app start. */
export function useHomeViewPreference() {
  const [homeView, setHomeViewState] = useState<HomeViewPreference>(() => getHomeViewPreference());
  const setHomeView = useCallback((next: HomeViewPreference) => {
    setHomeViewPreference(next);
    setHomeViewState(next);
  }, []);
  return { homeView, setHomeView };
}
