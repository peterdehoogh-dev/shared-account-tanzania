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
// INITIALIZE FIREBASE
// --------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const transactionsCollection =
  collection(db, "transactions");


// --------------------------------------------------
// APP VARIABLES
// --------------------------------------------------

let transactions = [];
let unsubscribeTransactions = null;
let editingTransactionId = null;


// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function formatTSh(amount) {
  return "TSh " +
    Math.abs(amount).toLocaleString("en-US");
}


function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}


function setTodayAsDefault() {
  const dateInput =
    document.getElementById("date");

  if (dateInput) {
    dateInput.value =
      new Date().toISOString().split("T")[0];
  }
}


// --------------------------------------------------
// RENDER TRANSACTIONS
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
  const calculatedTransactions = [];

  transactions.forEach((transaction) => {
    balance += transaction.amount;

    calculatedTransactions.push({
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

  calculatedTransactions
    .slice()
    .reverse()
    .forEach((transaction) => {
      const row =
        document.createElement("tr");

      const dateParts =
        String(transaction.date).split("-");

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

      const amountSign =
        transaction.amount >= 0
          ? "+"
          : "-";

      const balanceSign =
        transaction.balance < 0
          ? "-"
          : "";

      row.innerHTML = `
        <td>${displayDate}</td>

        <td>
          ${escapeHtml(transaction.description)}
        </td>

        <td class="${amountClass}">
          ${amountSign} ${formatTSh(transaction.amount)}
        </td>

        <td class="${balanceClass}">
          ${balanceSign}${formatTSh(transaction.balance)}
        </td>

        <td class="actions-cell">
          <button
            type="button"
            class="edit-button"
            onclick="editTransaction('${transaction.id}')"
          >
            Edit
          </button>

          <button
            type="button"
            class="delete-button"
            onclick="deleteTransaction('${transaction.id}')"
          >
            Delete
          </button>
        </td>
      `;

      table.appendChild(row);
    });
}


// --------------------------------------------------
// LOGIN
// --------------------------------------------------

window.login = async function () {
  const emailElement =
    document.getElementById("loginEmail");

  const passwordElement =
    document.getElementById("loginPassword");

  if (!emailElement || !passwordElement) {
    alert("The login form could not be found.");
    return;
  }

  const email =
    emailElement.value.trim();

  const password =
    passwordElement.value;

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

    alert("Log out failed. Please try again.");
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
    editingTransactionId = null;

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
            date: data.date || "",
            description: data.description || "",
            amount: Number(data.amount) || 0,
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
// OPEN NEW TRANSACTION FORM
// --------------------------------------------------

function startNewTransaction() {
  editingTransactionId = null;

  const form =
    document.getElementById("transactionForm");

  const title =
    document.getElementById("formTitle");

  const saveButton =
    document.getElementById(
      "saveTransactionButton"
    );

  const description =
    document.getElementById("description");

  const amount =
    document.getElementById("amount");

  const type =
    document.getElementById("type");

  if (
    !form ||
    !description ||
    !amount ||
    !type
  ) {
    alert(
      "The transaction form could not be found."
    );

    return;
  }

  if (title) {
    title.textContent = "New Transaction";
  }

  if (saveButton) {
    saveButton.textContent = "Save";
  }

  description.value = "";
  amount.value = "";
  type.value = "income";

  setTodayAsDefault();

  form.style.display = "block";

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function closeTransactionForm() {
  editingTransactionId = null;

  const form =
    document.getElementById("transactionForm");

  if (form) {
    form.style.display = "none";
  }
}


window.toggleForm = function () {
  const form =
    document.getElementById("transactionForm");

  if (!form) {
    alert(
      "The transaction form could not be found."
    );

    return;
  }

  if (form.style.display === "block") {
    closeTransactionForm();
  } else {
    startNewTransaction();
  }
};


window.cancelTransaction = function () {
  closeTransactionForm();
};


// --------------------------------------------------
// ADD OR UPDATE TRANSACTION
// --------------------------------------------------

window.addTransaction = async function () {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in first.");
    return;
  }

  const dateElement =
    document.getElementById("date");

  const descriptionElement =
    document.getElementById("description");

  const typeElement =
    document.getElementById("type");

  const amountElement =
    document.getElementById("amount");

  if (
    !dateElement ||
    !descriptionElement ||
    !typeElement ||
    !amountElement
  ) {
    alert(
      "The transaction form could not be found."
    );

    return;
  }

  const date =
    dateElement.value;

  const description =
    descriptionElement.value.trim();

  const type =
    typeElement.value;

  const amount =
    Number(amountElement.value);

  if (
    !date ||
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    alert(
      "Please enter all transaction details correctly."
    );

    return;
  }

  const signedAmount =
    type === "income"
      ? Math.abs(amount)
      : -Math.abs(amount);

  try {
    if (editingTransactionId) {
      const transactionReference =
        doc(
          db,
          "transactions",
          editingTransactionId
        );

      await updateDoc(
        transactionReference,
        {
          date: date,
          description: description,
          amount: signedAmount,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        }
      );
    } else {
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
    }

    closeTransactionForm();
  } catch (error) {
    console.error(
      "Transaction could not be saved:",
      error
    );

    alert(
      "The transaction could not be saved."
    );
  }
};


// --------------------------------------------------
// EDIT TRANSACTION
// --------------------------------------------------

window.editTransaction = function (transactionId) {
  const transaction =
    transactions.find(
      (item) => item.id === transactionId
    );

  if (!transaction) {
    alert("Transaction not found.");
    return;
  }

  const form =
    document.getElementById("transactionForm");

  const title =
    document.getElementById("formTitle");

  const saveButton =
    document.getElementById(
      "saveTransactionButton"
    );

  const dateElement =
    document.getElementById("date");

  const descriptionElement =
    document.getElementById("description");

  const amountElement =
    document.getElementById("amount");

  const typeElement =
    document.getElementById("type");

  if (
    !form ||
    !dateElement ||
    !descriptionElement ||
    !amountElement ||
    !typeElement
  ) {
    alert(
      "The transaction form could not be found."
    );

    return;
  }

  editingTransactionId =
    transactionId;

  if (title) {
    title.textContent =
      "Edit Transaction";
  }

  if (saveButton) {
    saveButton.textContent =
      "Save Changes";
  }

  dateElement.value =
    transaction.date;

  descriptionElement.value =
    transaction.description;

  amountElement.value =
    Math.abs(transaction.amount);

  typeElement.value =
    transaction.amount >= 0
      ? "income"
      : "expense";

  form.style.display = "block";

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};


// --------------------------------------------------
// DELETE TRANSACTION
// --------------------------------------------------

window.deleteTransaction = async function (
  transactionId
) {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in first.");
    return;
  }

  const transaction =
    transactions.find(
      (item) => item.id === transactionId
    );

  if (!transaction) {
    alert("Transaction not found.");
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${transaction.description}"?\n\n` +
      "This transaction will be permanently removed. " +
      "This cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(
      doc(
        db,
        "transactions",
        transactionId
      )
    );

    if (
      editingTransactionId === transactionId
    ) {
      closeTransactionForm();
    }
  } catch (error) {
    console.error(
      "Transaction could not be deleted:",
      error
    );

    alert(
      "The transaction could not be deleted."
    );
  }
};


// --------------------------------------------------
// INITIAL PAGE SETUP
// --------------------------------------------------

setTodayAsDefault();
