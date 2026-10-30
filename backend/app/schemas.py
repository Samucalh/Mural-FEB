from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Literal

Categoria = Literal["servico", "aluguel", "classificados"]
TipoPublicacao = Literal["oferta", "procura"]
Motivo = Literal["falso_enganoso", "conteudo_inadequado", "contato_suspeito", "item_proibido", "spam", "outro"]

class AnuncioIn(BaseModel):
    titulo: str = Field(min_length=4, max_length=100)
    descricao: str = Field(min_length=10, max_length=2000)
    categoria: Categoria
    tipo_publicacao: TipoPublicacao
    preco: float | None = Field(default=None, ge=0, le=99999999)
    whatsapp_contato: str | None = Field(default=None, max_length=25)
    telefone_contato: str | None = Field(default=None, max_length=25)
    email_contato: EmailStr | None = None

    @field_validator("titulo", "descricao")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

class ProfileIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    sobrenome: str = Field(min_length=1, max_length=100)

class DenunciaIn(BaseModel):
    anuncio_id: str
    motivo: Motivo
    descricao: str | None = Field(default=None, max_length=1000)
