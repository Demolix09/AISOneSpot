(function () {
  const api = window.AISAnnouncements;

  if (!api) {
    return;
  }

  const authStatusEl = document.getElementById("auth-status");
  const loginForm = document.getElementById("staff-login-form");
  const fullNameField = document.getElementById("staff-full-name");
  const emailField = document.getElementById("staff-email");
  const passwordField = document.getElementById("staff-password");
  const loginButton = document.getElementById("staff-login-button");
  const registerButton = document.getElementById("staff-register-button");
  const logoutButton = document.getElementById("staff-logout-button");
  const accountAvatarEl = document.getElementById("account-status-avatar");
  const accountStatusTextEl = document.getElementById("account-status-text");
  const nextParam = new URLSearchParams(window.location.search).get("next");
  const nextPath = nextParam && nextParam.indexOf("..") === 0 ? nextParam : "../admin/index.html";
  const avatarFallback = "../assets/account-placeholder.svg";

  let currentUser = null;
  let isBusy = false;
  let unsubscribeAuthListener = function () {};

  function setBusy(nextBusy) {
    isBusy = nextBusy;
    loginButton.disabled = nextBusy;
    registerButton.disabled = nextBusy;
    logoutButton.disabled = nextBusy || !currentUser;
  }

  function setAuthStatus(message, isError) {
    authStatusEl.textContent = message;
    authStatusEl.className = isError ? "notice notice-error" : "notice notice-soft";
  }

  function resolveAvatar(user) {
    if (!user) {
      return avatarFallback;
    }

    const meta = user.user_metadata || {};
    const name = meta.full_name || user.email || "Staff User";
    return (
      meta.avatar_url ||
      meta.picture ||
      meta.photo_url ||
      ("https://ui-avatars.com/api/?name=" +
        encodeURIComponent(name) +
        "&background=13226f&color=ffffff")
    );
  }

  function updateAccountBadge(user) {
    if (!accountAvatarEl || !accountStatusTextEl) {
      return;
    }

    accountAvatarEl.src = resolveAvatar(user);
    accountAvatarEl.onerror = function () {
      accountAvatarEl.src = avatarFallback;
    };

    accountStatusTextEl.textContent = user ? "Logged in" : "Not logged in";
    accountStatusTextEl.classList.toggle("is-logged-in", Boolean(user));
  }

  function applySessionUI(user) {
    currentUser = user || null;
    logoutButton.disabled = !currentUser || isBusy;
    updateAccountBadge(currentUser);

    if (currentUser) {
      setAuthStatus("Signed in as " + (currentUser.email || "staff user") + ".", false);
    } else {
      setAuthStatus("Use your staff account to sign in or register.", false);
    }
  }

  async function refreshSession() {
    const sessionResult = await api.getSession();

    if (sessionResult.error) {
      applySessionUI(null);
      setAuthStatus(sessionResult.error.message || "Unable to verify session.", true);
      return;
    }

    applySessionUI(sessionResult.user || null);
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!api.isConfigured()) {
      setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
      return;
    }

    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!email || !password) {
      setAuthStatus("Email and password are required.", true);
      return;
    }

    setBusy(true);

    try {
      const signInResult = await api.signIn(email, password);
      if (signInResult.error) {
        setAuthStatus(signInResult.error.message || "Sign in failed.", true);
        return;
      }

      passwordField.value = "";
      await refreshSession();
      window.location.href = nextPath;
    } catch (error) {
      setAuthStatus(error.message || "Sign in failed.", true);
    } finally {
      setBusy(false);
    }
  });

  registerButton.addEventListener("click", async function () {
    if (!api.isConfigured()) {
      setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
      return;
    }

    const fullName = fullNameField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!email || !password) {
      setAuthStatus("Email and password are required to register.", true);
      return;
    }

    setBusy(true);

    try {
      const registerResult = await api.registerStaff(email, password, fullName);
      if (registerResult.error) {
        setAuthStatus(registerResult.error.message || "Registration failed.", true);
        return;
      }

      passwordField.value = "";

      if (registerResult.data && registerResult.data.session) {
        setAuthStatus(
          "Account created. Staff profile is pending activation by an admin.",
          false
        );
      } else {
        setAuthStatus(
          "Account created. Check your email to confirm, then sign in.",
          false
        );
      }

      await refreshSession();
    } catch (error) {
      setAuthStatus(error.message || "Registration failed.", true);
    } finally {
      setBusy(false);
    }
  });

  logoutButton.addEventListener("click", async function () {
    if (!currentUser) {
      return;
    }

    setBusy(true);

    try {
      const signOutResult = await api.signOut();
      if (signOutResult.error) {
        setAuthStatus(signOutResult.error.message || "Sign out failed.", true);
        return;
      }

      applySessionUI(null);
      setAuthStatus("Signed out.", false);
    } finally {
      setBusy(false);
    }
  });

  if (!api.isConfigured()) {
    setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
    updateAccountBadge(null);
    return;
  }

  unsubscribeAuthListener = api.onAuthStateChange(function (session) {
    applySessionUI(session ? session.user : null);
  });

  window.addEventListener("beforeunload", function () {
    unsubscribeAuthListener();
  });

  refreshSession();
})();
