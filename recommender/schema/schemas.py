from pydantic import BaseModel, field_validator
from typing import List
from datetime import date

class EventRecommendation(BaseModel):
    title: str
    url: str
    image: str
    start_date: date
    end_date: date
    location: str
    tags: List[str]
    price: str

    @field_validator("tags", mode="before")
    def parse_tags(cls, v):
        if isinstance(v, str):
            v = v.strip("{} ")
            return [tag.strip() for tag in v.split(",")]
        return v
