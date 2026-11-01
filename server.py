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

# PostgreSQL Database Integration (Prisma / Vercel Postgres)
DB_URL = (
    os.environ.get("DATABASE_URL_POOLED")
    or os.environ.get("DATABASE_URL")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("PRISMA_DATABASE_URL")
    or "postgres://fe82ebf21d8bd52874a7ba220403430d0edf2e2071988eec01d9a8f2ca38d831:sk_ZAeOWLan2V1B-w92KBbKT@pooled.db.prisma.io:5432/postgres?sslmode=require"
)

def get_db_connection():
    if not DB_URL:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(DB_URL, connect_timeout=5)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"PostgreSQL connection error: {e}")
        return None

def load_local_json(filepath: str) -> dict:
    if os.environ.get("VERCEL"):
        tmp_dir = "/tmp/data"
        os.makedirs(tmp_dir, exist_ok=True)
        fname = os.path.basename(filepath)
        tmp_path = os.path.join(tmp_dir, fname)
        if os.path.exists(tmp_path):
            with open(tmp_path, "r", encoding="utf-8") as f:
                return json.load(f)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_local_json(filepath: str, data: dict):
    target = filepath
    if os.environ.get("VERCEL"):
        tmp_dir = "/tmp/data"
        os.makedirs(tmp_dir, exist_ok=True)
        fname = os.path.basename(filepath)
        target = os.path.join(tmp_dir, fname)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_store(key: str, default_filepath: str) -> dict:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM cafe_store WHERE key = %s;", (key,))
                row = cur.fetchone()
                if row and row[0]:
                    val = row[0]
                    return val if isinstance(val, dict) else json.loads(val)
        except Exception as e:
            print(f"Error reading {key} from DB: {e}")
        finally:
            conn.close()
    return load_local_json(default_filepath)

def set_store(key: str, data: dict, default_filepath: str):
    # Update local file as cache/backup
    try:
        save_local_json(default_filepath, data)
    except Exception:
        pass

    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO cafe_store (key, data, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
                """, (key, json.dumps(data, ensure_ascii=False)))
        except Exception as e:
            print(f"Error saving {key} to DB: {e}")
        finally:
            conn.close()

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
    return get_store("config", CONFIG_FILE)

@app.get("/api/translations")
def get_translations():
    return get_store("translations", TRANSLATIONS_FILE)

@app.get("/api/menu")
def get_menu():
    return get_store("menu", MENU_FILE)

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
    config = get_store("config", CONFIG_FILE)
    if data.pin == config.get("adminPin", "9352"):
        return {"status": "ok", "message": "PIN verified successfully"}
    raise HTTPException(status_code=401, detail="Geçersiz PIN Kodu!")

@app.post("/api/admin/change-pin")
def change_pin(data: PinChange):
    config = get_store("config", CONFIG_FILE)
    if data.old_pin != config.get("adminPin", "9352"):
        raise HTTPException(status_code=401, detail="Mevcut PIN hatalı!")
    if len(data.new_pin) < 4:
        raise HTTPException(status_code=400, detail="Yeni PIN en az 4 basamaklı olmalıdır!")
    
    config["adminPin"] = data.new_pin
    set_store("config", config, CONFIG_FILE)
    return {"status": "ok", "message": "PIN başarıyla güncellendi!"}

@app.post("/api/admin/item")
def add_item(payload: ItemActionPayload):
    config = get_store("config", CONFIG_FILE)
    if payload.pin != config.get("adminPin", "9352"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    
    if not payload.item:
        raise HTTPException(status_code=400, detail="Ürün bilgisi eksik")

    menu = get_store("menu", MENU_FILE)
    new_id = f"custom-{int(time.time()*1000)}"
    item_dict = payload.item.dict()
    item_dict["id"] = new_id
    if not item_dict.get("image"):
        item_dict["image"] = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
    
    menu["items"].append(item_dict)
    set_store("menu", menu, MENU_FILE)
    return {"status": "ok", "item": item_dict}

@app.put("/api/admin/item/{item_id}")
def update_item(item_id: str, payload: ItemActionPayload):
    config = get_store("config", CONFIG_FILE)
    if payload.pin != config.get("adminPin", "9352"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    
    if not payload.item:
        raise HTTPException(status_code=400, detail="Ürün bilgisi eksik")

    menu = get_store("menu", MENU_FILE)
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
        
    set_store("menu", menu, MENU_FILE)
    return {"status": "ok", "message": "Ürün güncellendi"}

@app.delete("/api/admin/item/{item_id}")
def delete_item(item_id: str, payload: DeleteItemPayload):
    config = get_store("config", CONFIG_FILE)
    if payload.pin != config.get("adminPin", "9352"):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
        
    menu = get_store("menu", MENU_FILE)
    orig_len = len(menu["items"])
    menu["items"] = [it for it in menu["items"] if it["id"] != item_id]
    
    if len(menu["items"]) == orig_len:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
    set_store("menu", menu, MENU_FILE)
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
