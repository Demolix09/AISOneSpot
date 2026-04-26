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

  const adminAppEl = document.getElementById("admin-app");
  const listEl = document.getElementById("admin-announcements-list");
  const emptyStateEl = document.getElementById("admin-empty-state");
  const noticeEl = document.getElementById("admin-notice");
  const formHeadingEl = document.getElementById("form-heading");
  const formSubtitleEl = document.getElementById("form-subtitle");

  const fields = {
    id: document.getElementById("announcement-id"),
    title: document.getElementById("announcement-title"),
    body: document.getElementById("announcement-body"),
    category: document.getElementById("announcement-category"),
    visibility: document.getElementById("announcement-visibility"),
    priority: document.getElementById("announcement-priority"),
    publishAt: document.getElementById("announcement-publish-at"),
    expiresAt: document.getElementById("announcement-expires-at"),
    pinned: document.getElementById("announcement-pinned"),
    authorName: document.getElementById("announcement-author"),
    publishedAt: document.getElementById("announcement-published-at"),
    createdAt: document.getElementById("announcement-created-at"),
    archivedAt: document.getElementById("announcement-archived-at")
  };

  const form = document.getElementById("announcement-form");
  const saveDraftButton = document.getElementById("save-draft-button");
  const clearFormButton = document.getElementById("clear-form-button");
  const newAnnouncementButton = document.getElementById("new-announcement-button");

  let currentUser = null;
  let currentItems = [];
  let isBusy = false;
  let unsubscribeAuthListener = function () {};

  function setBusy(nextBusy) {
    isBusy = nextBusy;
    loginButton.disabled = nextBusy;
    registerButton.disabled = nextBusy;
    logoutButton.disabled = nextBusy || !currentUser;
    saveDraftButton.disabled = nextBusy;
  }

  function showNotice(message, tone) {
    noticeEl.textContent = message;
    noticeEl.className = "notice";
    noticeEl.classList.add(tone === "error" ? "notice-error" : "notice-success");
  }

  function clearNotice() {
    noticeEl.textContent = "";
    noticeEl.className = "notice is-hidden";
  }

  function setAuthStatus(message, isError) {
    authStatusEl.textContent = message;
    authStatusEl.className = isError ? "notice notice-error" : "notice notice-soft";
  }

  function setSignedInUI(signedIn) {
    adminAppEl.classList.toggle("is-hidden", !signedIn);
    logoutButton.disabled = !signedIn || isBusy;

    if (signedIn && currentUser) {
      setAuthStatus("Signed in as " + (currentUser.email || "staff user") + ".", false);
    } else {
      setAuthStatus("Sign in with staff credentials to manage announcements.", false);
      listEl.innerHTML = "";
      emptyStateEl.classList.add("is-hidden");
      clearNotice();
    }
  }

  function resetForm() {
    form.reset();
    fields.id.value = "";
    fields.publishedAt.value = "";
    fields.createdAt.value = "";
    fields.archivedAt.value = "";
    fields.authorName.value = "AIS Staff";
    fields.category.value = "general";
    fields.visibility.value = "public";
    fields.priority.value = "normal";
    formHeadingEl.textContent = "Create announcement";
    formSubtitleEl.textContent = "Draft content here first, then publish when you are ready.";
    clearNotice();
  }

  function populateForm(item) {
    fields.id.value = item.id;
    fields.title.value = item.title || "";
    fields.body.value = item.body || "";
    fields.category.value = item.category || "general";
    fields.visibility.value = item.visibility || "public";
    fields.priority.value = item.priority || "normal";
    fields.publishAt.value = api.toDateValue(item.publishAt);
    fields.expiresAt.value = api.toDateValue(item.expiresAt);
    fields.pinned.checked = Boolean(item.pinned);
    fields.authorName.value = item.authorName || "AIS Staff";
    fields.publishedAt.value = item.publishedAt || "";
    fields.createdAt.value = item.createdAt || "";
    fields.archivedAt.value = item.archivedAt || "";

    formHeadingEl.textContent = "Edit announcement";
    formSubtitleEl.textContent = "Update the record, then save it as draft or publish again.";
    clearNotice();
  }

  function readForm(intent) {
    return {
      id: fields.id.value,
      title: fields.title.value,
      body: fields.body.value,
      category: fields.category.value,
      visibility: fields.visibility.value,
      priority: fields.priority.value,
      publishAt: api.fromDateValue(fields.publishAt.value),
      expiresAt: api.fromDateValue(fields.expiresAt.value),
      pinned: fields.pinned.checked,
      authorName: fields.authorName.value,
      publishedAt: fields.publishedAt.value,
      createdAt: fields.createdAt.value,
      archivedAt: fields.archivedAt.value,
      status: intent === "publish" ? "published" : "draft"
    };
  }

  function findAnnouncement(id) {
    return currentItems.find(function (item) {
      return item.id === id;
    });
  }

  function renderListItems(items) {
    listEl.innerHTML = "";
    emptyStateEl.classList.toggle("is-hidden", items.length > 0);

    items.forEach(function (item) {
      const wrapper = document.createElement("article");
      wrapper.className = "admin-card";

      wrapper.innerHTML =
        '<div class="admin-card-head">' +
        "<div>" +
        "<h3>" + api.escapeHtml(item.title) + "</h3>" +
        '<div class="announcement-meta">' +
        api.statusLabel(item.status) +
        " | " +
        api.visibilityLabel(item.visibility) +
        "</div>" +
        "</div>" +
        '<div class="tag-row">' +
        '<span class="tag ' + api.escapeHtml(item.category) + '">' + api.escapeHtml(api.categoryLabel(item.category)) + "</span>" +
        '<span class="tag ' + (item.priority === "urgent" ? "urgent" : item.priority === "high" ? "events" : "general") + '">' +
        api.escapeHtml(item.priority) +
        "</span>" +
        (item.pinned ? '<span class="tag general">Pinned</span>' : "") +
        "</div>" +
        "</div>" +
        '<p class="admin-card-body">' + api.escapeHtml(item.body) + "</p>" +
        '<div class="admin-card-meta">' +
        "<strong>Author:</strong> " + api.escapeHtml(item.authorName || "AIS Staff") +
        "<br /><strong>Publish:</strong> " + api.escapeHtml(api.formatDateTime(item.publishAt || item.publishedAt)) +
        (item.expiresAt ? "<br /><strong>Expires:</strong> " + api.escapeHtml(api.formatDateTime(item.expiresAt)) : "") +
        "</div>" +
        '<div class="admin-card-actions">' +
        '<button type="button" class="button button-secondary" data-action="edit" data-id="' + api.escapeHtml(item.id) + '">Edit</button>' +
        '<button type="button" class="button button-primary" data-action="publish" data-id="' + api.escapeHtml(item.id) + '">Publish</button>' +
        '<button type="button" class="button button-secondary" data-action="archive" data-id="' + api.escapeHtml(item.id) + '">Archive</button>' +
        '<button type="button" class="button button-secondary" data-action="delete" data-id="' + api.escapeHtml(item.id) + '">Delete</button>' +
        "</div>";

      listEl.appendChild(wrapper);
    });
  }

  async function renderList() {
    if (!currentUser) {
      return;
    }

    try {
      await api.hydrateScheduledAnnouncements();
      currentItems = await api.getAdminAnnouncements();
      renderListItems(currentItems);
    } catch (error) {
      showNotice(error.message || "Unable to load announcements.", "error");
    }
  }

  async function refreshSession() {
    const sessionResult = await api.getSession();

    if (sessionResult.error) {
      currentUser = null;
      setSignedInUI(false);
      setAuthStatus(sessionResult.error.message || "Unable to verify session.", true);
      return;
    }

    currentUser = sessionResult.user || null;
    setSignedInUI(Boolean(currentUser));

    if (currentUser) {
      await renderList();
    }
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
      showNotice("Signed in successfully.", "success");
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
          "Account created. Your staff profile is pending activation. Ask an admin to set you active.",
          false
        );
        await refreshSession();
      } else {
        setAuthStatus(
          "Account created. Check your email to confirm, then sign in. Staff activation is still required.",
          false
        );
      }

      showNotice("Registration submitted.", "success");
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
      setSignedInUI(false);
      setAuthStatus("Signed out.", false);
    } finally {
      setBusy(false);
    }
  });

  saveDraftButton.addEventListener("click", async function () {
    const item = readForm("draft");

    if (!item.title.trim() || !item.body.trim()) {
      showNotice("Title and message are required.", "error");
      return;
    }

    try {
      await api.saveAnnouncement(item, "draft");
      await renderList();
      showNotice("Draft saved.", "success");
      resetForm();
    } catch (error) {
      showNotice(error.message || "Could not save draft.", "error");
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const item = readForm("publish");

    if (!item.title.trim() || !item.body.trim()) {
      showNotice("Title and message are required.", "error");
      return;
    }

    if (item.publishAt && item.expiresAt && new Date(item.publishAt).getTime() > new Date(item.expiresAt).getTime()) {
      showNotice("Publish date must come before the expiry date.", "error");
      return;
    }

    try {
      const saved = await api.saveAnnouncement(item, "publish");
      await renderList();

      if (saved.status === "scheduled") {
        showNotice("Announcement scheduled successfully.", "success");
      } else {
        showNotice("Announcement published successfully.", "success");
      }

      resetForm();
    } catch (error) {
      showNotice(error.message || "Could not publish announcement.", "error");
    }
  });

  clearFormButton.addEventListener("click", function () {
    resetForm();
  });

  newAnnouncementButton.addEventListener("click", function () {
    resetForm();
    fields.title.focus();
  });

  listEl.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    const item = findAnnouncement(id);

    if (!item) {
      showNotice("This announcement is no longer available.", "error");
      return;
    }

    if (action === "edit") {
      populateForm(item);
      fields.title.focus();
      return;
    }

    try {
      if (action === "publish") {
        await api.saveAnnouncement(item, "publish");
        await renderList();
        showNotice("Announcement published.", "success");
        return;
      }

      if (action === "archive") {
        await api.saveAnnouncement(item, "archive");
        await renderList();
        showNotice("Announcement archived.", "success");
        resetForm();
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this announcement?")) {
          return;
        }

        await api.deleteAnnouncement(item.id);
        await renderList();
        showNotice("Announcement deleted.", "success");
        resetForm();
      }
    } catch (error) {
      showNotice(error.message || "Action failed.", "error");
    }
  });

  if (!api.isConfigured()) {
    setSignedInUI(false);
    setAuthStatus("Supabase config is missing. Update supabase-config.js first.", true);
    return;
  }

  unsubscribeAuthListener = api.onAuthStateChange(function (session) {
    currentUser = session ? session.user : null;
    setSignedInUI(Boolean(currentUser));
    if (currentUser) {
      renderList();
    }
  });

  window.addEventListener("beforeunload", function () {
    unsubscribeAuthListener();
  });

  resetForm();
  refreshSession();
})();
