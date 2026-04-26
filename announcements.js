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

  const DEMO_ROWS = [
    {
      id: "95de6e80-a770-4f59-95fc-91669f00ce1d",
      title: "Campus Network Maintenance: Temporary Outage",
      body:
        "Please be advised that the school Wi-Fi network will be offline for mandatory security updates from 4:00 PM to 5:00 PM today.",
      category: "urgent",
      visibility: "public",
      priority: "urgent",
      status: "published",
      pinned: true,
      author_name: "AIS IT Team",
      publish_at: "2026-04-25T08:45:00.000Z",
      published_at: "2026-04-25T08:45:00.000Z",
      expires_at: null,
      archived_at: null
    },
    {
      id: "e59a4fdb-4820-4832-8ff6-f7e4cc8f4ca7",
      title: "Spring Arts Festival: Volunteers Needed",
      body:
        "We are looking for enthusiastic students and parents to help set up the gallery for our upcoming annual Arts Festival.",
      category: "general",
      visibility: "public",
      priority: "normal",
      status: "published",
      pinned: false,
      author_name: "Activities Office",
      publish_at: "2026-04-24T15:20:00.000Z",
      published_at: "2026-04-24T15:20:00.000Z",
      expires_at: null,
      archived_at: null
    },
    {
      id: "b3282518-c95d-4c07-8316-f8d8fd0cc8e8",
      title: "Library Books Return Deadline",
      body:
        "Final call for all semester 1 library books. Please ensure all borrowed items are returned to the Center by this Friday.",
      category: "students",
      visibility: "public",
      priority: "high",
      status: "published",
      pinned: false,
      author_name: "Learning Commons",
      publish_at: "2026-02-10T12:00:00.000Z",
      published_at: "2026-02-10T12:00:00.000Z",
      expires_at: null,
      archived_at: null
    },
    {
      id: "f753f70a-8728-4281-a330-31f94826b9c9",
      title: "Faculty Duty Rotation Update",
      body:
        "Please review the revised lunch and dismissal supervision coverage before tomorrow morning.",
      category: "staff",
      visibility: "staff",
      priority: "normal",
      status: "published",
      pinned: false,
      author_name: "Admin Office",
      publish_at: "2026-04-23T09:00:00.000Z",
      published_at: "2026-04-23T09:00:00.000Z",
      expires_at: null,
      archived_at: null
    }
  ];

  let cachedClient = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function feedRowToItem(row) {
    return {
      id: row.id || "",
      title: row.title || "",
      body: row.body || "",
      category: normalizeCategory(row.category),
      status: "published",
      visibility: "public",
      priority: normalizePriority(row.priority),
      pinned: Boolean(row.pinned),
      authorName: "AIS Staff",
      publishAt: row.published_at || "",
      publishedAt: row.published_at || "",
      expiresAt: row.expires_at || "",
      archivedAt: "",
      createdAt: row.published_at || "",
      updatedAt: row.published_at || ""
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

  async function registerStaff(email, password, fullName) {
    const client = requireClient();
    const signUpResult = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: (fullName || "").trim()
        }
      }
    });

    if (signUpResult.error) {
      return signUpResult;
    }

    const user = signUpResult.data && signUpResult.data.user ? signUpResult.data.user : null;
    if (!user) {
      return signUpResult;
    }

    // Best effort: create a pending staff profile. Activation remains admin-controlled.
    const profileResult = await client
      .from("staff_profiles")
      .upsert(
        {
          id: user.id,
          full_name: (fullName || "").trim() || "Staff User",
          email: user.email || email,
          staff_role: "staff",
          is_active: false
        },
        { onConflict: "id" }
      );

    if (profileResult.error) {
      signUpResult.profileError = profileResult.error;
    }

    return signUpResult;
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

  async function getPublicAnnouncements(category) {
    const client = requireClient();
    let query = client.from("public_announcements_feed").select("*");

    if (category && category !== "all") {
      query = query.eq("category", normalizeCategory(category));
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }

    return sortPublic((result.data || []).map(feedRowToItem));
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

  async function seedDemoData() {
    const client = requireClient();
    const user = await requireStaffUser();

    const countResult = await client
      .from("announcements")
      .select("id", { count: "exact", head: true });

    if (countResult.error) {
      throw countResult.error;
    }

    const count = countResult.count || 0;
    if (count > 0) {
      return {
        inserted: 0,
        skipped: true
      };
    }

    const rows = DEMO_ROWS.map(function (item) {
      return {
        id: item.id,
        title: item.title,
        body: item.body,
        category: item.category,
        status: item.status,
        visibility: item.visibility,
        priority: item.priority,
        pinned: item.pinned,
        author_name: item.author_name,
        publish_at: item.publish_at,
        published_at: item.published_at,
        expires_at: item.expires_at,
        archived_at: item.archived_at,
        created_by: user.id,
        updated_by: user.id
      };
    });

    const insertResult = await client
      .from("announcements")
      .insert(rows);

    if (insertResult.error) {
      throw insertResult.error;
    }

    return {
      inserted: rows.length,
      skipped: false
    };
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
    hydrateScheduledAnnouncements: hydrateScheduledAnnouncements,
    isConfigured: isConfigured,
    onAuthStateChange: onAuthStateChange,
    resetDemoData: seedDemoData,
    saveAnnouncement: saveAnnouncement,
    seedDemoData: seedDemoData,
    registerStaff: registerStaff,
    signIn: signIn,
    signOut: signOut,
    statusLabel: statusLabel,
    toDateValue: toDateValue,
    visibilityLabel: visibilityLabel
  };
})();
