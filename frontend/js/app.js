let currentCategory = "";
let editingId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = "login.html"; return; }
  document.getElementById("user-name").textContent = `${session.user.user_metadata?.nome || ""} ${session.user.user_metadata?.sobrenome || ""}`.trim() || "Estudante";
  document.getElementById("user-email").textContent = session.user.email || "";
  const initials = ((session.user.user_metadata?.nome || "M")[0] + (session.user.user_metadata?.sobrenome || "F")[0]).toUpperCase();
  document.getElementById("avatar").textContent = initials;
  applyTheme();
  loadAds();
  document.getElementById("search").addEventListener("input", debounce(loadAds, 350));
});

function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }
function applyTheme() {
  document.documentElement.dataset.theme = localStorage.getItem("mural-feb-theme") || "light";
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("mural-feb-theme", next); applyTheme();
}
function setCategory(category, label) {
  currentCategory = category;
  document.getElementById("feed-title").textContent = label;
  loadAds();
}
async function loadAds() {
  const feed = document.getElementById("feed");
  feed.innerHTML = '<div class="empty">Carregando anúncios...</div>';
  try {
    const params = new URLSearchParams({ page: "1", limit: "30" });
    if (currentCategory) params.set("categoria", currentCategory);
    const q = document.getElementById("search").value.trim();
    if (q) params.set("q", q);
    const data = await apiRequest(`/api/anuncios?${params}`);
    renderAds(data.items || [], feed);
  } catch (e) { feed.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`; }
}
function renderAds(items, feed) {
  if (!items.length) { feed.innerHTML = '<div class="empty">Nenhum anúncio encontrado. Que tal publicar o primeiro?</div>'; return; }
  feed.innerHTML = items.map(ad => {
    const owner = ad.profiles ? `${ad.profiles.nome || ""} ${ad.profiles.sobrenome || ""}`.trim() : "Estudante";
    const contacts = [];
    if (ad.whatsapp_contato) {
      const digits = ad.whatsapp_contato.replace(/\D/g, "");
      const international = digits.startsWith("55") ? digits : `55${digits}`;
      contacts.push(`<a class="contact" target="_blank" rel="noopener noreferrer" href="https://wa.me/${international}">WhatsApp</a>`);
    }
    if (ad.email_contato) contacts.push(`<a class="contact" href="mailto:${encodeURIComponent(ad.email_contato)}">E-mail</a>`);
    if (ad.telefone_contato) contacts.push(`<a class="contact" href="tel:${ad.telefone_contato.replace(/[^\d+]/g, "")}">Telefone</a>`);
    const category = { servico:"Serviço", aluguel:"Residência", classificados:"Classificados" }[ad.categoria] || ad.categoria;
    const kind = ad.tipo_publicacao === "oferta" ? "Oferece" : "Procura";
    const price = ad.preco != null ? `<strong>R$ ${Number(ad.preco).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong>` : "";
    return `<article class="ad-card">
      <button class="card-menu" title="Denunciar anúncio" onclick="openReport('${ad.id}')">⋯</button>
      <span class="pill">${category} · ${kind}</span>
      <h3>${escapeHtml(ad.titulo)}</h3>
      <p>${escapeHtml(ad.descricao)}</p>
      ${price}<div class="muted" style="font-size:.82rem;margin-top:10px">Por ${escapeHtml(owner)} · ${new Date(ad.criado_em).toLocaleDateString("pt-BR")}</div>
      <div class="card-actions">${contacts.length ? contacts.join("") : '<span class="muted">Sem contato público informado</span>'}</div>
    </article>`;
  }).join("");
}
function openModal(id = null) {
  editingId = id;
  document.getElementById("ad-modal").classList.add("open");
  document.getElementById("ad-form").reset();
  document.getElementById("modal-title").textContent = id ? "Editar publicação" : "Criar publicação";
  if (id) loadMyAd(id);
}
function closeModal() { document.getElementById("ad-modal").classList.remove("open"); editingId = null; }
async function loadMyAd(id) {
  try {
    const ads = await apiRequest("/api/anuncios/meus");
    const ad = ads.find(x => x.id === id);
    if (!ad) throw new Error("Anúncio não encontrado.");
    for (const key of ["titulo","descricao","categoria","tipo_publicacao","preco","whatsapp_contato","telefone_contato","email_contato"]) {
      const el = document.getElementById(key); if (el) el.value = ad[key] ?? "";
    }
  } catch (e) { showToast(e.message); closeModal(); }
}
async function saveAd(event) {
  event.preventDefault();
  const payload = {};
  for (const key of ["titulo","descricao","categoria","tipo_publicacao","whatsapp_contato","telefone_contato","email_contato"]) {
    payload[key] = document.getElementById(key).value.trim() || null;
  }
  const price = document.getElementById("preco").value;
  payload.preco = price === "" ? null : Number(price);
  try {
    await apiRequest(editingId ? `/api/anuncios/${editingId}` : "/api/anuncios", {
      method: editingId ? "PUT" : "POST", body: JSON.stringify(payload)
    });
    closeModal(); showToast("Publicação salva!"); loadAds();
  } catch (e) { showToast(e.message); }
}
async function showMyAds() {
  document.getElementById("feed-title").textContent = "Minhas publicações";
  const feed = document.getElementById("feed");
  try {
    const ads = await apiRequest("/api/anuncios/meus");
    feed.innerHTML = ads.length ? ads.map(ad => `<article class="ad-card">
      <span class="pill">${escapeHtml(ad.categoria)} · ${escapeHtml(ad.status)}</span>
      <h3>${escapeHtml(ad.titulo)}</h3><p>${escapeHtml(ad.descricao)}</p>
      <div class="card-actions">
        <button class="btn" onclick="openModal('${ad.id}')">Editar</button>
        <button class="btn danger" onclick="deleteAd('${ad.id}')">Excluir</button>
      </div></article>`).join("") : '<div class="empty">Você ainda não publicou anúncios.</div>';
  } catch (e) { feed.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`; }
}
async function deleteAd(id) {
  if (!confirm("Deseja realmente excluir esta publicação?")) return;
  try { await apiRequest(`/api/anuncios/${id}`, { method:"DELETE" }); showToast("Anúncio excluído."); showMyAds(); }
  catch(e) { showToast(e.message); }
}
function openReport(id) {
  document.getElementById("report-id").value = id;
  document.getElementById("report-modal").classList.add("open");
}
function closeReport() { document.getElementById("report-modal").classList.remove("open"); }
async function sendReport(event) {
  event.preventDefault();
  const payload = {
    anuncio_id: document.getElementById("report-id").value,
    motivo: document.getElementById("report-motivo").value,
    descricao: document.getElementById("report-descricao").value.trim() || null
  };
  try { await apiRequest("/api/denuncias", { method:"POST", body:JSON.stringify(payload) }); closeReport(); showToast("Denúncia enviada para análise."); loadAds(); }
  catch(e) { showToast(e.message); }
}
async function logout() { await sb.auth.signOut(); location.href = "login.html"; }
async function deleteAccount() {
  if (!confirm("A exclusão da conta é permanente. Deseja continuar?")) return;
  try { await apiRequest("/api/profiles/me", { method:"DELETE" }); await sb.auth.signOut(); location.href = "login.html"; }
  catch(e) { showToast(e.message); }
}
