(function () {
  const api = window.AISAnnouncements;

  if (!api) {
    return;
  }

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
  const publishButton = document.getElementById("publish-button");
  const saveDraftButton = document.getElementById("save-draft-button");
  const clearFormButton = document.getElementById("clear-form-button");
  const newAnnouncementButton = document.getElementById("new-announcement-button");
  const accountAvatarEl = document.getElementById("account-status-avatar");
  const accountStatusTextEl = document.getElementById("account-status-text");
  const avatarFallback = "../assets/account-placeholder.svg";

  let currentUser = null;
  let currentItems = [];
  let isBusy = false;
  let unsubscribeAuthListener = function () {};
  let accessCheckIntervalId = null;

  function redirectToAccessPage() {
    window.location.href = "../auth/index.html?next=" + encodeURIComponent("../admin/index.html");
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

  function setBusy(nextBusy) {
    isBusy = nextBusy;
    saveDraftButton.disabled = nextBusy;
    publishButton.disabled = nextBusy;
    clearFormButton.disabled = nextBusy;
    newAnnouncementButton.disabled = nextBusy;
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

  async function requireActiveStaffAccess() {
    if (typeof api.getStaffAccessStatus !== "function") {
      return true;
    }

    const access = await api.getStaffAccessStatus();
    if (!access || access.error || !access.user || !access.allowed) {
      updateAccountBadge(access && access.user ? access.user : null);
      redirectToAccessPage();
      return false;
    }

    currentUser = access.user;
    updateAccountBadge(currentUser);
    return true;
  }

  async function initializeSession() {
    if (!api.isConfigured()) {
      redirectToAccessPage();
      return false;
    }

    const sessionResult = await api.getSession();
    if (sessionResult.error || !sessionResult.user) {
      updateAccountBadge(null);
      redirectToAccessPage();
      return false;
    }

    currentUser = sessionResult.user;
    const hasAccess = await requireActiveStaffAccess();
    if (!hasAccess) {
      return false;
    }

    adminAppEl.hidden = false;
    await renderList();
    return true;
  }

  saveDraftButton.addEventListener("click", async function () {
    const item = readForm("draft");

    if (!item.title.trim() || !item.body.trim()) {
      showNotice("Title and message are required.", "error");
      return;
    }

    setBusy(true);
    try {
      await api.saveAnnouncement(item, "draft");
      await renderList();
      showNotice("Draft saved.", "success");
      resetForm();
    } catch (error) {
      showNotice(error.message || "Could not save draft.", "error");
    } finally {
      setBusy(false);
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

    setBusy(true);
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
    } finally {
      setBusy(false);
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

    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  });

  unsubscribeAuthListener = api.onAuthStateChange(function (session) {
    const user = session ? session.user : null;
    if (!user) {
      updateAccountBadge(null);
      redirectToAccessPage();
      return;
    }

    currentUser = user;
    requireActiveStaffAccess();
  });

  window.addEventListener("beforeunload", function () {
    unsubscribeAuthListener();
    if (accessCheckIntervalId) {
      window.clearInterval(accessCheckIntervalId);
    }
  });

  resetForm();
  updateAccountBadge(null);
  initializeSession();

  accessCheckIntervalId = window.setInterval(function () {
    requireActiveStaffAccess();
  }, 15000);
})();
