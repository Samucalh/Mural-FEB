from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError
from .config import settings
from .db import supabase
from .auth import current_user
from .schemas import AnuncioIn, ProfileIn, DenunciaIn

app = FastAPI(title="Mural FEB API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
def health():
    return {"status": "ok", "app": "Mural FEB API"}

@app.get("/api/profiles/me")
def get_profile(user=Depends(current_user)):
    result = supabase.table("profiles").select("id,nome,sobrenome,criado_em").eq("id", user["id"]).single().execute()
    return result.data

@app.put("/api/profiles/me")
def update_profile(data: ProfileIn, user=Depends(current_user)):
    result = supabase.table("profiles").update(data.model_dump()).eq("id", user["id"]).execute()
    return result.data[0] if result.data else {}

@app.get("/api/anuncios")
def list_anuncios(
    categoria: str | None = None,
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=50)
):
    query = supabase.table("anuncios").select(
        "id,usuario_id,titulo,descricao,categoria,tipo_publicacao,preco,whatsapp_contato,telefone_contato,email_contato,criado_em,profiles(nome,sobrenome)"
    ).eq("status", "ativo").order("criado_em", desc=True)
    if categoria in ("servico", "aluguel", "classificados"):
        query = query.eq("categoria", categoria)
    if q:
        safe_q = q.replace("%", "").replace(",", " ")
        query = query.or_(f"titulo.ilike.%{safe_q}%,descricao.ilike.%{safe_q}%")
    start = (page - 1) * limit
    result = query.range(start, start + limit - 1).execute()
    return {"items": result.data, "page": page, "limit": limit}

@app.get("/api/anuncios/meus")
def my_anuncios(user=Depends(current_user)):
    result = supabase.table("anuncios").select("*").eq("usuario_id", user["id"]).order("criado_em", desc=True).execute()
    return result.data

@app.get("/api/anuncios/{anuncio_id}")
def get_anuncio(anuncio_id: str):
    result = supabase.table("anuncios").select(
        "id,usuario_id,titulo,descricao,categoria,tipo_publicacao,preco,whatsapp_contato,telefone_contato,email_contato,criado_em,profiles(nome,sobrenome)"
    ).eq("id", anuncio_id).eq("status", "ativo").maybe_single().execute()
    if not result.data:
        raise HTTPException(404, "Anúncio não encontrado.")
    return result.data

@app.post("/api/anuncios", status_code=201)
def create_anuncio(data: AnuncioIn, user=Depends(current_user)):
    payload = data.model_dump()
    payload["usuario_id"] = user["id"]
    result = supabase.table("anuncios").insert(payload).execute()
    return result.data[0]

@app.put("/api/anuncios/{anuncio_id}")
def update_anuncio(anuncio_id: str, data: AnuncioIn, user=Depends(current_user)):
    existing = supabase.table("anuncios").select("id,usuario_id").eq("id", anuncio_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Anúncio não encontrado.")
    if existing.data["usuario_id"] != user["id"]:
        raise HTTPException(403, "Você só pode editar seus próprios anúncios.")
    result = supabase.table("anuncios").update(data.model_dump()).eq("id", anuncio_id).execute()
    return result.data[0]

@app.delete("/api/anuncios/{anuncio_id}")
def delete_anuncio(anuncio_id: str, user=Depends(current_user)):
    existing = supabase.table("anuncios").select("id,usuario_id").eq("id", anuncio_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Anúncio não encontrado.")
    if existing.data["usuario_id"] != user["id"]:
        raise HTTPException(403, "Você só pode excluir seus próprios anúncios.")
    supabase.table("anuncios").delete().eq("id", anuncio_id).execute()
    return {"message": "Anúncio excluído."}

@app.post("/api/denuncias", status_code=201)
def report_anuncio(data: DenunciaIn, user=Depends(current_user)):
    try:
        result = supabase.rpc("registrar_denuncia", {
            "p_anuncio_id": data.anuncio_id,
            "p_usuario_id": user["id"],
            "p_motivo": data.motivo,
            "p_descricao": data.descricao
        }).execute()
        return {"message": "Denúncia registrada.", "total_denuncias": result.data}
    except APIError as exc:
        message = str(exc)
        if "unique" in message.lower() or "duplicate" in message.lower():
            raise HTTPException(409, "Você já denunciou este anúncio.")
        raise HTTPException(400, "Não foi possível registrar a denúncia.")

@app.get("/api/denuncias/me")
def my_reports(user=Depends(current_user)):
    result = supabase.table("denuncias").select("id,anuncio_id,motivo,status,criado_em").eq("usuario_id", user["id"]).order("criado_em", desc=True).execute()
    return result.data

@app.delete("/api/profiles/me")
def delete_account(user=Depends(current_user)):
    # A exclusão exige sessão válida. Em produção, considere exigir reautenticação recente.
    try:
        supabase.auth.admin.delete_user(user["id"])
    except Exception:
        raise HTTPException(400, "Não foi possível excluir a conta. Tente novamente ou contate o suporte.")
    return {"message": "Conta excluída."}
