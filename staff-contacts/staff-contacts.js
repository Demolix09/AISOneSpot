(function () {
  const api = window.AISAnnouncements;

  if (!api) {
    return;
  }

  const listEl = document.getElementById("staff-contacts-list");
  const emptyStateEl = document.getElementById("staff-contacts-empty");
  const searchInputEl = document.getElementById("staff-contact-search");
  const editorEl = document.getElementById("staff-contacts-editor");
  const formEl = document.getElementById("staff-contact-form");
  const noticeEl = document.getElementById("staff-contacts-notice");

  const fields = {
    id: document.getElementById("staff-contact-id"),
    name: document.getElementById("staff-contact-name"),
    role: document.getElementById("staff-contact-role"),
    email: document.getElementById("staff-contact-email")
  };

  const saveButton = document.getElementById("staff-contact-save-button");
  const clearButton = document.getElementById("staff-contact-clear-button");

  let allContacts = [];
  let currentSearch = "";
  let isBusy = false;
  let staffCanEdit = false;
  let unsubscribeAuthListener = function () {};
  let accessCheckIntervalId = null;

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function setBusy(nextBusy) {
    isBusy = nextBusy;
    if (saveButton) {
      saveButton.disabled = nextBusy || !staffCanEdit;
    }
    if (clearButton) {
      clearButton.disabled = nextBusy || !staffCanEdit;
    }
  }

  function showNotice(message, tone) {
    if (!noticeEl) {
      return;
    }

    noticeEl.textContent = message;
    noticeEl.className = "notice";
    noticeEl.classList.add(tone === "error" ? "notice-error" : "notice-success");
  }

  function clearNotice() {
    if (!noticeEl) {
      return;
    }

    noticeEl.textContent = "";
    noticeEl.className = "notice is-hidden";
  }

  function resetForm() {
    if (!fields.id) {
      return;
    }

    fields.id.value = "";
    fields.name.value = "";
    fields.role.value = "";
    fields.email.value = "";

    if (saveButton) {
      saveButton.textContent = "Save contact";
    }

    clearNotice();
  }

  function setEditorVisibility(allowed) {
    staffCanEdit = Boolean(allowed);
    if (editorEl) {
      editorEl.hidden = !staffCanEdit;
    }
    setBusy(false);
  }

  function contactMatchesSearch(contact, searchValue) {
    if (!searchValue) {
      return true;
    }

    const haystack = normalizeText(
      [contact.fullName, contact.roleTitle, contact.schoolEmail].join(" ")
    );

    return haystack.indexOf(searchValue) >= 0;
  }

  function renderContacts() {
    if (!listEl || !emptyStateEl) {
      return;
    }

    const search = normalizeText(currentSearch);
    const visibleContacts = allContacts.filter(function (contact) {
      return contactMatchesSearch(contact, search);
    });

    listEl.innerHTML = "";
    emptyStateEl.classList.toggle("is-hidden", visibleContacts.length > 0);

    visibleContacts.forEach(function (contact) {
      const card = document.createElement("article");
      card.className = "staff-contact-card";

      const safeName = api.escapeHtml(contact.fullName);
      const safeRole = api.escapeHtml(contact.roleTitle);
      const safeEmail = api.escapeHtml(contact.schoolEmail || "");
      const emailMarkup = safeEmail
        ? '<a class="staff-contact-email" href="mailto:' + safeEmail + '">' + safeEmail + "</a>"
        : '<span class="staff-contact-email-empty">Email not listed</span>';

      card.innerHTML =
        '<div class="staff-contact-main">' +
        '<h3 class="staff-contact-name">' + safeName + "</h3>" +
        '<p class="staff-contact-role">' + safeRole + "</p>" +
        '<div class="staff-contact-email-row">' + emailMarkup + "</div>" +
        "</div>" +
        (staffCanEdit
          ? '<div class="staff-contact-actions">' +
            '<button class="button button-secondary" type="button" data-action="edit" data-id="' + api.escapeHtml(contact.id) + '">Edit</button>' +
            '<button class="button button-secondary" type="button" data-action="delete" data-id="' + api.escapeHtml(contact.id) + '">Delete</button>' +
            "</div>"
          : "");

      listEl.appendChild(card);
    });
  }

  function populateForm(contact) {
    fields.id.value = contact.id || "";
    fields.name.value = contact.fullName || "";
    fields.role.value = contact.roleTitle || "";
    fields.email.value = contact.schoolEmail || "";

    if (saveButton) {
      saveButton.textContent = "Update contact";
    }

    clearNotice();
    fields.name.focus();
  }

  function findContact(id) {
    return allContacts.find(function (contact) {
      return contact.id === id;
    });
  }

  async function loadContacts() {
    if (!api.isConfigured()) {
      allContacts = [];
      renderContacts();
      return;
    }

    try {
      allContacts = await api.getStaffContacts();
      renderContacts();
    } catch (error) {
      allContacts = [];
      renderContacts();
      if (staffCanEdit) {
        showNotice(error.message || "Could not load staff contacts.", "error");
      }
    }
  }

  async function refreshStaffAccess() {
    if (!api.isConfigured()) {
      setEditorVisibility(false);
      return;
    }

    const access = await api.getStaffAccessStatus();
    setEditorVisibility(Boolean(access && access.allowed));
    renderContacts();
  }

  if (searchInputEl) {
    searchInputEl.addEventListener("input", function () {
      currentSearch = searchInputEl.value || "";
      renderContacts();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", function () {
      resetForm();
      fields.name.focus();
    });
  }

  if (formEl) {
    formEl.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!staffCanEdit) {
        showNotice("Active staff access is required to edit contacts.", "error");
        return;
      }

      const payload = {
        id: fields.id.value,
        fullName: fields.name.value,
        roleTitle: fields.role.value,
        schoolEmail: fields.email.value
      };

      if (!String(payload.fullName || "").trim()) {
        showNotice("Name is required.", "error");
        return;
      }

      if (!String(payload.roleTitle || "").trim()) {
        showNotice("Role is required.", "error");
        return;
      }

      setBusy(true);

      try {
        await api.saveStaffContact(payload);
        await loadContacts();
        resetForm();
        showNotice("Staff contact saved.", "success");
      } catch (error) {
        showNotice(error.message || "Could not save staff contact.", "error");
      } finally {
        setBusy(false);
      }
    });
  }

  if (listEl) {
    listEl.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-action]");
      if (!button || !staffCanEdit) {
        return;
      }

      const id = button.getAttribute("data-id");
      const action = button.getAttribute("data-action");
      const contact = findContact(id);

      if (!contact) {
        showNotice("This contact no longer exists.", "error");
        return;
      }

      if (action === "edit") {
        populateForm(contact);
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this staff contact?")) {
          return;
        }

        setBusy(true);
        try {
          await api.deleteStaffContact(contact.id);
          await loadContacts();
          resetForm();
          showNotice("Staff contact deleted.", "success");
        } catch (error) {
          showNotice(error.message || "Could not delete staff contact.", "error");
        } finally {
          setBusy(false);
        }
      }
    });
  }

  unsubscribeAuthListener = api.onAuthStateChange(function () {
    refreshStaffAccess();
    loadContacts();
  });

  window.addEventListener("beforeunload", function () {
    unsubscribeAuthListener();
    if (accessCheckIntervalId) {
      window.clearInterval(accessCheckIntervalId);
    }
  });

  resetForm();
  setEditorVisibility(false);
  loadContacts();
  refreshStaffAccess();

  accessCheckIntervalId = window.setInterval(function () {
    refreshStaffAccess();
  }, 15000);
})();
