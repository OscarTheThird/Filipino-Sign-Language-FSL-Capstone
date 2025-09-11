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

// Show welcome popup after successful login
function showWelcomePopup(user) {
  // Remove old modal if it exists
  let oldModal = document.getElementById('welcomeModal');
  if (oldModal) oldModal.remove();

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'welcomeModal';
  modal.style.position = 'fixed';
  modal.style.left = 0;
  modal.style.top = 0;
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0,0,0,0.35)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = 99999;

  // Modal box
  const box = document.createElement('div');
  box.style.backgroundColor = '#fff';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.17)';
  box.style.padding = '32px 28px 24px 28px';
  box.style.maxWidth = '350px';
  box.style.textAlign = 'center';
  box.style.position = 'relative';

  // Get user's name if available
  const displayName = user.displayName || user.email || "User";

  box.innerHTML = `
    <h2 style="font-size: 1.3rem; margin-bottom: 10px;">Welcome!</h2>
    <p style="color:#444; margin-bottom: 24px;">Hello, <b>${displayName}</b> 👋<br>You're now logged in.</p>
    <button id="welcomeOkBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#2563eb; color:#fff; font-weight:600; font-size:1rem; cursor:pointer;">OK</button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('welcomeOkBtn').onclick = () => {
    document.body.removeChild(modal);
  };

  // Also close on escape key or click outside box
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  document.addEventListener('keydown', function escListener(e) {
    if (e.key === "Escape") {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      document.removeEventListener('keydown', escListener);
    }
  });
}

async function handleLogin(email, password) {
  const loginBtn = document.querySelector(".login-btn");
  showLoading(loginBtn, "Signing In...");
  hideLoginError();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    window.closeLoginModal();
    showWelcomePopup(userCredential.user);
    if (window.intendedRoute) {
      setTimeout(() => {
        window.location.href = window.intendedRoute;
        window.intendedRoute = null;
      }, 600); // Give a moment for popup to appear
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