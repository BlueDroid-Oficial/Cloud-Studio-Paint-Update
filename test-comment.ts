import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  await signInWithEmailAndPassword(auth, "belepuff@gmail.com", "password"); // Wait, I don't know the password.
}
run();
