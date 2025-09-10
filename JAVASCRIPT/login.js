import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Show/hide error for login
function showLoginError(message) {
  let errorDiv = document.getElementById("login-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "login-error";
    errorDiv.style.color = "#e11d48";
    errorDiv.style.marginBottom = "8px";
    errorDiv.style.fontSize = "14px";
    const form = document.getElementById("loginForm");
    const submitButton = form.querySelector(".login-btn");
    form.insertBefore(errorDiv, submitButton);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}
function hideLoginError() {
  const errorDiv = document.getElementById("login-error");
  if (errorDiv) errorDiv.style.display = "none";
}
function showLoading(button, text = "Loading...") {
  button.disabled = true; button.textContent = text;
}
function hideLoading(button, text) {
  button.disabled = false; button.textContent = text;
}

async function handleLogin(email, password) {
  const loginBtn = document.querySelector(".login-btn");
  showLoading(loginBtn, "Signing In...");
  hideLoginError();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.closeLoginModal();
    if (window.intendedRoute) {
      window.location.href = window.intendedRoute;
      window.intendedRoute = null;
    }
  } catch (error) {
    let errorMessage = "Login failed. Please try again.";
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email address."; break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again."; break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."; break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later."; break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled. Please contact support."; break;
    }
    showLoginError(errorMessage);
  } finally {
    hideLoading(loginBtn, "LOGIN");
  }
}

// Attach login listener
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    handleLogin(email, password);
  });
});