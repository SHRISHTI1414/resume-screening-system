from pydantic import BaseModel


class ApiResponse[T](BaseModel):
    success: bool = True
    data: T


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


def ok[T](data: T) -> dict[str, object]:
    return {"success": True, "data": data}
