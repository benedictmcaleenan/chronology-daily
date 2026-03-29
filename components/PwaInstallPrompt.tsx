"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
      trackEvent("pwa_prompt_shown");
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    trackEvent(
      outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed"
    );
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    trackEvent("pwa_install_dismissed");
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#2C2C2A] px-4 py-3 flex items-center justify-between gap-3 z-50 shadow-lg">
      <p className="text-[13px] text-[#F1EFE8] leading-snug">
        Add Chronology Daily to your home screen
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="text-[12px] text-[#B4B2A9] hover:text-[#F1EFE8] transition-colors px-2 py-1.5"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="text-[12px] font-medium text-[#2C2C2A] bg-[#F1EFE8] hover:bg-white rounded-[6px] px-3 py-1.5 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
