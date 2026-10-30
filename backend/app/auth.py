import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings

bearer = HTTPBearer(auto_error=False)

async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")
    token = credentials.credentials
    # Confere o token diretamente com o endpoint oficial do Supabase Auth.
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token}"
            }
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return response.json()
