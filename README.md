# Mural FEB

MVP de mural de anúncios universitários com frontend HTML/CSS/JavaScript, API Python/FastAPI e Supabase (Auth + PostgreSQL).

## Estrutura

- `frontend/`: páginas e scripts do navegador.
- `backend/`: API FastAPI.
- `database/schema.sql`: tabelas, índices, RLS e função de denúncia.
- `.env.example`: variáveis de ambiente de referência.

## Requisitos

- Python 3.11+
- Projeto Supabase
- Conta Netlify (frontend) e Render (backend), para publicação

## 1. Configurar o Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `database/schema.sql`.
3. Em Authentication > URL Configuration, configure:
   - Site URL: URL final do site (ou `http://127.0.0.1:5500` durante testes).
   - Redirect URLs: `http://127.0.0.1:5500/reset-password.html` e a URL equivalente de produção.
4. Em Authentication > Providers > Email, mantenha Email habilitado. Para testes, configure SMTP/confirmacão conforme sua necessidade.
5. Copie Project URL, anon/publishable key e service_role/secret key. **A chave service_role fica somente no backend.**

O SQL deixa RLS habilitado e bloqueia acesso direto às tabelas pela API pública. As operações passam pela API FastAPI, que autentica o token e aplica autorização. A chave de serviço do backend tem privilégios elevados: nunca a coloque no frontend, GitHub ou em mensagens públicas.

## 2. Configurar o backend localmente

Entre na pasta `backend`:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
```

Copie `../.env.example` para `backend/.env` e preencha:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGINS`

Execute:

```bash
uvicorn app.main:app --reload
```

Documentação automática: `http://127.0.0.1:8000/docs`.

## 3. Executar o frontend

Sirva a pasta `frontend` com um servidor local. Exemplo usando a extensão Live Server do VS Code: abra `frontend/index.html` e selecione "Open with Live Server".

Edite `frontend/js/config.js`:
- `SUPABASE_URL`: URL do projeto.
- `SUPABASE_ANON_KEY`: chave pública anon/publishable.
- `API_BASE_URL`: `http://127.0.0.1:8000` localmente e URL do Render em produção.

Não abra os HTML diretamente com `file://`; use um servidor local.

## 4. Publicação

### Render
- Crie um Web Service conectado ao repositório.
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Configure as variáveis de ambiente listadas em `.env.example`.
- Em `FRONTEND_ORIGINS`, informe a URL exata do Netlify (e localhost apenas durante desenvolvimento).

### Netlify
- Publique a pasta `frontend`.
- Configure `config.js` com a URL do Supabase e a URL HTTPS do backend Render.
- Configure `SUPABASE_REDIRECT_URL` para a URL pública de `reset-password.html`.
- Se mudar o domínio, atualize também as Redirect URLs no Supabase.

## 5. Funcionalidades incluídas

- Cadastro, login, logout e recuperação/alteração de senha via Supabase Auth.
- Feed de anúncios, pesquisa e filtro por categoria.
- Criação, edição e exclusão dos próprios anúncios.
- Contatos com links `wa.me`, `mailto:` e `tel:`.
- Denúncia única por usuário/anúncio. Ao atingir 10 denúncias distintas, o anúncio fica `pendente_moderacao` e sai do feed público.
- Tema claro/escuro salvo localmente.
- Exclusão da conta pelo backend (remove o usuário Supabase; relações configuradas em cascata).

## 6. Limitações e cuidados antes de uso real

Este é um MVP inicial, não uma certificação de segurança nem parecer jurídico. Antes de abrir ao público:
- alinhe com a faculdade quem será o controlador dos dados e quem atenderá solicitações dos titulares;
- revise a política de privacidade com a instituição;
- configure SMTP confiável, HTTPS, backups, monitoramento e limites de requisição;
- implemente painel administrativo e fluxo real de análise de denúncias;
- avalie verificação de vínculo acadêmico (por exemplo, domínio institucional, se a faculdade aprovar);
- revise política de retenção e exclusão de denúncias e registros;
- faça testes de segurança e de autorização.

A chave `service_role` ignora RLS. Por isso, a API precisa manter validações de autenticação e autorização rigorosas. Não exponha essa chave.
