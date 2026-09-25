"""Exporta la base Access del taller (SSM-DB.accdb) a JSON para importarla en Firestore.

Uso (Windows, necesita el "Microsoft Access Driver (*.mdb, *.accdb)" de 64 bits):

    python -m venv .venv
    .venv\\Scripts\\pip install pyodbc
    .venv\\Scripts\\python tools\\access-export\\export_access.py [ruta.accdb] [salida.json]

Por defecto lee DB/SSM-DB.accdb y escribe DB/export/ssm-export.json (DB/ está en .gitignore:
contiene datos reales de clientes, nunca se sube al repo).

El script trabaja sobre una copia temporal para no bloquear ni modificar la base original.
La importación se hace desde la app web: Configuración > Importar historial de Access.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
import sys
import tempfile
from decimal import Decimal

import pyodbc

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_DB = os.path.join(REPO, "DB", "SSM-DB.accdb")
DEFAULT_OUT = os.path.join(REPO, "DB", "export", "ssm-export.json")

# Deben coincidir con GROUP_OPTIONS / PART_TYPES de la app web.
SERVICE_TYPES = {"especifico": "Especifico", "específico": "Especifico", "elemental": "Elemental",
                 "esencial": "Esencial", "general": "General"}
PART_TYPES = {"repuesto": "Repuesto", "recambio": "Repuesto", "consumible": "Consumible",
              "consumibles": "Consumible", "insumo": "Insumo", "insumos": "Insumo",
              "accesorio": "Accesorio", "herramienta": "Herramienta", "servicio": "Servicio"}

warnings: list[str] = []


def text(v) -> str:
    if v is None:
        return ""
    s = str(v).replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"[ \t]+", " ", s).strip()


def whole(v) -> int:
    if v is None:
        return 0
    return int(round(float(v)))


def id_str(v) -> str:
    """Cédula / teléfono guardados como Double en Access -> texto sin decimales."""
    if v is None:
        return ""
    return str(int(round(float(v))))


def iso(v) -> str:
    if v is None:
        return ""
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime("%Y-%m-%d")
    return text(v)[:10]


def money(v) -> int:
    if v is None:
        return 0
    return int(round(Decimal(v))) if isinstance(v, Decimal) else int(round(float(v)))


def rows(cur, sql: str) -> list[dict]:
    cur.execute(sql)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def service_type(raw: str, order_id: int) -> str:
    key = text(raw).lower()
    if key in SERVICE_TYPES:
        return SERVICE_TYPES[key]
    warnings.append(f"Misión {order_id}: tipo de servicio '{raw}' desconocido, se usa 'Especifico'")
    return "Especifico"


def part_type(raw: str, description: str, order_id: int) -> str:
    key = text(raw).lower()
    if key in PART_TYPES:
        return PART_TYPES[key]
    # En Access hay líneas con TIPO "1": son servicios de pintura o repuestos mal clasificados.
    guess = "Servicio" if description.lower().startswith("servicio") else "Repuesto"
    warnings.append(f"Misión {order_id}: recurso con tipo '{raw}' clasificado como '{guess}' ({description[:40]})")
    return guess


def export(db_path: str) -> dict:
    conn = pyodbc.connect(
        "Driver={Microsoft Access Driver (*.mdb, *.accdb)};" f"Dbq={db_path};ReadOnly=1;",
        autocommit=True,
    )
    cur = conn.cursor()

    clients = []
    for r in rows(cur, "SELECT * FROM [1_Clientes]"):
        cid = id_str(r["Cedula"])
        google = text(r["Google ID"]).lower()
        email = google if "@" in google else ""
        if google and not email:
            warnings.append(f"Cliente {cid}: 'Google ID' sin @ ({google}), no se usa como correo")
        clients.append({
            "id": cid,
            "name": re.sub(r"\s+", " ", f"{text(r['Nombre'])} {text(r['Apellido'])}").strip(),
            "phone": id_str(r["Telefono"]),
            "email": email,
            "instagram": text(r["Instagram"]),
            "birth_date": iso(r["Nacimiento"]),
            "gender": text(r["Genero"]),
            "profession": text(r["Profesion"]),
        })

    orders_raw = rows(cur, "SELECT * FROM [3_OrdenServicio] ORDER BY Id")
    detail_raw = rows(cur, "SELECT * FROM [4_DetalleOrden]")
    parts_raw = rows(cur, "SELECT * FROM [5_RepuestosOrden]")

    vehicles = []
    owner_by_plate: dict[str, str] = {}
    category_by_plate: dict[str, str] = {}
    for r in rows(cur, "SELECT * FROM [2_Vehiculos]"):
        plate = re.sub(r"[^0-9A-Z]", "", text(r["Placa"]).upper())
        owner_by_plate[plate] = id_str(r["Propietario"])
        category_by_plate[plate] = text(r["Categoria"]).upper()
        # Kilometraje más reciente registrado en sus órdenes (en Access el km vive en la orden).
        mine = [o for o in orders_raw if re.sub(r"[^0-9A-Z]", "", text(o["Vehiculo"]).upper()) == plate]
        mine.sort(key=lambda o: (o["Ingreso"] or dt.datetime.min, o["Id"]))
        km = whole(mine[-1]["Kilometraje"]) if mine else 0
        vehicles.append({
            "plate": plate,
            "brand": text(r["Marca"]),
            "line": text(r["Linea"]),
            "model": id_str(r["Modelo"]),
            "cc": id_str(r["Cilindraje"]),
            "category": category_by_plate[plate],
            "km": str(km) if km else "",
            "soat_date": iso(r["Vigencia SOAT"]),
            "tecno_date": iso(r["Vigencia Tecnicomecanica"]),
            "client_id": owner_by_plate[plate],
        })

    services = [{
        "item_code": str(r["ITEM"]),
        "section": text(r["SECCION"]),
        "description": text(r["DESCRIPCION"]),
        "cost_type": text(r["TIPO COSTO"]),
        "price": money(r["PRECIO"]),
        "service_group": text(r["GRUPO SERVICIO"]),
    } for r in rows(cur, "SELECT * FROM [0_Servicios] ORDER BY ITEM")]

    orders = []
    for o in orders_raw:
        oid = int(o["Id"])
        plate = re.sub(r"[^0-9A-Z]", "", text(o["Vehiculo"]).upper())
        lines = [{
            "item_code": str(d["ITEM"]),
            "section": text(d["SECCION"]),
            "description": text(d["DESCRIPCION"]),
            "quantity": whole(d["CANTIDAD"]),
            "price": money(d["PRECIO"]),
            "total": money(d["TOTAL"]),
        } for d in detail_raw if d["Orden"] == oid]
        parts = []
        for p in parts_raw:
            if p["Orden"] != oid:
                continue
            desc = text(p["DESCRIPCION"])
            parts.append({
                "type": part_type(p["TIPO"], desc, oid),
                "description": desc,
                "quantity": whole(p["CANTIDAD"]),
                "price": money(p["PRECIO"]),
                "total": money(p["TOTAL"]),
            })
        if text(o["Adjuntos"]):
            warnings.append(f"Misión {oid}: tiene adjuntos en Access que no se migran")
        orders.append({
            "number": oid,
            "status": text(o["Estado"]),
            "vehicle_plate": plate,
            "client_id": owner_by_plate.get(plate, ""),
            "service_type": service_type(o["Tipo Servicio"], oid),
            "entry_date": iso(o["Ingreso"]),
            "exit_date": iso(o["Salida"]),
            "km": whole(o["Kilometraje"]),
            "initial_notes": text(o["Observaciones Iniciales"]),
            "final_notes": text(o["Observaciones Finales"]),
            "discount_pct": whole(o["Porcentajedto"]),
            "vehicle_category": category_by_plate.get(plate, ""),
            "services": lines,
            "parts": parts,
            # Totales guardados en Access, solo para comparar: la app los recalcula.
            "access_totals": {
                "subtotal": money(o["Subtotal"]),
                "discount": money(o["Descuento"]),
                "services_total": money(o["Servicios"]),
                "parts_total": money(o["Repuestos"]),
                "total": money(o["Total"]),
            },
        })

    professions = sorted({c["profession"] for c in clients if c["profession"]})
    conn.close()

    return {
        "exported_at": dt.datetime.now().isoformat(timespec="seconds"),
        "source": os.path.basename(db_path),
        "clients": clients,
        "vehicles": vehicles,
        "services": services,
        "orders": orders,
        "professions": professions,
        "warnings": warnings,
    }


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    tmpdir = tempfile.mkdtemp(prefix="ssm-export-")
    try:
        copy = os.path.join(tmpdir, "copy.accdb")
        shutil.copyfile(src, copy)
        data = export(copy)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    print(f"Exportado a {out}")
    for key in ("clients", "vehicles", "services", "orders", "professions"):
        print(f"  {key}: {len(data[key])}")
    print(f"  líneas de servicio: {sum(len(o['services']) for o in data['orders'])}")
    print(f"  líneas de recursos: {sum(len(o['parts']) for o in data['orders'])}")
    print(f"  avisos: {len(data['warnings'])}")


if __name__ == "__main__":
    main()
