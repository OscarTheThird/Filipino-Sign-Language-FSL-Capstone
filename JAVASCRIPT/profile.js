import { auth } from "./firebase.js";

// -- Helper to update nav bar for login/profile/logout buttons --
function updateNavAuthButtons() {
  const loginBtn = document.querySelector(".login-nav-btn");
  const registerBtn = document.querySelector(".register-nav-btn");
  const profileMenu = document.querySelector(".profile-menu-container");
  const profileIconImg = document.querySelector(".profile-icon-img");
  if (auth.currentUser) {
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    profileMenu.style.display = "flex";
    // Set user photo if available, else fallback
    if (auth.currentUser.photoURL) {
      profileIconImg.src = auth.currentUser.photoURL;
    } else {
      profileIconImg.src = "/PICTURES/Home/profile.png";
    }
  } else {
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    profileMenu.style.display = "none";
    // Reset profile image
    profileIconImg.src = "/PICTURES/Home/profile.png";
  }
}

// -- Redirect to home if not logged in --
function requireAuthOrRedirect() {
  if (!auth.currentUser) {
    window.location.href = "home.html";
  }
}

// -- Populate profile data --
function renderProfile() {
  const user = auth.currentUser;
  if (!user) return;
  document.getElementById("profilePic").src = user.photoURL || "/PICTURES/Home/profile.png";
  document.getElementById("profileName").textContent = user.displayName || "User";
  document.getElementById("profileEmail").textContent = user.email || "";
  document.getElementById("editName").value = user.displayName || "";
  document.getElementById("editPhoto").value = user.photoURL || "";
}

// -- Edit profile logic --
function setupEditProfile() {
  const editBtn = document.getElementById("editProfileBtn");
  const editSection = document.getElementById("profileEditSection");
  const saveBtn = document.getElementById("saveProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const msg = document.getElementById("profileEditMsg");

  editBtn.onclick = () => {
    editBtn.style.display = "none";
    editSection.style.display = "flex";
    msg.textContent = "";
    document.getElementById("editName").value = auth.currentUser.displayName || "";
    document.getElementById("editPhoto").value = auth.currentUser.photoURL || "";
  };
  cancelBtn.onclick = () => {
    editSection.style.display = "none";
    editBtn.style.display = "inline-block";
    msg.textContent = "";
  };
  saveBtn.onclick = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    msg.textContent = "";
    const newName = document.getElementById("editName").value.trim();
    const newPhoto = document.getElementById("editPhoto").value.trim();
    try {
      await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js").then(({ updateProfile }) =>
        updateProfile(auth.currentUser, {
          displayName: newName || null,
          photoURL: newPhoto || null
        })
      );
      msg.textContent = "Profile updated! Reloading...";
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      msg.textContent = "Error updating profile.";
    }
    saveBtn.disabled = false;
  };
}

// -- Logout handler for dropdown --
function handleLogout() {
  import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
    .then(({ signOut }) => signOut(auth))
    .then(() => window.location.href = "home.html")
    .catch((error) => {
      alert("Error signing out. Please try again.");
    });
}

// -- Setup dropdown and nav logic (copied from home.js) --
function setupProfileDropdown() {
  const profileMenu = document.querySelector(".profile-menu-container");
  const profileBtn = document.getElementById("profileIconBtn");
  // Open/close menu
  profileBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = profileMenu.classList.contains("open");
    document.querySelectorAll('.profile-menu-container.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) {
      profileMenu.classList.add("open");
      profileBtn.setAttribute("aria-expanded", "true");
    } else {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Close menu on outside click
  document.addEventListener("click", function (e) {
    if (!profileMenu.contains(e.target)) {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Keyboard accessibility
  profileBtn.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Tab") {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Menu actions
  document.getElementById("menuLogout").onclick = (e) => {
    e.preventDefault();
    profileMenu.classList.remove("open");
    handleLogout();
  };
}

// -- Shared UI initialization --
document.addEventListener("DOMContentLoaded", function () {
  import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, (user) => {
        updateNavAuthButtons();
        if (!user) {
          requireAuthOrRedirect();
        } else {
          renderProfile();
        }
      });
    });
  setupEditProfile();
  setupProfileDropdown();

  // Nav links: block if not logged in
  document.querySelectorAll(".nav-link").forEach(function (link) {
    if (link.getAttribute("data-route") === "home") return;
    link.addEventListener("click", function (e) {
      if (!auth.currentUser) {
        e.preventDefault();
        openLoginModal();
        window.intendedRoute = link.getAttribute("href");
      }
    });
  });
});