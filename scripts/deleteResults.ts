import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DATE = process.argv[2] ?? "2026-03-18";

async function main() {
  const snap = await db.collection("results").where("puzzleDate", "==", DATE).get();
  if (snap.empty) {
    console.log(`No result documents for ${DATE}.`);
    process.exit(0);
  }
  const batch = db.batch();
  snap.forEach(doc => {
    console.log(`  Deleting ${doc.id}`);
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${snap.size} result document(s) for ${DATE}.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
