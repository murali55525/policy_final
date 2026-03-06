"""
Healthcare Data Module
In-memory patients and appointments store.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import uuid


# In-memory stores
patients_store: Dict[str, Dict[str, Any]] = {}
appointments_store: Dict[str, Dict[str, Any]] = {}



# ---- CRUD helpers ----

def list_patients() -> List[Dict[str, Any]]:
    return list(patients_store.values())


def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    return patients_store.get(patient_id)


def create_patient(data: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(uuid.uuid4())[:8]
    patient = {
        "id": pid,
        "name": data["name"],
        "age": data.get("age", 0),
        "gender": data.get("gender", ""),
        "blood_type": data.get("blood_type", ""),
        "condition": data.get("condition", ""),
        "department": data.get("department", "General"),
        "status": data.get("status", "active"),
        "admitted_at": datetime.now().isoformat(),
        "doctor": data.get("doctor", ""),
    }
    patients_store[pid] = patient
    return patient


def update_patient(patient_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if patient_id not in patients_store:
        return None
    patients_store[patient_id].update({k: v for k, v in data.items() if k != "id"})
    return patients_store[patient_id]


def delete_patient(patient_id: str) -> bool:
    if patient_id not in patients_store:
        return False
    del patients_store[patient_id]
    # Remove related appointments
    to_remove = [aid for aid, a in appointments_store.items() if a["patient_id"] == patient_id]
    for aid in to_remove:
        del appointments_store[aid]
    return True


def list_appointments(patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
    appts = list(appointments_store.values())
    if patient_id:
        appts = [a for a in appts if a["patient_id"] == patient_id]
    appts.sort(key=lambda a: a["date"], reverse=True)
    return appts


def get_appointment(appt_id: str) -> Optional[Dict[str, Any]]:
    return appointments_store.get(appt_id)


def create_appointment(data: Dict[str, Any]) -> Dict[str, Any]:
    aid = str(uuid.uuid4())[:8]
    patient = patients_store.get(data.get("patient_id", ""))
    appt = {
        "id": aid,
        "patient_id": data["patient_id"],
        "patient_name": patient["name"] if patient else data.get("patient_name", ""),
        "doctor": data.get("doctor", ""),
        "department": data.get("department", patient["department"] if patient else ""),
        "type": data.get("type", "Check-up"),
        "date": data.get("date", datetime.now().isoformat()),
        "status": data.get("status", "scheduled"),
        "notes": data.get("notes", ""),
    }
    appointments_store[aid] = appt
    return appt


def update_appointment(appt_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if appt_id not in appointments_store:
        return None
    appointments_store[appt_id].update({k: v for k, v in data.items() if k != "id"})
    return appointments_store[appt_id]


def delete_appointment(appt_id: str) -> bool:
    if appt_id not in appointments_store:
        return False
    del appointments_store[appt_id]
    return True


def get_healthcare_stats() -> Dict[str, Any]:
    now = datetime.now()
    patients = list(patients_store.values())
    appts = list(appointments_store.values())
    return {
        "total_patients": len(patients),
        "admitted": sum(1 for p in patients if p["status"] == "admitted"),
        "critical": sum(1 for p in patients if p["status"] == "critical"),
        "active": sum(1 for p in patients if p["status"] == "active"),
        "total_appointments": len(appts),
        "scheduled": sum(1 for a in appts if a["status"] == "scheduled"),
        "completed": sum(1 for a in appts if a["status"] == "completed"),
        "departments": list(set(p["department"] for p in patients)),
    }
