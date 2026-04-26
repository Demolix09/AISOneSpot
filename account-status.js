(function () {
  const avatarEl = document.getElementById("account-status-avatar");
  const statusEl = document.getElementById("account-status-text");
  const buttonEl = document.getElementById("account-status-button");

  if (!avatarEl || !statusEl) {
    return;
  }

  const avatarFallback = avatarEl.getAttribute("src") || "assets/account-placeholder.svg";
  const pathName = window.location.pathname || "";
  const pageInSubfolder =
    pathName.indexOf("/admin/") >= 0 ||
    pathName.indexOf("/auth/") >= 0 ||
    pathName.indexOf("/events-update/") >= 0 ||
    pathName.indexOf("/google-schedule/") >= 0 ||
    pathName.indexOf("/after-school-programs/") >= 0 ||
    pathName.indexOf("/upcoming-news/") >= 0;
  const authPath = pageInSubfolder ? "../auth/index.html" : "auth/index.html";

  if (buttonEl) {
    buttonEl.addEventListener("click", function () {
      window.location.href = authPath;
    });
  }

  function setBadge(user) {
    const meta = user && user.user_metadata ? user.user_metadata : {};
    const name = meta.full_name || (user && user.email) || "Staff User";
    const avatarUrl =
      (meta.avatar_url || meta.picture || meta.photo_url) ||
      ("https://ui-avatars.com/api/?name=" +
        encodeURIComponent(name) +
        "&background=13226f&color=ffffff");

    avatarEl.src = user ? avatarUrl : avatarFallback;
    avatarEl.onerror = function () {
      avatarEl.src = avatarFallback;
    };

    statusEl.textContent = user ? "Logged in" : "Not logged in";
    statusEl.classList.toggle("is-logged-in", Boolean(user));
  }

  function isPlaceholder(value) {
    return (
      !value ||
      value.indexOf("YOUR_") === 0 ||
      value.indexOf("https://YOUR") === 0 ||
      value.indexOf("eyJYOUR") === 0
    );
  }

  setBadge(null);

  const config = window.AIS_SUPABASE_CONFIG || {};
  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function" ||
    !config.url ||
    !config.anonKey ||
    isPlaceholder(config.url) ||
    isPlaceholder(config.anonKey)
  ) {
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  client.auth.getSession().then(function (result) {
    const session = result && result.data ? result.data.session : null;
    setBadge(session ? session.user : null);
  });

  client.auth.onAuthStateChange(function (_event, session) {
    setBadge(session ? session.user : null);
  });
})();
