import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log("[Firebase] measurementId:", firebaseConfig.measurementId ?? "MISSING");

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics — initialise eagerly on the client, export the promise
export const analyticsReady: Promise<Analytics | null> =
  typeof window !== "undefined"
    ? isSupported().then((supported) => {
        if (supported) {
          const a = getAnalytics(app);
          console.log("[Firebase] Analytics initialised", a);
          return a;
        }
        console.warn("[Firebase] Analytics not supported in this environment");
        return null;
      }).catch((err) => {
        console.error("[Firebase] Analytics init failed:", err);
        return null;
      })
    : Promise.resolve(null);

/**
 * Ensures the current session has an anonymous Firebase user.
 * Resolves with the uid — reuses any persisted session without re-signing in.
 */
export function ensureAnonymousAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user.uid))
          .catch(reject);
      }
    });
  });
}
