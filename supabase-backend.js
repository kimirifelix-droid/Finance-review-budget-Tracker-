(function () {
  const config = window.BUDGET_SUPABASE_CONFIG || {};
  const sessionKey = "budget-tracker-auth-session";
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || "") &&
    typeof config.anonKey === "string" &&
    config.anonKey.length > 20 &&
    !config.anonKey.includes("YOUR_");

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    } catch {
      return null;
    }
  }

  function storeSession(session) {
    if (session) {
      if (!session.expires_at && session.expires_in) {
        session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in);
      }
      sessionStorage.setItem(sessionKey, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(sessionKey);
    }
  }

  async function request(path, options, accessToken) {
    const headers = new Headers(options && options.headers ? options.headers : {});
    headers.set("apikey", config.anonKey);
    headers.set("Accept", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (options && options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${config.url}${path}`, {
      ...options,
      headers,
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? data.msg || data.message || data.error_description || data.error
          : data;
      const error = new Error(message || `Supabase request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    const refreshed = await request(
      "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      }
    );
    storeSession(refreshed);
    return refreshed;
  }

  async function requireSession() {
    if (!configured) throw new Error("Supabase is not configured.");
    let session = getSession();
    if (!session || !session.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (session.expires_at && session.expires_at < Date.now() / 1000 + 60) {
      try {
        session = await refreshSession(session);
      } catch (error) {
        storeSession(null);
        throw new Error(`Your session expired. Please sign in again. ${error.message}`);
      }
      if (!session || !session.access_token) {
        storeSession(null);
        throw new Error("Your session has expired. Please sign in again.");
      }
    }
    return session;
  }

  async function authorizedRequest(path, options) {
    const session = await requireSession();
    try {
      return await request(path, options, session.access_token);
    } catch (error) {
      if (error.status === 401) {
        storeSession(null);
        throw new Error("Your session is no longer valid. Please sign in again.");
      }
      throw error;
    }
  }

  function transactionPayload(item, userId) {
    return {
      user_id: userId,
      type: item.type,
      category: item.category,
      amount: Number(item.amount),
      date: item.date,
      description: item.description || "",
    };
  }

  const backend = {
    configured,
    async signIn(email, password) {
      const session = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeSession(session);
      return session;
    },
    async signUp(email, password) {
      const result = await request("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result && result.access_token) storeSession(result);
      return result;
    },
    async requestPasswordReset(email) {
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      return request(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    handlePasswordRecoveryLocation() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
      const type = hashParams.get("type") || queryParams.get("type");
      const errorDescription =
        hashParams.get("error_description") || queryParams.get("error_description");

      if (errorDescription) {
        window.history.replaceState({}, document.title, window.location.pathname);
        throw new Error(errorDescription.replace(/\+/g, " "));
      }

      if (accessToken && (type === "recovery" || refreshToken)) {
        const expiresIn = hashParams.get("expires_in") || queryParams.get("expires_in");
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn ? Number(expiresIn) : undefined,
        };
        if (session.expires_in) {
          session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
        }
        storeSession(session);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
      return false;
    },
    async updatePassword(password) {
      const session = await requireSession();
      await request(
        "/auth/v1/user",
        {
          method: "PUT",
          body: JSON.stringify({ password }),
        },
        session.access_token
      );
      storeSession(null);
    },
    async getUser() {
      const session = await requireSession();
      return request("/auth/v1/user", { method: "GET" }, session.access_token);
    },
    async getExistingSession() {
      const session = getSession();
      if (!session || !session.access_token) return null;
      return requireSession();
    },
    async signOut() {
      const session = getSession();
      try {
        if (session && session.access_token) {
          await request("/auth/v1/logout", { method: "POST" }, session.access_token);
        }
      } finally {
        storeSession(null);
      }
    },
    clearSession() {
      storeSession(null);
    },
    async loadTransactions() {
      return authorizedRequest(
        "/rest/v1/transactions?select=id,user_id,type,category,amount,date,description&order=date.desc",
        { method: "GET" }
      );
    },
    async insertTransaction(item, userId) {
      const rows = await authorizedRequest(
        "/rest/v1/transactions?select=id,user_id,type,category,amount,date,description",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(transactionPayload(item, userId)),
        }
      );
      if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== "object") {
        throw new Error(
          "Supabase did not return the saved transaction. Refresh the page to verify whether it was saved before trying again."
        );
      }
      return rows[0];
    },
    async insertTransactions(items, userId) {
      if (!items.length) return [];
      return authorizedRequest(
        "/rest/v1/transactions?select=id,user_id,type,category,amount,date,description",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(items.map((item) => transactionPayload(item, userId))),
        }
      );
    },
    async updateTransaction(item) {
      const rows = await authorizedRequest(
        `/rest/v1/transactions?id=eq.${encodeURIComponent(item.id)}&select=id,user_id,type,category,amount,date,description`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            type: item.type,
            category: item.category,
            amount: Number(item.amount),
            date: item.date,
            description: item.description || "",
          }),
        }
      );
      if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== "object") {
        throw new Error("Transaction was not updated or Supabase did not return the updated transaction.");
      }
      return rows[0];
    },
    async deleteTransaction(id) {
      await authorizedRequest(
        `/rest/v1/transactions?id=eq.${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
    async deleteAllTransactions(userId) {
      await authorizedRequest(
        `/rest/v1/transactions?user_id=eq.${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
    },
    async loadBudget(userId) {
      const rows = await authorizedRequest(
        `/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}&select=monthly_budget`,
        { method: "GET" }
      );
      return rows.length ? Number(rows[0].monthly_budget) : null;
    },
    async saveBudget(userId, monthlyBudget) {
      const rows = await authorizedRequest(
        "/rest/v1/user_settings?on_conflict=user_id",
        {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ user_id: userId, monthly_budget: monthlyBudget }),
        }
      );
      if (!rows || !rows.length) throw new Error("Budget was not saved.");
    },
  };

  window.budgetBackend = backend;
})();
