import { useTranslation } from "react-i18next";

interface HowItWorksProps {
  onClose: () => void;
}

export default function HowItWorks({ onClose }: HowItWorksProps) {
  const { t } = useTranslation();
  return (
    <div className="privacy-notice" role="dialog" aria-label={t("footer.howThisWorks")}>
      <button type="button" className="privacy-notice-close" aria-label={t("howItWorks.close")} onClick={onClose}>
        ×
      </button>
      <h2>{t("footer.howThisWorks")}</h2>
      <p>{t("howItWorks.intro")}</p>
      <p>
        {t("howItWorks.windowsIntro")} <strong>{t("weatherOverview.windowLabel24h")}</strong>,{" "}
        <strong>{t("weatherOverview.windowLabel3d")}</strong>, {t("howItWorks.and")}{" "}
        <strong>{t("weatherOverview.windowLabel7d")}</strong> {t("howItWorks.windowsOutro")}
      </p>
      <p>
        {t("howItWorks.chartIntro")} <strong>{t("howItWorks.observedWord")}</strong>{" "}
        {t("howItWorks.chartMiddle")} <strong>{t("howItWorks.forecastWord")}</strong>
        {t("howItWorks.chartOutro")}
      </p>
      <p>{t("howItWorks.dataSources")}</p>
      <p>
        {t("howItWorks.uvPrefix")} <strong>UV</strong> {t("howItWorks.uvSuffix")}
      </p>
      <p>{t("howItWorks.warnings")}</p>
    </div>
  );
}
