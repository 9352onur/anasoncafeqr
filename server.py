import json
import os
import time
from typing import Optional, List, Dict, Any
import requests
from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Anason Cafe Digital QR Menu API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MENU_FILE = os.path.join(DATA_DIR, "menu.json")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")
TRANSLATIONS_FILE = os.path.join(DATA_DIR, "translations.json")

# In-memory exchange rates cache
rates_cache = {
    "timestamp": 0,
    "rates": {
        "TRY": 1.0,
        "USD": 0.029,
        "EUR": 0.027,
        "GBP": 0.023
    }
}

def get_path(filepath: str, for_write: bool = False) -> str:
    if os.environ.get("VERCEL"):
        tmp_dir = "/tmp/data"
        os.makedirs(tmp_dir, exist_ok=True)
        fname = os.path.basename(filepath)
        tmp_path = os.path.join(tmp_dir, fname)
        if not os.path.exists(tmp_path) and os.path.exists(filepath):
            import shutil
            shutil.copyfile(filepath, tmp_path)
        return tmp_path
    return filepath

def load_json(filepath: str) -> dict:
    target = get_path(filepath, for_write=False)
    with open(target, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(filepath: str, data: dict):
    target = get_path(filepath, for_write=True)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class MenuItem(BaseModel):
    id: Optional[str] = None
    categoryId: str
    subcategory: Optional[str] = ""
    name: str
    name_en: Optional[str] = ""
    name_de: Optional[str] = ""
    name_ru: Optional[str] = ""
    name_ar: Optional[str] = ""
    description: Optional[str] = ""
    description_en: Optional[str] = ""
    price: Optional[str] = ""
    icons: Optional[List[str]] = []
    badge: Optional[str] = ""
    allergens: Optional[List[str]] = []
    image: Optional[str] = ""
    isAvailable: Optional[bool] = True
    isHookah: Optional[bool] = False

class PinVerify(BaseModel):
    pin: str

class PinChange(BaseModel):
    old_pin: str
    new_pin: str

class ItemActionPayload(BaseModel):
    item: Optional[MenuItem] = None
    pin: str

class DeleteItemPayload(BaseModel):
    pin: str

# API Routes
@app.get("/api/config")
def get_config():
    return load_json(CONFIG_FILE)

@app.get("/api/translations")
def get_translations():
    return load_json(TRANSLATIONS_FILE)

@app.get("/api/menu")
def get_menu():
    return load_json(MENU_FILE)

@app.get("/api/rates")
def get_rates():
    now = time.time()
    # Cache for 15 minutes
    if now - rates_cache["timestamp"] < 900 and rates_cache["rates"]:
        return {
            "base": "TRY",
            "rates": rates_cache["rates"],
            "cached": True,
            "last_updated": rates_cache["timestamp"]
        }
    
    # Try fetching fresh rates from open.er-api.com
    try:
        resp = requests.get("https://open.er-api.com/v6/latest/TRY", timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            all_rates = data.get("rates", {})
            fresh_rates = {
                "TRY": 1.0,
                "USD": round(all_rates.get("USD", 0.029), 5),
                "EUR": round(all_rates.get("EUR", 0.027), 5),
                "GBP": round(all_rates.get("GBP", 0.023), 5)
            }
            rates_cache["rates"] = fresh_rates
            rates_cache["timestamp"] = now
            return {
                "base": "TRY",
                "rates": fresh_rates,
                "cached": False,
                "last_updated": now
            }
    except Exception as e:
        print(f"Could not fetch online rates: {e}")
    
    # Fallback rates
    return {
        "base": "TRY",
        "rates": rates_cache["rates"],
        "cached": True,
        "fallback": True,
        "last_updated": rates_cache["timestamp"]
    }

# Admin Routes
@app.post("/api/admin/verify-pin")
def verify_pin(data: PinVerify):
    config = load_json(CONFIG_FILE)
    if data.pin == config.get("adminPin", "1923"):
        return {"status": "ok", "message": "PIN verified successfully"}
    raise HTTPException(status_code=401, detail="Geçersiz PIN Kodu!")

@app.post("/api/admin/change-pin")
def change_pin(data: PinChange):
    config = load_json(CONFIG_FILE)
    if data.old_pin != config.get("adminPin", "1923"):
        raise HTTPException(status_code=401, detail="Mevcut PIN hatalı!")
    if len(data.new_pin) < 4:
        raise HTTPException(status_code=400, detail="Yeni PIN en az 4 basamaklı olmalıdır!")
    
    config["adminPin"] = data.new_pin
    save_json(CONFIG_FILE, config)
    return {"status": "ok", "message": "PIN başarıyla güncellendi!"}

@app.post("/api/admin/item")
def add_item(payload: ItemActionPayload):
    config = load_json(CONFIG_FILE)
    if payload.pin != config.get("adminPin", "1923"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    
    if not payload.item:
        raise HTTPException(status_code=400, detail="Ürün bilgisi eksik")

    menu = load_json(MENU_FILE)
    new_id = f"custom-{int(time.time()*1000)}"
    item_dict = payload.item.dict()
    item_dict["id"] = new_id
    if not item_dict.get("image"):
        item_dict["image"] = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
    
    menu["items"].append(item_dict)
    save_json(MENU_FILE, menu)
    return {"status": "ok", "item": item_dict}

@app.put("/api/admin/item/{item_id}")
def update_item(item_id: str, payload: ItemActionPayload):
    config = load_json(CONFIG_FILE)
    if payload.pin != config.get("adminPin", "1923"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    
    if not payload.item:
        raise HTTPException(status_code=400, detail="Ürün bilgisi eksik")

    menu = load_json(MENU_FILE)
    found = False
    for i, it in enumerate(menu["items"]):
        if it["id"] == item_id:
            updated = payload.item.dict()
            updated["id"] = item_id
            menu["items"][i] = updated
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
    save_json(MENU_FILE, menu)
    return {"status": "ok", "message": "Ürün güncellendi"}

@app.delete("/api/admin/item/{item_id}")
def delete_item(item_id: str, payload: DeleteItemPayload):
    config = load_json(CONFIG_FILE)
    if payload.pin != config.get("adminPin", "1923"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
        
    menu = load_json(MENU_FILE)
    orig_len = len(menu["items"])
    menu["items"] = [it for it in menu["items"] if it["id"] != item_id]
    
    if len(menu["items"]) == orig_len:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
    save_json(MENU_FILE, menu)
    return {"status": "ok", "message": "Ürün başarıyla silindi"}

# Serve Frontend
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

@app.get("/admin")
def serve_admin():
    return FileResponse(os.path.join(BASE_DIR, "static", "admin.html"))

# Static Mount
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
