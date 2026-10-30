async function apiRequest(path, options = {}) {
  const session = (await sb.auth.getSession()).data.session;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(`${APP_CONFIG.API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.message || "Não foi possível concluir a operação.");
  return body;
}
function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
