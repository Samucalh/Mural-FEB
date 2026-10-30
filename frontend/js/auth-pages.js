function message(text, isError = false) {
  const el = document.getElementById("message");
  if (el) { el.textContent = text; el.className = isError ? "error notice" : "notice"; }
}
async function register(event) {
  event.preventDefault();
  const nome = document.getElementById("nome").value.trim();
  const sobrenome = document.getElementById("sobrenome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmacao = document.getElementById("confirmacao").value;
  if (senha.length < 8) return message("A senha precisa ter pelo menos 8 caracteres.", true);
  if (senha !== confirmacao) return message("As senhas não coincidem.", true);
  const { error } = await sb.auth.signUp({
    email, password: senha,
    options: { data: { nome, sobrenome }, emailRedirectTo: APP_CONFIG.SUPABASE_REDIRECT_URL }
  });
  if (error) return message(error.message, true);
  message("Cadastro enviado! Verifique seu e-mail para confirmar a conta. Depois, faça login.");
}
async function login(event) {
  event.preventDefault();
  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("senha").value
  });
  if (error) return message("E-mail ou senha inválidos. " + error.message, true);
  location.href = "index.html";
}
async function requestReset(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_CONFIG.SUPABASE_REDIRECT_URL });
  if (error) return message(error.message, true);
  message("Se o endereço estiver cadastrado, você receberá um e-mail com as instruções.");
}
async function updatePassword(event) {
  event.preventDefault();
  const senha = document.getElementById("senha").value;
  const confirmacao = document.getElementById("confirmacao").value;
  if (senha.length < 8 || senha !== confirmacao) return message("Confira se as senhas coincidem e possuem pelo menos 8 caracteres.", true);
  const { error } = await sb.auth.updateUser({ password: senha });
  if (error) return message(error.message, true);
  message("Senha atualizada. Você já pode acessar sua conta.");
}
