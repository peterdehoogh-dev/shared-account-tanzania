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

    alert("Vul je e-mailadres en wachtwoord in.");

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
      "Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord."
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
// WATCH LOGIN STATUS
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

  }

});


// --------------------------------------------------
// REALTIME FIRESTORE LISTENER
// --------------------------------------------------

let unsubscribeTransactions = null;


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

            amount: Number(data.amount)

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
          "De transacties konden niet worden geladen."
        );

      }

    );

}


// --------------------------------------------------
// SHOW / HIDE NEW TRANSACTION FORM
// --------------------------------------------------

window.toggleForm = function () {

  const form =
    document.getElementById("transactionForm");


  if (!form) {

    return;

  }


  if (form.style.display === "block") {

    form.style.display = "none";

  } else {

    form.style.display = "block";

  }

};


// --------------------------------------------------
// ADD TRANSACTION
// --------------------------------------------------

window.addTransaction = async function () {

  const user =
    auth.currentUser;


  if (!user) {

    alert("Log eerst in.");

    return;

  }


  const date =
    document.getElementById("date").value;

  const description =
    document
      .getElementById("description")
      .value
      .trim();

  const type =
    document.getElementById("type").value;

  const amount =
    Number(
      document.getElementById("amount").value
    );


  if (
    !date ||
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert("Vul alle gegevens correct in.");

    return;

  }


  const signedAmount =
    type === "income"
      ? Math.abs(amount)
      : -Math.abs(amount);


  try {

    await addDoc(
      transactionsCollection,
      {

        date: date,

        description: description,

        amount: signedAmount,

        createdAt: serverTimestamp(),

        createdBy: user.uid

      }
    );


    document.getElementById(
      "description"
    ).value = "";


    document.getElementById(
      "amount"
    ).value = "";


    document.getElementById(
      "transactionForm"
    ).style.display = "none";


  } catch (error) {

    console.error(
      "Transaction could not be saved:",
      error
    );


    alert(
      "De transactie kon niet worden opgeslagen."
    );

  }

};


// --------------------------------------------------
// DISPLAY TRANSACTIONS
// --------------------------------------------------

function render() {

  const table =
    document.getElementById("transactionTable");

  const balanceElement =
    document.getElementById("currentBalance");


  if (!table || !balanceElement) {

    return;

  }


  table.innerHTML = "";


  let balance = 0;

  const calculated = [];


  transactions.forEach((transaction) => {

    balance += transaction.amount;


    calculated.push({

      ...transaction,

      balance: balance

    });

  });


  balanceElement.textContent =
    balance < 0
      ? "- " + formatTSh(balance)
      : formatTSh(balance);


  balanceElement.style.color =
    balance >= 0
      ? "#159447"
      : "#dc2626";


  calculated
    .slice()
    .reverse()
    .forEach((transaction) => {

      const row =
        document.createElement("tr");


      const dateParts =
        transaction.date.split("-");


      const displayDate =
        dateParts.length === 3
          ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
          : transaction.date;


      const amountClass =
        transaction.amount >= 0
          ? "income"
          : "expense";


      const balanceClass =
        transaction.balance >= 0
          ? "positive"
          : "negative";


      const sign =
        transaction.amount >= 0
          ? "+"
          : "-";


      row.innerHTML = `

        <td>${displayDate}</td>

        <td>${escapeHtml(
          transaction.description
        )}</td>

        <td class="${amountClass}">
          ${sign} ${formatTSh(
            transaction.amount
          )}
        </td>

        <td class="${balanceClass}">
          ${
            transaction.balance < 0
              ? "-"
              : ""
          }
          ${formatTSh(
            transaction.balance
          )}
        </td>

      `;


      table.appendChild(row);

    });

}


// --------------------------------------------------
// SECURITY: ESCAPE USER TEXT
// --------------------------------------------------

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}


// --------------------------------------------------
// SET TODAY AS DEFAULT DATE
// --------------------------------------------------

const dateInput =
  document.getElementById("date");


if (dateInput) {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  dateInput.value = today;

}
