import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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

// Show email not verified popup
function showEmailNotVerifiedPopup(email) {
  const modal = document.createElement('div');
  modal.id = 'emailNotVerifiedModal';
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

  const box = document.createElement('div');
  box.style.backgroundColor = '#fff';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.17)';
  box.style.padding = '32px 28px 24px 28px';
  box.style.maxWidth = '400px';
  box.style.textAlign = 'center';

  box.innerHTML = `
    <div style="margin-bottom: 16px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h2 style="font-size: 1.4rem; margin-bottom: 12px; color: #1f2937;">Email Not Verified</h2>
    <p style="color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
      Please verify your email address before logging in to GestSure.
    </p>
    <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 24px;">
      Check your inbox at <strong>${email}</strong> for the verification link.
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button id="closeVerificationBtn" style="padding: 10px 24px; border: none; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer;">
        OK
      </button>
    </div>
    <p style="color: #6b7280; font-size: 0.85rem; margin-top: 12px;">
      Didn't receive the email? Check your spam folder or contact support.
    </p>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('closeVerificationBtn').onclick = () => {
    document.body.removeChild(modal);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// Show welcome popup after successful login
function showWelcomePopup(user) {
  let oldModal = document.getElementById('welcomeModal');
  if (oldModal) oldModal.remove();

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

  const box = document.createElement('div');
  box.style.backgroundColor = '#fff';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.17)';
  box.style.padding = '32px 28px 24px 28px';
  box.style.maxWidth = '350px';
  box.style.textAlign = 'center';

  const displayName = user.displayName || user.email || "User";

  box.innerHTML = `
    <h2 style="font-size: 1.3rem; margin-bottom: 10px;">Welcome Back!</h2>
    <p style="color:#444; margin-bottom: 24px;">Hello, <b>${displayName}</b> 👋<br>Ready to translate FSL signs?</p>
    <button id="welcomeOkBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#2563eb; color:#fff; font-weight:600; font-size:1rem; cursor:pointer;">Let's Go!</button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('welcomeOkBtn').onclick = () => {
    document.body.removeChild(modal);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

async function handleLogin(email, password) {
  const loginBtn = document.querySelector(".login-btn");
  showLoading(loginBtn, "Signing In...");
  hideLoginError();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check Firestore for email verification status
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await auth.signOut();
      showLoginError("User data not found. Please contact support.");
      return;
    }

    const userData = userDoc.data();

    // Check if email is verified in Firestore
    if (!userData.emailVerified) {
      // Sign out the user
      await auth.signOut();
      
      // Show email not verified popup
      showEmailNotVerifiedPopup(user.email);
      return;
    }

    // Email is verified - allow login
    window.closeLoginModal();
    showWelcomePopup(user);
    
    if (window.intendedRoute) {
      setTimeout(() => {
        window.location.href = window.intendedRoute;
        window.intendedRoute = null;
      }, 600);
    }
  } catch (error) {
    let errorMessage = "Login failed. Please try again.";
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email address."; 
        break;
      case "auth/wrong-password":
      case "auth/invalid-credential":
        errorMessage = "Incorrect password. Please try again."; 
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."; 
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later."; 
        break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled. Please contact support."; 
        break;
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