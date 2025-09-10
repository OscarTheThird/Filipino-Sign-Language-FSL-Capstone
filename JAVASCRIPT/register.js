import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Show/hide error for register
function showRegisterError(message) {
  let errorDiv = document.getElementById("register-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "register-error";
    errorDiv.style.color = "#e11d48";
    errorDiv.style.marginBottom = "8px";
    errorDiv.style.fontSize = "14px";
    const form = document.getElementById("registerForm");
    const submitButton = form.querySelector(".register-btn");
    form.insertBefore(errorDiv, submitButton);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}
function hideRegisterError() {
  const errorDiv = document.getElementById("register-error");
  if (errorDiv) errorDiv.style.display = "none";
}
function showLoading(button, text = "Loading...") {
  button.disabled = true; button.textContent = text;
}
function hideLoading(button, text) {
  button.disabled = false; button.textContent = text;
}

async function handleRegister(formData) {
  const registerBtn = document.querySelector(".register-btn");
  showLoading(registerBtn, "Creating Account...");
  hideRegisterError();
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, formData.email, formData.password
    );
    // Save only name, email, createdAt (as Firestore timestamp)
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: formData.name,
      email: formData.email,
      createdAt: serverTimestamp(),
    });
    window.closeRegisterModal();
    alert("Registration successful! Welcome to GestSure!");
  } catch (error) {
    let errorMessage = "Registration failed. Please try again.";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "Email is already registered. Please use a different email."; break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."; break;
      case "auth/weak-password":
        errorMessage = "Password should be at least 6 characters long."; break;
      case "auth/operation-not-allowed":
        errorMessage = "Email/password accounts are not enabled. Please contact support."; break;
    }
    showRegisterError(errorMessage);
  } finally {
    hideLoading(registerBtn, "REGISTER");
  }
}

// Attach register listener
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const formInputs = e.target.querySelectorAll(".form-input");
    // Only expect: name, email, password, confirmPassword
    const formData = {
      name: formInputs[0].value.trim(),
      email: formInputs[1].value.trim(),
      password: formInputs[2].value,
      confirmPassword: formInputs[3].value,
    };
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      showRegisterError("Passwords do not match!");
      return;
    }
    // Validate password length
    if (formData.password.length < 6) {
      showRegisterError("Password must be at least 6 characters long.");
      return;
    }
    // Validate required fields
    if (
      !formData.name ||
      !formData.email
    ) {
      showRegisterError("Please fill in all required fields.");
      return;
    }
    // Validate length (max 100 chars)
    if (formData.name.length > 100) {
      showRegisterError("Name must not exceed 100 characters.");
      return;
    }
    if (formData.email.length > 100) {
      showRegisterError("Email must not exceed 100 characters.");
      return;
    }
    // Basic email regex for client-side validation
    if (!formData.email.match(/.+@.+\..+/)) {
      showRegisterError("Please enter a valid email address.");
      return;
    }
    handleRegister(formData);
  });
});