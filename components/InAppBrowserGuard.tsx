"use client";

import { useEffect, useState } from "react";
import {
  getInAppBrowserName,
  isAndroid,
  isIOS,
  getExternalBrowserUrl,
} from "@/lib/inAppBrowser";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ExternalLink, X } from "lucide-react";

export function InAppBrowserGuard() {
  const [browserName, setBrowserName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setBrowserName(getInAppBrowserName());
  }, []);

  if (!browserName || dismissed) return null;

  const handleOpenExternal = () => {
    const intentUrl = getExternalBrowserUrl();
    if (intentUrl) {
      window.location.href = intentUrl;
    }
  };

  const android = isAndroid();
  const ios = isIOS();

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 px-4 py-3 shadow-sm">
      <div className="mx-auto max-w-2xl flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ExternalLink className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t("inAppBrowser.title")}
              </p>
              <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                {t("inAppBrowser.detected", { browser: browserName })}{" "}
                {t("inAppBrowser.googleBlocked")}
              </p>
              {ios && (
                <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                  {t("inAppBrowser.iosGuide")}
                </p>
              )}
              {!android && !ios && (
                <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                  {t("inAppBrowser.fallback")}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {android && (
          <button
            onClick={handleOpenExternal}
            className="self-start ml-7.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            {t("inAppBrowser.androidAction")}
          </button>
        )}
      </div>
    </div>
  );
}
