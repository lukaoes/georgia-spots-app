// In local development this stays "/api" and Vite's dev server proxies it to the backend
// (see vite.config.ts). In production, set VITE_API_URL to your deployed backend's full URL
// (e.g. https://api.vanlife.ge or your Northflank service URL) at build time.
const API_BASE = (import.meta.env.VITE_API_URL || "") + "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "დაფიქსირდა შეცდომა");
  }
  return data;
}

export const api = {
  register: (name: string, username: string, email: string, password: string, agreed_pledge: boolean) =>
    fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password, agreed_pledge }),
    }).then(handle),

  login: (email: string, password: string) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  loginWithGoogle: (credential: string, agreed_pledge: boolean) =>
    fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, agreed_pledge }),
    }).then(handle),

  requestPasswordReset: (email: string, username: string, message: string) =>
    fetch(`${API_BASE}/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, message }),
    }).then(handle),

  getResetTokenInfo: (token: string) =>
    fetch(`${API_BASE}/auth/reset-password/${token}`).then(handle),
  submitNewPassword: (token: string, password: string) =>
    fetch(`${API_BASE}/auth/reset-password/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).then(handle),

  me: () => fetch(`${API_BASE}/auth/me`, { headers: { ...authHeaders() } }).then(handle),

  listPlaces: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, v);
    });
    return fetch(`${API_BASE}/places?${qs.toString()}`).then(handle);
  },

  getPlace: (id: string) => fetch(`${API_BASE}/places/${id}`, { headers: { ...authHeaders() } }).then(handle),

  createPlace: (body: any) =>
    fetch(`${API_BASE}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(handle),

  addReview: (placeId: string, body: any) =>
    fetch(`${API_BASE}/places/${placeId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(handle),

  reportPlace: (placeId: string, reason: string) =>
    fetch(`${API_BASE}/places/${placeId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(handle),

  // context: "place" | "review" | "avatar" - the backend watermarks place/review photos
  // (content people browse and could scrape) but skips it for avatars, since a profile
  // picture isn't the kind of content anyone's trying to lift.
  uploadPhotos: (files: File[], context: "place" | "review" | "avatar" = "place") => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    form.append("context", context);
    return fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    }).then(handle);
  },

  // profile
  myPlaces: () => fetch(`${API_BASE}/users/me/places`, { headers: { ...authHeaders() } }).then(handle),
  myFavorites: () => fetch(`${API_BASE}/users/me/favorites`, { headers: { ...authHeaders() } }).then(handle),
  myVisits: () => fetch(`${API_BASE}/users/me/visits`, { headers: { ...authHeaders() } }).then(handle),
  myStatusFor: (placeId: string) =>
    fetch(`${API_BASE}/users/me/status/${placeId}`, { headers: { ...authHeaders() } }).then(handle),
  addFavorite: (placeId: string) =>
    fetch(`${API_BASE}/users/me/favorites/${placeId}`, { method: "POST", headers: { ...authHeaders() } }).then(handle),
  removeFavorite: (placeId: string) =>
    fetch(`${API_BASE}/users/me/favorites/${placeId}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),
  markVisited: (placeId: string, visited_date?: string) =>
    fetch(`${API_BASE}/users/me/visits/${placeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ visited_date }),
    }).then(handle),
  unmarkVisited: (placeId: string) =>
    fetch(`${API_BASE}/users/me/visits/${placeId}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),

  // admin
  adminPlaces: (status: string) =>
    fetch(`${API_BASE}/admin/places?status=${status}`, { headers: { ...authHeaders() } }).then(handle),
  adminApprove: (id: string) =>
    fetch(`${API_BASE}/admin/places/${id}/approve`, { method: "POST", headers: { ...authHeaders() } }).then(handle),
  adminReject: (id: string, reason?: string) =>
    fetch(`${API_BASE}/admin/places/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(handle),
  adminRestore: (id: string) =>
    fetch(`${API_BASE}/admin/places/${id}/restore`, { method: "POST", headers: { ...authHeaders() } }).then(handle),
  adminDeletePlace: (id: string) =>
    fetch(`${API_BASE}/admin/places/${id}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),
  adminReports: () => fetch(`${API_BASE}/admin/reports`, { headers: { ...authHeaders() } }).then(handle),
  adminDismissReport: (id: string) =>
    fetch(`${API_BASE}/admin/reports/${id}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),
  adminUsers: (q?: string) =>
    fetch(`${API_BASE}/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { headers: { ...authHeaders() } }).then(handle),
  adminToggleAdmin: (id: string) =>
    fetch(`${API_BASE}/admin/users/${id}/toggle-admin`, { method: "POST", headers: { ...authHeaders() } }).then(handle),
  adminDeleteUser: (id: string) =>
    fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),
  adminResetPassword: (id: string) =>
    fetch(`${API_BASE}/admin/users/${id}/generate-reset-link`, { method: "POST", headers: { ...authHeaders() } }).then(handle),
  adminPasswordResetRequests: () =>
    fetch(`${API_BASE}/admin/password-reset-requests`, { headers: { ...authHeaders() } }).then(handle),
  adminDismissResetRequest: (id: string) =>
    fetch(`${API_BASE}/admin/password-reset-requests/${id}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),

  // place editing/deletion (owner or admin)
  updatePlace: (id: string, body: any) =>
    fetch(`${API_BASE}/places/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(handle),
  deletePlace: (id: string) =>
    fetch(`${API_BASE}/places/${id}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),
  deletePlacePhoto: (placeId: string, photoId: string) =>
    fetch(`${API_BASE}/places/${placeId}/photos/${photoId}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),

  // profile
  updateMyProfile: (body: any) =>
    fetch(`${API_BASE}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(handle),
  getPublicProfile: (username: string) =>
    fetch(`${API_BASE}/users/${username}/public`, { headers: { ...authHeaders() } }).then(handle),
};
