import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const query = await db.collection('app_users').where('email', '==', 'it.taunggyipharmacy@gmail.com').get();
  query.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
check();
