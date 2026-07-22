from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class PatientFields(BaseModel):
    RIDAGEYR: float = Field(..., ge=1, le=120)
    RIAGENDR: float = Field(..., ge=1, le=2)
    DR1TSUGR: float = Field(..., ge=0, le=500)
    DR1TCARB: float = Field(..., ge=0, le=1000)
    DR1TTFAT: float = Field(..., ge=0, le=500)
    DR1TKCAL: float = Field(..., ge=0, le=10000)
    DR1TCALC: float = Field(..., ge=0, le=5000)
    DR1TPHOS: float = Field(..., ge=0, le=5000)
    DR1TSFAT: float = Field(..., ge=0, le=300)
    SMD650: float = Field(0, ge=0, le=100)
    SMQ040: float = Field(..., ge=1, le=3)
    SMD030: float = Field(0, ge=0, le=120)
    DBD895: float = Field(..., ge=0, le=21)
    DBD900: float = Field(..., ge=0, le=21)
    DBD905: float = Field(..., ge=0, le=21)
    DBD910: float = Field(..., ge=0, le=21)

    @model_validator(mode="after")
    def validate_smoking_fields(self):
        if self.SMQ040 in (1, 2) and self.SMD030 and self.SMD030 > self.RIDAGEYR:
            raise ValueError("Smoking start age cannot be greater than current age")
        if self.SMQ040 == 3:
            self.SMD650 = 0
            self.SMD030 = 0
        return self


class PatientInput(PatientFields):
    pass


def _strip_food_name(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Food name cannot be empty")
    return cleaned


class FoodInput(BaseModel):
    food_name: str = Field(..., min_length=1, max_length=120)
    portion_g: Optional[float] = Field(None, ge=1, le=2000)  # user-supplied or AI-estimated portion in grams

    @field_validator("food_name")
    @classmethod
    def strip_food_name(cls, value: str) -> str:
        return _strip_food_name(value)


class BarcodeInput(BaseModel):
    barcode: str = Field(..., pattern=r"^\d{8,14}$")  # EAN-13, UPC-A, UPC-E etc.
    portion_g: Optional[float] = Field(None, ge=1, le=2000)  # user override; falls back to serving size on label


class CombinedInput(PatientFields):
    food_name: str = Field(..., min_length=1, max_length=120)
    portion_g: Optional[float] = Field(None, ge=1, le=2000)

    @field_validator("food_name")
    @classmethod
    def strip_food_name(cls, value: str) -> str:
        return _strip_food_name(value)
