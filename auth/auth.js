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
  const confirmPasswordField = document.getElementById("staff-password-confirm");
  const loginButton = document.getElementById("staff-login-button");
  const registerButton = document.getElementById("staff-register-button");
  const logoutButton = document.getElementById("staff-logout-button");
  const accountAvatarEl = document.getElementById("account-status-avatar");
  const accountStatusTextEl = document.getElementById("account-status-text");
  const staffAccessStateEl = document.getElementById("staff-access-state");
  const accessTopbarTextEl = document.getElementById("access-topbar-text");
  const openAdminLinkEl = document.getElementById("open-admin-link");
  const emailCodePanelEl = document.getElementById("email-code-panel");
  const emailCodeHintEl = document.getElementById("email-code-hint");
  const emailCodeInputEl = document.getElementById("email-code-input");
  const verifyEmailCodeButton = document.getElementById("verify-email-code-button");
  const resendEmailCodeButton = document.getElementById("resend-email-code-button");
  const nextParam = new URLSearchParams(window.location.search).get("next");
  const nextPath = nextParam && nextParam.indexOf("..") === 0 ? nextParam : "../admin/index.html";
  const avatarFallback = "../assets/account-placeholder.svg";

  let currentUser = null;
  let isBusy = false;
  let pendingConfirmationEmail = "";
  let sessionPollIntervalId = null;

  function setBusy(nextBusy) {
    isBusy = nextBusy;
    loginButton.disabled = nextBusy;
    registerButton.disabled = nextBusy;
    logoutButton.disabled = nextBusy || !currentUser;
    if (verifyEmailCodeButton) {
      verifyEmailCodeButton.disabled = nextBusy || !pendingConfirmationEmail;
    }
    if (resendEmailCodeButton) {
      resendEmailCodeButton.disabled = nextBusy || !pendingConfirmationEmail;
    }
  }

  function setAuthStatus(message, isError) {
    authStatusEl.textContent = message;
    authStatusEl.className = isError ? "notice notice-error" : "notice notice-soft";
  }

  function messageIncludes(text, token) {
    return String(text || "").toLowerCase().indexOf(String(token || "").toLowerCase()) >= 0;
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

  function setTopbarText(text) {
    if (accessTopbarTextEl) {
      accessTopbarTextEl.textContent = text;
    }
  }

  function updateVerificationPanel() {
    if (!emailCodePanelEl) {
      return;
    }

    const hasPending = Boolean(pendingConfirmationEmail);
    emailCodePanelEl.hidden = !hasPending;

    if (emailCodeHintEl) {
      emailCodeHintEl.textContent = hasPending
        ? "Enter the verification code sent to " + pendingConfirmationEmail + "."
        : "We will send a verification code to your email.";
    }

    if (verifyEmailCodeButton) {
      verifyEmailCodeButton.disabled = isBusy || !hasPending;
    }

    if (resendEmailCodeButton) {
      resendEmailCodeButton.disabled = isBusy || !hasPending;
    }
  }

  function setStaffAccessState(access) {
    if (!staffAccessStateEl) {
      return;
    }

    if (openAdminLinkEl) {
      openAdminLinkEl.hidden = true;
    }

    if (!currentUser) {
      staffAccessStateEl.textContent = "Staff access status: not signed in.";
      staffAccessStateEl.className = "notice notice-soft";
      setTopbarText("Account authentication");
      return;
    }

    if (!access || access.error) {
      staffAccessStateEl.textContent = "Staff access status: could not verify right now.";
      staffAccessStateEl.className = "notice notice-error";
      setTopbarText("Account authentication");
      return;
    }

    if (!access.profile) {
      staffAccessStateEl.textContent = "Staff access status: no staff profile found yet.";
      staffAccessStateEl.className = "notice notice-error";
      setTopbarText("Account authentication");
      return;
    }

    if (access.allowed) {
      staffAccessStateEl.textContent = "Staff access status: active.";
      staffAccessStateEl.className = "notice notice-success";
      setTopbarText("Staff access enabled");
      if (openAdminLinkEl) {
        openAdminLinkEl.hidden = false;
      }
      return;
    }

    staffAccessStateEl.textContent = "Staff access status: pending admin activation.";
    staffAccessStateEl.className = "notice notice-soft";
    setTopbarText("Account authentication");
  }

  function showSignedOutPrompt() {
    if (pendingConfirmationEmail) {
      setAuthStatus(
        "Enter the verification code sent to " + pendingConfirmationEmail + " to finish setup.",
        false
      );
      updateVerificationPanel();
      return;
    }

    setAuthStatus("Sign in with your account or register a new one.", false);
    updateVerificationPanel();
  }

  async function refreshSession(options) {
    const keepCurrentStatus = Boolean(options && options.keepCurrentStatus);
    const sessionResult = await api.getSession();

    if (sessionResult.error) {
      currentUser = null;
      updateAccountBadge(null);
      setStaffAccessState(null);
      if (!keepCurrentStatus) {
        setAuthStatus(sessionResult.error.message || "Unable to verify session.", true);
      }
      return {
        user: null,
        access: null
      };
    }

    currentUser = sessionResult.user || null;
    logoutButton.disabled = !currentUser || isBusy;
    updateAccountBadge(currentUser);

    if (!currentUser) {
      setStaffAccessState(null);
      if (!keepCurrentStatus) {
        showSignedOutPrompt();
      }
      return {
        user: null,
        access: null
      };
    }

    pendingConfirmationEmail = "";
    updateVerificationPanel();

    let access = null;
    if (typeof api.getStaffAccessStatus === "function") {
      access = await api.getStaffAccessStatus();
    }

    // If authenticated but missing a profile row, try to create one automatically.
    if (access && !access.error && !access.profile && typeof api.ensureStaffProfile === "function") {
      const ensureResult = await api.ensureStaffProfile();
      if (!ensureResult || ensureResult.error) {
        if (!keepCurrentStatus) {
          const ensureError = ensureResult && ensureResult.error && ensureResult.error.message
            ? ensureResult.error.message
            : "Could not auto-create staff profile row.";
          setAuthStatus(ensureError, true);
        }
      } else if (typeof api.getStaffAccessStatus === "function") {
        access = await api.getStaffAccessStatus();
      }
    }

    setStaffAccessState(access);

    if (!keepCurrentStatus) {
      if (!access || access.error) {
        setAuthStatus("Signed in, but staff access could not be verified.", true);
      } else if (!access.profile) {
        setAuthStatus("Signed in. Your staff profile is still being prepared.", false);
      } else if (!access.allowed) {
        setAuthStatus("Account found. Staff access is pending admin activation.", false);
      } else {
        setAuthStatus("Signed in as " + (currentUser.email || "staff user") + ".", false);
      }
    }

    return {
      user: currentUser,
      access: access
    };
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

    pendingConfirmationEmail = "";
    setBusy(true);

    try {
      const signInResult = await api.signIn(email, password);
      if (signInResult.error) {
        const signInMessage = String(signInResult.error.message || "");
        if (messageIncludes(signInMessage, "email not confirmed")) {
          pendingConfirmationEmail = email;
          updateVerificationPanel();
          setAuthStatus(
            "Your email is not confirmed yet. Enter the verification code sent to your email.",
            true
          );
          return;
        }
        setAuthStatus(signInResult.error.message || "Sign in failed.", true);
        return;
      }

      passwordField.value = "";
      let sessionState = await refreshSession({ keepCurrentStatus: true });
      let access = sessionState.access;

      if (!sessionState.user) {
        setAuthStatus("Sign in failed. Please try again.", true);
        return;
      }

      if (!access || access.error) {
        setAuthStatus("Signed in, but staff access could not be verified right now.", true);
        return;
      }

      if (!access.profile) {
        setAuthStatus("Signed in. Your staff profile is still being prepared.", false);
        return;
      }

      if (!access.allowed) {
        setAuthStatus("Signed in. Staff access is pending admin activation.", false);
        return;
      }

      setAuthStatus("Sign in successful. Redirecting to Staff Admin...", false);
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
    const confirmPassword = confirmPasswordField ? confirmPasswordField.value : "";

    if (!email || !password) {
      setAuthStatus("Email and password are required to register.", true);
      return;
    }

    if (typeof api.isAllowedRegistrationEmail === "function" && !api.isAllowedRegistrationEmail(email)) {
      setAuthStatus("Use your school email to register (@aiscr.org or @ais.ed.cr).", true);
      return;
    }

    if (!confirmPassword) {
      setAuthStatus("Please confirm your password to register.", true);
      return;
    }

    if (password !== confirmPassword) {
      setAuthStatus("Passwords do not match. Please re-enter them.", true);
      return;
    }

    setBusy(true);

    try {
      // Pre-check: if credentials already work (or email exists but is unconfirmed),
      // treat it as an existing account before attempting a new registration.
      const existingCheck = await api.signIn(email, password);

      if (!existingCheck.error) {
        await api.signOut();
        setAuthStatus("That email is already registered. Please sign in instead.", true);
        return;
      }

      const existingMessage = String(existingCheck.error.message || "").toLowerCase();
      if (messageIncludes(existingMessage, "email not confirmed")) {
        pendingConfirmationEmail = email;
        updateVerificationPanel();
        setAuthStatus(
          "This account is already registered but not confirmed yet. Enter the verification code sent to your email.",
          true
        );
        return;
      }

      const registerResult = await api.registerStaff(email, password, fullName);
      if (registerResult.error) {
        const message = registerResult.error.message || "Registration failed.";

        if (messageIncludes(message, "already registered") || messageIncludes(message, "already exists")) {
          setAuthStatus("That email is already registered. Please sign in instead.", true);
        } else if (messageIncludes(message, "rate limit")) {
          setAuthStatus(
            "Email rate limit exceeded. Please wait a few minutes and try again.",
            true
          );
        } else {
          setAuthStatus(message, true);
        }
        return;
      }

      passwordField.value = "";
      if (confirmPasswordField) {
        confirmPasswordField.value = "";
      }
      const hasSession = Boolean(registerResult.data && registerResult.data.session);
      const createdUser = registerResult.data && registerResult.data.user ? registerResult.data.user : null;
      const identities = createdUser && Array.isArray(createdUser.identities) ? createdUser.identities : null;
      const createdAtMs = createdUser && createdUser.created_at ? Date.parse(createdUser.created_at) : NaN;
      const looksExistingByIdentity =
        !hasSession &&
        identities &&
        identities.length === 0 &&
        (
          Boolean(createdUser && createdUser.email_confirmed_at) ||
          (!Number.isNaN(createdAtMs) && Date.now() - createdAtMs > 120000)
        );

      if (looksExistingByIdentity) {
        setAuthStatus("That email is already registered. Please sign in instead.", true);
        return;
      }

      if (hasSession) {
        await refreshSession({ keepCurrentStatus: true });
        setAuthStatus("Account created. Staff access is pending admin activation.", false);
        return;
      }

      pendingConfirmationEmail = email;
      updateVerificationPanel();
      setAuthStatus(
        "Registration submitted. Enter the verification code sent to your email.",
        false
      );
      await refreshSession({ keepCurrentStatus: true });
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

      currentUser = null;
      updateAccountBadge(null);
      setStaffAccessState(null);
      setAuthStatus("Signed out.", false);
      pendingConfirmationEmail = "";
      updateVerificationPanel();
    } finally {
      setBusy(false);
    }
  });

  if (verifyEmailCodeButton) {
    verifyEmailCodeButton.addEventListener("click", async function () {
      if (!api.isConfigured()) {
        setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
        return;
      }

      const email = String(pendingConfirmationEmail || emailField.value || "").trim();
      const code = emailCodeInputEl ? String(emailCodeInputEl.value || "").trim() : "";

      if (!email || !code) {
        setAuthStatus("Email and verification code are required.", true);
        return;
      }

      setBusy(true);
      try {
        const verifyResult = await api.verifyEmailCode(email, code);
        if (verifyResult.error) {
          setAuthStatus(verifyResult.error.message || "Verification failed.", true);
          return;
        }

        pendingConfirmationEmail = "";
        updateVerificationPanel();
        if (emailCodeInputEl) {
          emailCodeInputEl.value = "";
        }

        await refreshSession({ keepCurrentStatus: false });
        setAuthStatus("Email verified successfully. You can now sign in.", false);
      } catch (error) {
        setAuthStatus(error.message || "Verification failed.", true);
      } finally {
        setBusy(false);
      }
    });
  }

  if (resendEmailCodeButton) {
    resendEmailCodeButton.addEventListener("click", async function () {
      if (!api.isConfigured()) {
        setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
        return;
      }

      const email = String(pendingConfirmationEmail || emailField.value || "").trim();
      if (!email) {
        setAuthStatus("Enter your email first to resend a code.", true);
        return;
      }

      setBusy(true);
      try {
        const resendResult = await api.resendVerificationCode(email);
        if (resendResult.error) {
          setAuthStatus(resendResult.error.message || "Could not resend code.", true);
          return;
        }

        pendingConfirmationEmail = email;
        updateVerificationPanel();
        setAuthStatus("Verification code resent. Check your email.", false);
      } catch (error) {
        setAuthStatus(error.message || "Could not resend code.", true);
      } finally {
        setBusy(false);
      }
    });
  }

  if (!api.isConfigured()) {
    setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
    updateAccountBadge(null);
    setStaffAccessState(null);
    updateVerificationPanel();
    return;
  }

  refreshSession({ keepCurrentStatus: false });

  sessionPollIntervalId = window.setInterval(function () {
    refreshSession({ keepCurrentStatus: false });
  }, 10000);

  window.addEventListener("beforeunload", function () {
    if (sessionPollIntervalId) {
      window.clearInterval(sessionPollIntervalId);
    }
  });
})();
