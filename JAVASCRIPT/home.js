// home.js - Full JS for home page with mobile nav shown as a profile-style dropdown (no animation).
// Desktop behavior unchanged.

import { auth } from "./firebase.js";

/* ----------------- Modal helpers and login/register UI ----------------- */

function openLoginModal() {
  const el = document.getElementById("loginModal");
  if (el) el.style.display = "block";
}
function closeLoginModal() {
  const el = document.getElementById("loginModal");
  if (el) el.style.display = "none";
}
function openRegisterModal() {
  const el = document.getElementById("registerModal");
  if (el) el.style.display = "block";
}
function closeRegisterModal() {
  const el = document.getElementById("registerModal");
  if (el) el.style.display = "none";
}
function switchToRegisterModal(e) {
  if (e) e.preventDefault();
  closeLoginModal();
  openRegisterModal();
}
function switchToLoginModal(e) {
  if (e) e.preventDefault();
  closeRegisterModal();
  openLoginModal();
}

/* Close modals when clicking outside */
window.onclick = function (event) {
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  if (event.target === loginModal) closeLoginModal();
  if (event.target === registerModal) closeRegisterModal();
};

/* ----------------- Password show/hide (eye icons) ----------------- */

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input || !btn) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
  } else {
    input.type = "password";
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
  }
}

/* Initialize eye icons in modal forms (set default icon and hide them initially) */
function initializeEyeIcons() {
  document.querySelectorAll(".show-hide-btn").forEach((btn) => {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
    btn.style.display = "none";
  });
}

/* Show/hide password toggle buttons based on input content */
function setupPasswordToggleListeners() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    const toggleBtn = input.parentElement.querySelector(".show-hide-btn");
    if (!toggleBtn) return;

    input.addEventListener("input", function () {
      if (this.value.length > 0) {
        toggleBtn.style.display = "block";
      } else {
        toggleBtn.style.display = "none";
        this.type = "password";
        toggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`;
      }
    });

    input.addEventListener("blur", function () {
      if (this.value.length === 0) {
        toggleBtn.style.display = "none";
        this.type = "password";
        toggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`;
      }
    });
  });
}

/* ----------------- Auth-based nav updates ----------------- */

function updateNavAuthButtons() {
  const loginBtn = document.querySelector(".login-nav-btn");
  const registerBtn = document.querySelector(".register-nav-btn");
  const profileMenus = document.querySelectorAll(".profile-menu-container");
  const profileIconImgs = document.querySelectorAll(".profile-icon-img");

  if (auth && auth.currentUser) {
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    profileMenus.forEach(menu => menu.style.display = "flex");
    const photoURL = auth.currentUser.photoURL || "../PICTURES/Home/profile.png";
    profileIconImgs.forEach(img => { if (img) img.src = photoURL; });
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    profileMenus.forEach(menu => menu.style.display = "none");
    profileIconImgs.forEach(img => { if (img) img.src = "../PICTURES/Home/profile.png"; });
  }
}

/* ----------------- Logout flow with confirmation ----------------- */

async function handleLogout() {
  if (!await showLogoutConfirmation()) {
    return;
  }
  try {
    await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
      .then(({ signOut }) => signOut(auth));
    window.location.href = "home.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Error signing out. Please try again.");
  }
}

function showLogoutConfirmation() {
  return new Promise((resolve) => {
    let oldModal = document.getElementById('logoutConfirmModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
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
    box.style.padding = '32px 28px 20px 28px';
    box.style.maxWidth = '350px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    box.innerHTML = `
      <h2 style="font-size: 1.25rem; margin: 0 0 12px;">Confirm Logout</h2>
      <p style="color:#444; margin-bottom: 24px;">Are you sure you want to log out of your account?</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="logoutYesBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#e11d48; color:#fff; font-weight:600; cursor:pointer;">Yes, Logout</button>
        <button id="logoutNoBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#ddd; color:#333; font-weight:500; cursor:pointer;">Cancel</button>
      </div>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById('logoutYesBtn').onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
    document.getElementById('logoutNoBtn').onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    };
    document.addEventListener('keydown', function escListener(e) {
      if (e.key === "Escape") {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          resolve(false);
        }
        document.removeEventListener('keydown', escListener);
      }
    });
  });
}

/* ----------------- Mobile description DOM removal/restore ----------------- */

(function mobileDescriptionHandler() {
  const breakpoint = 700;
  const descSelector = ".description";
  let originalContent = null;
  let emptied = false;

  function checkAndUpdateDescription() {
    const desc = document.querySelector(descSelector);
    if (!desc) return;

    if (window.innerWidth <= breakpoint) {
      if (!emptied) {
        originalContent = desc.innerHTML;
        desc.innerHTML = "";
        desc.setAttribute("data-original-content", "true");
        emptied = true;
      }
      desc.setAttribute("aria-hidden", "true");
      desc.style.display = "none";
    } else {
      if (emptied && originalContent !== null) {
        desc.innerHTML = originalContent;
        desc.removeAttribute("data-original-content");
        emptied = false;
        originalContent = null;
      }
      desc.setAttribute("aria-hidden", "false");
      desc.style.display = "";
    }
  }

  window.addEventListener("DOMContentLoaded", checkAndUpdateDescription);
  window.addEventListener("resize", function () {
    checkAndUpdateDescription();
  });
})();

/* ----------------- Dropdown positioning helpers (mobile only) ----------------- */

function showMobileAnchoredDropdown(dropdownEl, anchorEl) {
  if (!dropdownEl || !anchorEl) return;
  // Ensure element is attached to body to avoid clipping
  if (dropdownEl.parentElement !== document.body) {
    document.body.appendChild(dropdownEl);
  }

  dropdownEl.style.position = "fixed";
  dropdownEl.style.display = "flex";
  dropdownEl.style.visibility = "hidden";
  dropdownEl.style.zIndex = "2000";
  dropdownEl.style.maxWidth = "calc(100vw - 16px)";
  dropdownEl.style.boxSizing = "border-box";
  dropdownEl.style.flexDirection = "column";
  // Remove animation for nav/dropdown per request
  dropdownEl.style.animation = "none";
  dropdownEl.style.transition = "none";

  // Measure anchor and dropdown
  const rect = anchorEl.getBoundingClientRect();
  // Temporarily set left/top so getBoundingClientRect can compute dropdown size
  dropdownEl.style.left = "0px";
  dropdownEl.style.top = "0px";
  const ddRect = dropdownEl.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  // Compute horizontal position (keep some margin)
  let left = rect.left;
  if (left + ddRect.width > vw - 8) {
    left = Math.max(8, vw - ddRect.width - 8);
  }
  if (left < 8) left = 8;

  // Compute vertical position: prefer below anchor, else above
  let top = rect.bottom + 6;
  if (top + ddRect.height > vh - 8) {
    top = rect.top - ddRect.height - 6;
    if (top < 8) top = 8;
  }

  dropdownEl.style.left = `${Math.round(left)}px`;
  dropdownEl.style.top = `${Math.round(top)}px`;
  dropdownEl.setAttribute("aria-hidden", "false");
  dropdownEl.classList.add("open");
  dropdownEl.style.visibility = "visible";
}

function hideMobileAnchoredDropdown(dropdownEl) {
  if (!dropdownEl) return;
  dropdownEl.style.display = "none";
  dropdownEl.style.left = "";
  dropdownEl.style.top = "";
  dropdownEl.style.position = "";
  dropdownEl.style.visibility = "";
  dropdownEl.style.animation = "";
  dropdownEl.style.transition = "";
  dropdownEl.setAttribute("aria-hidden", "true");
  dropdownEl.classList.remove("open");
}

/* ----------------- Mobile nav dropdown creation (profile-style) ----------------- */

/*
  We'll create a mobileNavDropdown (a copy of the nav links) styled like the profile dropdown.
  On mobile, the hamburger will open this dropdown (Home, Interpreter, Lessons).
  The dropdown has no animation and uses anchored/fixed positioning to avoid clipping.
*/

let mobileNavDropdown = null;

function createMobileNavDropdown() {
  if (mobileNavDropdown) return mobileNavDropdown;
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return null;

  const dd = document.createElement("div");
  dd.id = "mobileNavDropdown";
  dd.className = "profile-dropdown"; // reuse profile-dropdown styles
  dd.style.animation = "none";       // remove fade-in
  dd.style.transition = "none";      // remove transitions

  // Build items: clone the nav-link anchors into dropdown items
  const anchors = navLinks.querySelectorAll(".nav-link");
  anchors.forEach(a => {
    const item = document.createElement("a");
    item.className = "profile-dropdown-item";
    item.href = a.getAttribute("href") || "#";
    item.dataset.route = a.dataset.route || "";
    item.textContent = a.textContent.trim();
    // On mobile, clicking should close dropdown and navigate (or open login modal if unauthenticated)
    item.addEventListener("click", function (e) {
      // allow normal navigation for anchors, but intercept if route requires auth
      const route = this.dataset.route;
      if (route && route !== "home" && !auth.currentUser) {
        e.preventDefault();
        hideMobileAnchoredDropdown(dd);
        openLoginModal();
        window.intendedRoute = this.getAttribute("href");
        return;
      }
      // close dropdown and proceed
      hideMobileAnchoredDropdown(dd);
      // If href is '#', prevent default
      if (this.getAttribute("href") === "#") e.preventDefault();
    });
    dd.appendChild(item);
  });

  // Add small aria role
  dd.setAttribute("role", "menu");
  dd.setAttribute("aria-hidden", "true");

  mobileNavDropdown = dd;
  return mobileNavDropdown;
}

/* ----------------- Profile dropdowns and hamburger behavior ----------------- */

function setupProfileDropdown() {
  const mobileProfileBtn = document.getElementById("profileIconBtn");
  const desktopProfileBtn = document.getElementById("profileIconBtnDesktop");
  const profileDropdown = document.getElementById("profileDropdown");

  // Mobile profile button behavior (anchored, fixed positioning)
  if (mobileProfileBtn && profileDropdown) {
    mobileProfileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isMobile = window.innerWidth <= 700;
      if (!isMobile) {
        // Not mobile: keep desktop behavior (shouldn't trigger mobile-profile)
        const mobileProfileMenu = document.querySelector(".mobile-profile");
        if (mobileProfileMenu) {
          const isOpen = mobileProfileMenu.classList.contains("open");
          document.querySelectorAll('.profile-menu-container.open').forEach(el => el.classList.remove('open'));
          if (!isOpen) {
            mobileProfileMenu.classList.add("open");
            mobileProfileBtn.setAttribute("aria-expanded", "true");
          } else {
            mobileProfileMenu.classList.remove("open");
            mobileProfileBtn.setAttribute("aria-expanded", "false");
          }
        }
        return;
      }

      const currentlyOpen = profileDropdown.classList.contains("open");
      // close mobile nav dropdown to avoid overlap
      if (mobileNavDropdown) hideMobileAnchoredDropdown(mobileNavDropdown);

      if (!currentlyOpen) {
        showMobileAnchoredDropdown(profileDropdown, mobileProfileBtn);
        mobileProfileBtn.setAttribute("aria-expanded", "true");
      } else {
        hideMobileAnchoredDropdown(profileDropdown);
        mobileProfileBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Desktop profile behavior unchanged
  if (desktopProfileBtn) {
    const desktopProfileMenu = document.querySelector(".desktop-profile");
    desktopProfileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = desktopProfileMenu.classList.contains("open");
      document.querySelectorAll('.profile-menu-container.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) {
        desktopProfileMenu.classList.add("open");
        desktopProfileBtn.setAttribute("aria-expanded", "true");
      } else {
        desktopProfileMenu.classList.remove("open");
        desktopProfileBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Wire mobile profile actions (Profile / Logout)
  const mobileLogout = document.getElementById("menuLogout");
  const mobileProfile = document.getElementById("menuProfile");
  if (mobileLogout) {
    mobileLogout.onclick = (e) => {
      e.preventDefault();
      hideMobileAnchoredDropdown(profileDropdown);
      handleLogout();
    };
  }
  if (mobileProfile) {
    mobileProfile.onclick = (e) => {
      e.preventDefault();
      hideMobileAnchoredDropdown(profileDropdown);
      window.location.href = "profile.html";
    };
  }

  // Desktop actions unchanged
  const desktopLogout = document.getElementById("menuLogoutDesktop");
  const desktopProfile = document.getElementById("menuProfileDesktop");
  if (desktopLogout) {
    desktopLogout.onclick = (e) => {
      e.preventDefault();
      const desktopProfileMenu = document.querySelector(".desktop-profile");
      if (desktopProfileMenu) desktopProfileMenu.classList.remove("open");
      handleLogout();
    };
  }
  if (desktopProfile) {
    desktopProfile.onclick = (e) => {
      e.preventDefault();
      const desktopProfileMenu = document.querySelector(".desktop-profile");
      if (desktopProfileMenu) desktopProfileMenu.classList.remove("open");
      window.location.href = "profile.html";
    };
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", function (e) {
    if (profileDropdown && profileDropdown.classList.contains("open")) {
      const anchor = document.getElementById("profileIconBtn");
      if (anchor && !anchor.contains(e.target) && !profileDropdown.contains(e.target)) {
        hideMobileAnchoredDropdown(profileDropdown);
        if (anchor) anchor.setAttribute("aria-expanded", "false");
      }
    }
    if (mobileNavDropdown && mobileNavDropdown.classList.contains("open")) {
      const anchor = document.getElementById("hamburgerMenu");
      if (anchor && !anchor.contains(e.target) && !mobileNavDropdown.contains(e.target)) {
        hideMobileAnchoredDropdown(mobileNavDropdown);
        if (anchor) anchor.classList.remove("active");
      }
    }

    // close desktop profile containers when clicking outside
    document.querySelectorAll(".profile-menu-container").forEach(profileMenu => {
      if (!profileMenu.contains(e.target)) {
        profileMenu.classList.remove("open");
        const btn = profileMenu.querySelector(".profile-icon-btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Keyboard accessibility for profile buttons
  const allProfileBtns = document.querySelectorAll(".profile-icon-btn");
  allProfileBtns.forEach(profileBtn => {
    profileBtn.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Tab") {
        const profileMenu = profileBtn.closest(".profile-menu-container");
        if (profileMenu) {
          profileMenu.classList.remove("open");
          profileBtn.setAttribute("aria-expanded", "false");
        }
        const pd = document.getElementById("profileDropdown");
        if (pd) hideMobileAnchoredDropdown(pd);
      }
    });
  });

  // On resize/orientation change hide anchored dropdowns or re-position if open
  window.addEventListener("resize", function () {
    // If moving to desktop view, ensure mobile dropdowns are hidden and return to CSS-driven layout
    if (window.innerWidth > 700) {
      if (profileDropdown && profileDropdown.parentElement === document.body) {
        profileDropdown.style.position = "";
        profileDropdown.style.left = "";
        profileDropdown.style.top = "";
        profileDropdown.style.maxWidth = "";
        profileDropdown.style.display = "";
        profileDropdown.style.visibility = "";
        profileDropdown.style.animation = "";
        profileDropdown.style.transition = "";
      }
      if (mobileNavDropdown && mobileNavDropdown.parentElement === document.body) {
        mobileNavDropdown.style.position = "";
        mobileNavDropdown.style.left = "";
        mobileNavDropdown.style.top = "";
        mobileNavDropdown.style.maxWidth = "";
        mobileNavDropdown.style.display = "";
        mobileNavDropdown.style.visibility = "";
        mobileNavDropdown.style.animation = "";
        mobileNavDropdown.style.transition = "";
      }
    } else {
      // If a mobile dropdown is open, reposition it
      if (profileDropdown && profileDropdown.classList.contains("open")) {
        const anchor = document.getElementById("profileIconBtn");
        if (anchor) showMobileAnchoredDropdown(profileDropdown, anchor);
      }
      if (mobileNavDropdown && mobileNavDropdown.classList.contains("open")) {
        const anchor = document.getElementById("hamburgerMenu");
        if (anchor) showMobileAnchoredDropdown(mobileNavDropdown, anchor);
      }
    }
  });
}

/* ----------------- Hamburger behavior: show mobile nav dropdown (no animation) ----------------- */

function setupHamburgerMenu() {
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const navLinks = document.getElementById("navLinks");

  if (!hamburgerMenu || !navLinks) return;

  // Prepare mobileNavDropdown (copy of navLinks) so we don't move the original element
  const mobileDD = createMobileNavDropdown();

  hamburgerMenu.addEventListener("click", function (e) {
    e.stopPropagation();
    const isMobile = window.innerWidth <= 700;

    // If mobile, show the mobileNavDropdown anchored to hamburger (profile-style, no animation)
    if (isMobile && mobileDD) {
      const currentlyOpen = mobileDD.classList.contains("open");

      // close profile dropdown to avoid overlap
      const profileDropdown = document.getElementById("profileDropdown");
      if (profileDropdown) hideMobileAnchoredDropdown(profileDropdown);

      if (!currentlyOpen) {
        showMobileAnchoredDropdown(mobileDD, hamburgerMenu);
        hamburgerMenu.classList.add("active");
      } else {
        hideMobileAnchoredDropdown(mobileDD);
        hamburgerMenu.classList.remove("active");
      }
      return;
    }

    // Desktop behavior: toggle nav links (unchanged)
    const isOpen = navLinks.classList.contains("active");
    if (!isOpen) {
      navLinks.classList.add("active");
      hamburgerMenu.classList.add("active");
    } else {
      navLinks.classList.remove("active");
      hamburgerMenu.classList.remove("active");
    }
  });

  // Ensure clicking outside closes mobile nav dropdown (handled in setupProfileDropdown listener too)
  document.addEventListener("click", function (e) {
    const mobileDDEl = mobileNavDropdown;
    if (!mobileDDEl) return;
    const clickedInsideMobileDD = mobileDDEl.contains(e.target);
    const clickedHamburger = hamburgerMenu.contains(e.target);
    if (!clickedInsideMobileDD && !clickedHamburger) {
      hideMobileAnchoredDropdown(mobileDDEl);
      hamburgerMenu.classList.remove("active");
    }
  });
}

/* ----------------- Progress preloader (background) ----------------- */

async function preloadProgressData(user) {
  try {
    console.log('🚀 [HOME] Preloading progress data in background...');
    const { db } = await import('./firebase.js');
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");
    const progressRef = collection(db, 'users', user.uid, 'progress');
    const querySnapshot = await getDocs(progressRef);
    const cachedData = {};
    querySnapshot.forEach((doc) => {
      cachedData[doc.id] = doc.data();
    });
    sessionStorage.setItem('progress_preloaded', JSON.stringify({
      data: cachedData,
      timestamp: Date.now(),
      userId: user.uid
    }));
    console.log('✅ [HOME] Progress preloaded and cached!');
  } catch (error) {
    console.error('[HOME] Preload error:', error);
  }
}

/* ----------------- Carousel (AutoCarousel) ----------------- */

class AutoCarousel {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 8;
    this.isPlaying = true;
    this.intervalId = null;
    this.slideDuration = 3000;

    this.slides = document.getElementById("carouselSlides");
    this.dots = document.querySelectorAll(".dot");
    this.currentSlideInfo = document.getElementById("currentSlideInfo");

    this.slideTexts = [
      "demonstrating sign language gesture 1",
      "demonstrating sign language gesture 2",
      "demonstrating sign language gesture 3",
      "demonstrating sign language gesture 4",
      "demonstrating sign language gesture 5",
      "demonstrating sign language gesture 6",
      "demonstrating sign language gesture 7",
      "demonstrating sign language gesture 8",
    ];

    this.init();
  }

  init() {
    if (!this.slides) return;
    this.startAutoPlay();
    this.setupEventListeners();
    this.updateSlideInfo();
    this.updateDots();
  }

  setupEventListeners() {
    this.dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        this.goToSlide(index);
      });
    });

    this.slides.addEventListener("mouseenter", () => {
      if (this.isPlaying) {
        this.pauseAutoPlay();
      }
    });

    this.slides.addEventListener("mouseleave", () => {
      if (this.isPlaying) {
        this.startAutoPlay();
      }
    });
  }

  goToSlide(slideIndex) {
    this.currentSlide = slideIndex;
    const translateX = -(slideIndex * 12.5);
    this.slides.style.transform = `translateX(${translateX}%)`;
    this.updateDots();
    this.updateSlideInfo();
    if (this.isPlaying) {
      this.restartAutoPlay();
    }
  }

  nextSlide() {
    const nextIndex = (this.currentSlide + 1) % this.totalSlides;
    this.goToSlide(nextIndex);
  }

  updateDots() {
    this.dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === this.currentSlide);
    });
  }

  updateSlideInfo() {
    if (this.currentSlideInfo) {
      this.currentSlideInfo.textContent = this.slideTexts[this.currentSlide] || "";
    }
  }

  startAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, this.slideDuration);
  }

  pauseAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restartAutoPlay() {
    this.pauseAutoPlay();
    this.startAutoPlay();
  }
}

/* ----------------- Initialization: wire everything on DOMContentLoaded ----------------- */

document.addEventListener("DOMContentLoaded", function () {
  initializeEyeIcons();
  setupPasswordToggleListeners();
  setupProfileDropdown();
  setupHamburgerMenu();

  // Auth state listener
  import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, (user) => {
        try {
          updateNavAuthButtons();
        } catch (e) { console.warn("updateNavAuthButtons failed", e); }
        if (user) {
          console.log("User is signed in:", user.email);
          preloadProgressData(user);
        } else {
          console.log("User is signed out");
        }
      });
    })
    .catch(err => console.error("Failed loading firebase auth:", err));

  // Intercept nav links if not logged in
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

  // Initialize carousel
  try {
    new AutoCarousel();
  } catch (err) {
    console.warn("Carousel init failed:", err);
  }
});

/* ----------------- Make some functions globally available ----------------- */

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToRegisterModal = switchToRegisterModal;
window.switchToLoginModal = switchToLoginModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleLogout = handleLogout;

/* ----------------- Exports ----------------- */

export { preloadProgressData };