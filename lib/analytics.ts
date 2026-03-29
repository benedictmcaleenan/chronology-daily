import { logEvent } from "firebase/analytics";
import { analyticsReady } from "./firebase";

export function trackEvent(
  name: string,
  params?: Record<string, string | number>
) {
  analyticsReady.then((a) => {
    if (a) {
      logEvent(a, name, params);
      console.log("[Analytics]", name, params);
    }
  });
}
