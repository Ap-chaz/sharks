import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const GENDER_LABEL = { female: "Female", male: "Male", other: "Other" };

function ageFrom(dateOfBirth) {
  if (!dateOfBirth) return "";
  const born = new Date(dateOfBirth + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : "";
}

/** Backend patient -> row shown in the table and form. */
export function toRow(p) {
  return {
    id: p.id,
    code: p.code,
    name: p.fullName,
    phone: p.phone,
    email: p.email || "",
    address: p.address || "",
    dateOfBirth: p.dateOfBirth || "",
    age: ageFrom(p.dateOfBirth),
    gender: p.gender ? GENDER_LABEL[p.gender] : "",
    status: p.isActive ? "Active" : "Inactive",
  };
}

/** Form values -> backend body. Empty fields become null. */
export function toBody(values) {
  const text = (v) => String(v ?? "").trim();
  return {
    fullName: text(values.name),
    phone: text(values.phone),
    email: text(values.email) || null,
    address: text(values.address) || null,
    dateOfBirth: text(values.dateOfBirth) || null,
    gender: text(values.gender).toLowerCase() || null,
  };
}

export function usePatients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/patients?includeInactive=1");
      setRows(data.patients.map(toRow));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(values) {
    await api("/patients", { method: "POST", body: toBody(values) });
    await reload();
  }

  /** Sends only the fields that changed. Returns false if nothing changed. */
  async function save(row, values) {
    const before = toBody(row);
    const after = toBody(values);
    const changes = {};
    for (const key of Object.keys(after)) {
      if (after[key] !== before[key]) changes[key] = after[key];
    }
    if (Object.keys(changes).length === 0) return false;
    await api("/patients/" + row.id, { method: "PATCH", body: changes });
    await reload();
    return true;
  }

  async function setActive(id, active) {
    await api("/patients/" + id, { method: "PATCH", body: { isActive: active } });
    await reload();
  }

  return { rows, loading, error, reload, create, save, setActive };
}
