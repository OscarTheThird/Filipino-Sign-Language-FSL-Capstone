import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// EmailJS is already initialized in home.html - no need to initialize again

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

// Generate verification token
function generateVerificationToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Show success message with email verification notice
function showVerificationMessage(email) {
  const modal = document.createElement('div');
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
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    <h2 style="font-size: 1.5rem; margin-bottom: 12px; color: #1f2937;">Registration Successful!</h2>
    <p style="color: #6b7280; margin-bottom: 16px; line-height: 1.5;">
      Welcome to <strong>GestSure</strong>! 🎉
    </p>
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: left;">
      <p style="color: #92400e; font-size: 0.9rem; margin: 0; line-height: 1.5;">
        <strong>⚠️ Important:</strong> Please check your email inbox at <strong>${email}</strong> and click the verification link to activate your account.
      </p>
    </div>
    <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 20px;">
      Don't see the email? Check your spam folder.
    </p>
    <button id="verificationOkBtn" style="padding: 10px 24px; border: none; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 600; font-size: 1rem; cursor: pointer; width: 100%;">
      OK
    </button>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('verificationOkBtn').onclick = () => {
    document.body.removeChild(modal);
  };
}

async function handleRegister(formData) {
  const registerBtn = document.querySelector(".register-btn");
  showLoading(registerBtn, "Creating Account...");
  hideRegisterError();
  
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(
      auth, formData.email, formData.password
    );
    
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: formData.name
    });

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Save user data to Firestore with verification token
    await setDoc(doc(db, "users", user.uid), {
      name: formData.name,
      email: formData.email,
      createdAt: serverTimestamp(),
      emailVerified: false, // Track verification status in Firestore
      verificationToken: verificationToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Create verification link
    const verificationLink = `${window.location.origin}/HTML/verify.html?token=${verificationToken}&uid=${user.uid}`;

    // Send custom verification email via EmailJS
    try {
      await emailjs.send(
        "service_p9c6no9",  // Your Service ID
        "template_eabclqh", // Your Template ID
        {
          email: formData.email,           // Changed from to_email to email
          to_name: formData.name,
          app_name: "GestSure",            // Added app_name
          verification_link: verificationLink
        }
      );
      console.log("Verification email sent successfully!");
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      showRegisterError("Account created, but failed to send verification email. Please contact support.");
      return;
    }

    // IMPORTANT: Sign out the user immediately after registration
    // This ensures they cannot access the app until email is verified
    await auth.signOut();

    // Reset the registration form
    document.getElementById("registerForm").reset();

    // Close register modal
    window.closeRegisterModal();

    // Show verification message
    showVerificationMessage(formData.email);

  } catch (error) {
    let errorMessage = "Registration failed. Please try again.";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "Email is already registered. Please use a different email."; 
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."; 
        break;
      case "auth/weak-password":
        errorMessage = "Password should be at least 6 characters long."; 
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Email/password accounts are not enabled. Please contact support."; 
        break;
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
    if (!formData.name || !formData.email) {
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