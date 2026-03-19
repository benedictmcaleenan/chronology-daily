import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("results").get();
  if (snap.empty) { console.log("results collection is already empty."); process.exit(0); }

  // Firestore batch limit is 500
  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 500) chunks.push(docs.slice(i, i + 500));

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log(`Deleted ${snap.size} result document(s).`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
