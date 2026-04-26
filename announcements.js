(function () {
  const CATEGORY_LABELS = {
    general: "General",
    students: "Students",
    staff: "Staff",
    urgent: "Urgent"
  };

  const STATUS_LABELS = {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Archived"
  };

  const VISIBILITY_LABELS = {
    public: "Public",
    staff: "Staff only"
  };
  const ALLOWED_REGISTRATION_DOMAINS = ["aiscr.org", "ais.ed.cr"];

  let cachedClient = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isAllowedRegistrationEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || normalizedEmail.indexOf("@") < 0) {
      return false;
    }

    const domain = normalizedEmail.split("@").pop();
    return ALLOWED_REGISTRATION_DOMAINS.indexOf(domain) >= 0;
  }

  function getConfig() {
    return window.AIS_SUPABASE_CONFIG || {};
  }

  function isPlaceholder(value) {
    return (
      !value ||
      value.indexOf("YOUR_") === 0 ||
      value.indexOf("https://YOUR") === 0 ||
      value.indexOf("eyJYOUR") === 0
    );
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey && !isPlaceholder(config.url) && !isPlaceholder(config.anonKey));
  }

  function initClient() {
    if (cachedClient) {
      return cachedClient;
    }

    if (!isConfigured()) {
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return null;
    }

    const config = getConfig();
    cachedClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    return cachedClient;
  }

  function requireClient() {
    const client = initClient();
    if (!client) {
      throw new Error("Supabase is not configured. Update supabase-config.js first.");
    }
    return client;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toDateValue(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function fromDateValue(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString();
  }

  function formatDateTime(value) {
    if (!value) {
      return "Not scheduled";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || category;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function visibilityLabel(visibility) {
    return VISIBILITY_LABELS[visibility] || visibility;
  }

  function normalizeCategory(value) {
    if (value === "general" || value === "students" || value === "staff" || value === "urgent") {
      return value;
    }
    return "general";
  }

  function normalizeStatus(value) {
    if (value === "draft" || value === "scheduled" || value === "published" || value === "archived") {
      return value;
    }
    return "draft";
  }

  function normalizeVisibility(value) {
    return value === "public" ? "public" : "staff";
  }

  function normalizePriority(value) {
    if (value === "normal" || value === "high" || value === "urgent") {
      return value;
    }
    return "normal";
  }

  function sortAdmin(items) {
    const rank = {
      draft: 0,
      scheduled: 1,
      published: 2,
      archived: 3
    };

    return items.sort(function (a, b) {
      const statusDiff = (rank[a.status] || 99) - (rank[b.status] || 99);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }

  function sortPublic(items) {
    return items.sort(function (a, b) {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      if (a.priority !== b.priority) {
        if (a.priority === "urgent") return -1;
        if (b.priority === "urgent") return 1;
        if (a.priority === "high") return -1;
        if (b.priority === "high") return 1;
      }

      return new Date(b.publishedAt || b.publishAt || b.createdAt).getTime() -
        new Date(a.publishedAt || a.publishAt || a.createdAt).getTime();
    });
  }

  function rowToItem(row) {
    return {
      id: row.id || "",
      title: row.title || "",
      body: row.body || "",
      category: normalizeCategory(row.category),
      status: normalizeStatus(row.status),
      visibility: normalizeVisibility(row.visibility),
      priority: normalizePriority(row.priority),
      pinned: Boolean(row.pinned),
      authorName: row.author_name || "AIS Staff",
      publishAt: row.publish_at || "",
      publishedAt: row.published_at || "",
      expiresAt: row.expires_at || "",
      archivedAt: row.archived_at || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function normalizeForm(input) {
    return {
      id: input.id || "",
      title: (input.title || "").trim(),
      body: (input.body || "").trim(),
      category: normalizeCategory(input.category),
      visibility: normalizeVisibility(input.visibility),
      priority: normalizePriority(input.priority),
      status: normalizeStatus(input.status),
      pinned: Boolean(input.pinned),
      authorName: (input.authorName || "").trim() || "AIS Staff",
      publishAt: input.publishAt || "",
      publishedAt: input.publishedAt || "",
      expiresAt: input.expiresAt || "",
      archivedAt: input.archivedAt || "",
      createdAt: input.createdAt || "",
      updatedAt: input.updatedAt || ""
    };
  }

  async function getSession() {
    try {
      const client = requireClient();
      const sessionResponse = await client.auth.getSession();
      return {
        session: sessionResponse.data.session,
        user: sessionResponse.data.session ? sessionResponse.data.session.user : null,
        error: sessionResponse.error || null
      };
    } catch (error) {
      return {
        session: null,
        user: null,
        error: error
      };
    }
  }

  async function requireStaffUser() {
    const sessionResult = await getSession();

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    if (!sessionResult.user) {
      throw new Error("You must sign in as staff to manage announcements.");
    }

    return sessionResult.user;
  }

  async function signIn(email, password) {
    const client = requireClient();
    return client.auth.signInWithPassword({
      email: email,
      password: password
    });
  }

  function buildEmailRedirectUrl() {
    try {
      if (!window || !window.location) {
        return null;
      }

      const protocol = String(window.location.protocol || "");
      if (protocol !== "http:" && protocol !== "https:") {
        return null;
      }

      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      url.pathname = url.pathname.replace(/\/auth\/index\.html$/i, "/auth/index.html");
      return url.toString();
    } catch (_error) {
      return null;
    }
  }

  async function registerStaff(email, password, fullName) {
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedRegistrationEmail(normalizedEmail)) {
      return {
        data: {
          user: null,
          session: null
        },
        error: new Error("Use your school email to register (@aiscr.org or @ais.ed.cr).")
      };
    }

    const client = requireClient();
    const emailRedirectTo = buildEmailRedirectUrl();
    const options = {
      data: {
        full_name: (fullName || "").trim()
      }
    };

    if (emailRedirectTo) {
      options.emailRedirectTo = emailRedirectTo;
    }

    const signUpResult = await client.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: options
    });

    return signUpResult;
  }

  async function verifyEmailCode(email, code) {
    const client = requireClient();
    const normalizedEmail = String(email || "").trim();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      return {
        data: null,
        error: new Error("Email and verification code are required.")
      };
    }

    // Prefer signup verification, then fallback to email OTP verification.
    let result = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "signup"
    });

    if (!result.error) {
      return result;
    }

    result = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "email"
    });

    return result;
  }

  async function resendVerificationCode(email) {
    const client = requireClient();
    const normalizedEmail = String(email || "").trim();

    if (!normalizedEmail) {
      return {
        data: null,
        error: new Error("Email is required.")
      };
    }

    const emailRedirectTo = buildEmailRedirectUrl();
    const params = {
      type: "signup",
      email: normalizedEmail
    };

    if (emailRedirectTo) {
      params.options = {
        emailRedirectTo: emailRedirectTo
      };
    }

    return client.auth.resend(params);
  }

  async function signOut() {
    const client = requireClient();
    return client.auth.signOut();
  }

  function onAuthStateChange(callback) {
    try {
      const client = requireClient();
      const listener = client.auth.onAuthStateChange(function (_event, session) {
        callback(session || null);
      });
      return function () {
        if (listener && listener.data && listener.data.subscription) {
          listener.data.subscription.unsubscribe();
        }
      };
    } catch (_error) {
      return function () {};
    }
  }

  async function getStaffAccessStatus() {
    const sessionResult = await getSession();

    if (sessionResult.error) {
      return {
        allowed: false,
        user: null,
        profile: null,
        error: sessionResult.error
      };
    }

    if (!sessionResult.user) {
      return {
        allowed: false,
        user: null,
        profile: null,
        error: null
      };
    }

    const client = requireClient();
    const profileResult = await client
      .from("staff_profiles")
      .select("id, staff_role, is_active")
      .eq("id", sessionResult.user.id)
      .maybeSingle();

    if (profileResult.error) {
      return {
        allowed: false,
        user: sessionResult.user,
        profile: null,
        error: profileResult.error
      };
    }

    const profile = profileResult.data || null;
    return {
      allowed: Boolean(profile && profile.is_active),
      user: sessionResult.user,
      profile: profile,
      error: null
    };
  }

  async function ensureStaffProfile() {
    const sessionResult = await getSession();
    if (sessionResult.error) {
      return {
        created: false,
        profile: null,
        error: sessionResult.error
      };
    }

    const user = sessionResult.user;
    if (!user) {
      return {
        created: false,
        profile: null,
        error: new Error("You must be signed in.")
      };
    }

    const access = await getStaffAccessStatus();
    if (access.profile) {
      return {
        created: false,
        profile: access.profile,
        error: null
      };
    }

    const client = requireClient();
    const fullName = (
      (user.user_metadata && user.user_metadata.full_name) ||
      (user.email ? user.email.split("@")[0] : "") ||
      "Staff User"
    ).trim();

    const insertResult = await client
      .from("staff_profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          email: user.email || null,
          staff_role: "staff",
          is_active: false
        },
        {
          onConflict: "id",
          ignoreDuplicates: true
        }
      );

    if (insertResult.error) {
      return {
        created: false,
        profile: null,
        error: insertResult.error
      };
    }

    const nextAccess = await getStaffAccessStatus();
    return {
      created: true,
      profile: nextAccess.profile || null,
      error: nextAccess.error || null
    };
  }

  async function getPublicAnnouncements(category) {
    const client = requireClient();
    let query = client
      .from("announcements")
      .select("id,title,body,category,priority,pinned,publish_at,published_at,expires_at,status,visibility")
      .eq("status", "published")
      .eq("visibility", "public");

    if (category && category !== "all") {
      query = query.eq("category", normalizeCategory(category));
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }

    return sortPublic((result.data || []).map(rowToItem));
  }

  async function getAdminAnnouncements() {
    const client = requireClient();

    const result = await client
      .from("announcements")
      .select("id,title,body,category,status,visibility,priority,pinned,author_name,publish_at,published_at,expires_at,archived_at,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    return sortAdmin((result.data || []).map(rowToItem));
  }

  async function findAnnouncementRow(id) {
    if (!id) {
      return null;
    }

    const client = requireClient();
    const result = await client
      .from("announcements")
      .select("id,title,body,category,status,visibility,priority,pinned,author_name,publish_at,published_at,expires_at,archived_at,created_at,updated_at,created_by")
      .eq("id", id)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  function buildPayload(normalized, intent, existing, userId, nowIso) {
    const payload = {
      title: normalized.title,
      body: normalized.body,
      category: normalizeCategory(normalized.category),
      visibility: normalizeVisibility(normalized.visibility),
      priority: normalizePriority(normalized.priority),
      pinned: Boolean(normalized.pinned),
      author_name: normalized.authorName || "AIS Staff",
      publish_at: normalized.publishAt || null,
      expires_at: normalized.expiresAt || null,
      updated_by: userId
    };

    if (intent === "publish") {
      const publishAt = payload.publish_at || nowIso;
      payload.publish_at = publishAt;

      if (new Date(publishAt).getTime() > Date.now()) {
        payload.status = "scheduled";
        payload.published_at = existing ? existing.published_at || null : null;
      } else {
        payload.status = "published";
        payload.published_at = existing && existing.published_at ? existing.published_at : nowIso;
      }

      payload.archived_at = null;
      return payload;
    }

    if (intent === "archive") {
      payload.status = "archived";
      payload.archived_at = nowIso;
      return payload;
    }

    payload.status = "draft";
    payload.archived_at = null;
    if (normalized.publishedAt) {
      payload.published_at = normalized.publishedAt;
    }
    return payload;
  }

  async function saveAnnouncement(input, intent) {
    const client = requireClient();
    const user = await requireStaffUser();
    const nowIso = new Date().toISOString();
    const normalized = normalizeForm(input);
    const existing = normalized.id ? await findAnnouncementRow(normalized.id) : null;
    const payload = buildPayload(normalized, intent, existing, user.id, nowIso);
    let result;

    if (existing) {
      result = await client
        .from("announcements")
        .update(payload)
        .eq("id", existing.id)
        .select("id,title,body,category,status,visibility,priority,pinned,author_name,publish_at,published_at,expires_at,archived_at,created_at,updated_at")
        .single();
    } else {
      payload.created_by = user.id;
      result = await client
        .from("announcements")
        .insert(payload)
        .select("id,title,body,category,status,visibility,priority,pinned,author_name,publish_at,published_at,expires_at,archived_at,created_at,updated_at")
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return rowToItem(result.data);
  }

  async function deleteAnnouncement(id) {
    if (!id) {
      return;
    }

    const client = requireClient();
    await requireStaffUser();

    const result = await client
      .from("announcements")
      .delete()
      .eq("id", id);

    if (result.error) {
      throw result.error;
    }
  }

  async function hydrateScheduledAnnouncements() {
    const client = requireClient();
    const sessionResult = await getSession();

    if (sessionResult.error || !sessionResult.user) {
      return 0;
    }

    const nowIso = new Date().toISOString();
    const scheduledResult = await client
      .from("announcements")
      .select("id,publish_at,published_at")
      .eq("status", "scheduled")
      .lte("publish_at", nowIso);

    if (scheduledResult.error) {
      throw scheduledResult.error;
    }

    const dueRows = scheduledResult.data || [];
    if (!dueRows.length) {
      return 0;
    }

    let updated = 0;

    for (let index = 0; index < dueRows.length; index += 1) {
      const row = dueRows[index];
      const updateResult = await client
        .from("announcements")
        .update({
          status: "published",
          published_at: row.published_at || row.publish_at || nowIso,
          updated_by: sessionResult.user.id
        })
        .eq("id", row.id);

      if (!updateResult.error) {
        updated += 1;
      }
    }

    return updated;
  }

  window.AISAnnouncements = {
    categoryLabel: categoryLabel,
    deleteAnnouncement: deleteAnnouncement,
    escapeHtml: escapeHtml,
    formatDateTime: formatDateTime,
    fromDateValue: fromDateValue,
    getAdminAnnouncements: getAdminAnnouncements,
    getPublicAnnouncements: getPublicAnnouncements,
    getSession: getSession,
    getStaffAccessStatus: getStaffAccessStatus,
    ensureStaffProfile: ensureStaffProfile,
    hydrateScheduledAnnouncements: hydrateScheduledAnnouncements,
    isConfigured: isConfigured,
    onAuthStateChange: onAuthStateChange,
    saveAnnouncement: saveAnnouncement,
    resendVerificationCode: resendVerificationCode,
    registerStaff: registerStaff,
    isAllowedRegistrationEmail: isAllowedRegistrationEmail,
    signIn: signIn,
    signOut: signOut,
    verifyEmailCode: verifyEmailCode,
    statusLabel: statusLabel,
    toDateValue: toDateValue,
    visibilityLabel: visibilityLabel
  };
})();
