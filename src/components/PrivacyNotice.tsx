import { useTranslation } from "react-i18next";

interface PrivacyNoticeProps {
  onClose: () => void;
}

export default function PrivacyNotice({ onClose }: PrivacyNoticeProps) {
  const { t } = useTranslation();
  return (
    <div className="privacy-notice" role="dialog" aria-label={t("privacyNotice.ariaLabel")}>
      <button type="button" className="privacy-notice-close" aria-label={t("privacyNotice.close")} onClick={onClose}>
        ×
      </button>
      <h2>{t("footer.privacy")}</h2>
      <p>{t("privacyNotice.storage")}</p>
      <p>{t("privacyNotice.dataSources")}</p>
      <p>{t("privacyNotice.analytics")}</p>
    </div>
  );
}
