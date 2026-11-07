import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// --------------------------------------------------
// FIREBASE CONFIGURATION
// --------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDIC-aGnc4P4fbPvnq0huq_2s1qL1kZqpQ",
  authDomain: "shared-account-tanzania.firebaseapp.com",
  projectId: "shared-account-tanzania",
  storageBucket: "shared-account-tanzania.firebasestorage.app",
  messagingSenderId: "482401772699",
  appId: "1:482401772699:web:cd7ebf2e7ee41aefe6923e"
};


// --------------------------------------------------
// START FIREBASE
// --------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const transactionsCollection =
  collection(db, "transactions");


// --------------------------------------------------
// VARIABLES
// --------------------------------------------------

let transactions = [];
let unsubscribeTransactions = null;
let editingTransactionId = null;


// --------------------------------------------------
// FORMAT TANZANIAN SHILLINGS
// --------------------------------------------------

function formatTSh(amount) {
  return "TSh " +
    Math.abs(amount).toLocaleString("en-US");
}


// --------------------------------------------------
// LOGIN
// --------------------------------------------------

window.login = async function () {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  if (!email || !password) {

    alert(
      "Please enter your email address and password."
    );

    return;
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (error) {

    console.error("Login error:", error);

    alert(
      "Login failed. Please check your email address and password."
    );
  }
};


// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

window.logout = async function () {

  try {

    await signOut(auth);

  } catch (error) {

    console.error("Logout error:", error);
  }
};


// --------------------------------------------------
// AUTHENTICATION STATUS
// --------------------------------------------------

onAuthStateChanged(auth, (user) => {

  const loginSection =
    document.getElementById("loginSection");

  const appSection =
    document.getElementById("appSection");

  if (!loginSection || !appSection) {
    return;
  }

  if (user) {

    loginSection.style.display = "none";
    appSection.style.display = "block";

    startTransactionListener();

  } else {

    loginSection.style.display = "block";
    appSection.style.display = "none";

    transactions = [];

    if (unsubscribeTransactions) {
      unsubscribeTransactions();
      unsubscribeTransactions = null;
    }
  }
});


// --------------------------------------------------
// REALTIME FIRESTORE LISTENER
// --------------------------------------------------

function startTransactionListener() {

  if (unsubscribeTransactions) {
    unsubscribeTransactions();
  }

  const transactionQuery =
    query(
      transactionsCollection,
      orderBy("date", "asc")
    );

  unsubscribeTransactions =
    onSnapshot(

      transactionQuery,

      (snapshot) => {

        transactions = [];

        snapshot.forEach((documentSnapshot) => {

          const data =
            documentSnapshot.data();

          transactions.push({

            id: documentSnapshot.id,
            date: data.date,
            description: data.description,
            amount: Number(data.amount),
            createdAt: data.createdAt || null

          });
        });

        render();
      },

      (error) => {

        console.error(
          "Could not load transactions:",
          error
        );

        alert(
          "The transactions could not be loaded."
        );
      }
    );
}


// --------------------------------------------------
// OPEN / CLOSE TRANSACTION FORM
// ---------
