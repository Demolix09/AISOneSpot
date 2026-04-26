(function () {
  const api = window.AISAnnouncements;

  if (!api) {
    return;
  }

  const listEl = document.getElementById("public-announcements-list");
  const emptyEl = document.getElementById("public-announcements-empty");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const staffPanelEl = document.getElementById("staff-publishing-panel");
  let activeFilter = "all";
  let unsubscribeAuthListener = function () {};

  function priorityClass(priority) {
    if (priority === "urgent") return "urgent";
    if (priority === "high") return "events";
    return "general";
  }

  async function render(category) {
    activeFilter = category || "all";
    listEl.innerHTML = "";

    if (!api.isConfigured()) {
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent = "Announcements backend is not configured yet.";
      return;
    }

    try {
      const items = await api.getPublicAnnouncements(activeFilter);
      emptyEl.classList.toggle("is-hidden", items.length > 0);
      emptyEl.textContent = "No public announcements match this filter yet.";

      items.forEach(function (item) {
        const article = document.createElement("article");
        article.className = "announcement-card";
        article.setAttribute("data-category", item.category);

        article.innerHTML =
          '<div class="announcement-meta">' +
          api.escapeHtml(api.formatDateTime(item.publishedAt || item.publishAt)) +
          "</div>" +
          '<div class="tag-row">' +
          '<span class="tag ' + api.escapeHtml(item.category) + '">' +
          api.escapeHtml(api.categoryLabel(item.category)) +
          "</span>" +
          '<span class="tag ' + priorityClass(item.priority) + '">' +
          api.escapeHtml(item.priority) +
          "</span>" +
          (item.pinned ? '<span class="tag general">Pinned</span>' : "") +
          "</div>" +
          "<h3>" + api.escapeHtml(item.title) + "</h3>" +
          "<p>" + api.escapeHtml(item.body) + "</p>";

        listEl.appendChild(article);
      });
    } catch (error) {
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent = "Could not load announcements right now.";
    }
  }

  async function syncStaffPublishingPanel() {
    if (!staffPanelEl) {
      return;
    }

    staffPanelEl.hidden = true;

    if (!api.isConfigured() || typeof api.getStaffAccessStatus !== "function") {
      return;
    }

    try {
      const access = await api.getStaffAccessStatus();
      staffPanelEl.hidden = !Boolean(access && access.allowed);
    } catch (_error) {
      staffPanelEl.hidden = true;
    }
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const filter = button.getAttribute("data-filter") || "all";
      filterButtons.forEach(function (item) {
        item.classList.remove("is-active");
      });
      button.classList.add("is-active");
      render(filter);
    });
  });

  setInterval(function () {
    render(activeFilter);
    syncStaffPublishingPanel();
  }, 60000);

  setInterval(function () {
    syncStaffPublishingPanel();
  }, 15000);

  unsubscribeAuthListener = api.onAuthStateChange(function () {
    syncStaffPublishingPanel();
  });

  window.addEventListener("beforeunload", function () {
    unsubscribeAuthListener();
  });

  syncStaffPublishingPanel();
  render("all");
})();
