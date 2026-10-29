import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Backend doctor -> row shown in the table. */
export function toRow(d) {
  return {
    id: d.id,
    name: d.fullName,
    userId: d.userId ?? null,
    login: d.username ?? "No login",
    isDefault: d.isDefault,
    defaultLabel: d.isDefault ? "Default" : "-",
    isActive: d.isActive,
    status: d.isActive ? "Active" : "Inactive",
  };
}

export function useDoctors() {
  const [rows, setRows] = useState([]);
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/doctors");
      setRows(data.doctors.map(toRow));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    try {
      const staff = await api("/staff");
      setLogins(
        staff.staff
          .filter((s) => s.role === "doctor" && s.isActive)
          .map((s) => ({ id: s.id, label: s.username + " (" + s.fullName + ")" })),
      );
    } catch {
      setLogins([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** values: { fullName, userId } (userId may be null) */
  async function create(values) {
    await api("/doctors", {
      method: "POST",
      body: { fullName: String(values.fullName ?? "").trim(), userId: values.userId ?? null },
    });
    await reload();
  }

  /** values: { fullName, userId? } */
  async function update(id, values) {
    const body = { fullName: String(values.fullName ?? "").trim() };
    if (values.userId !== undefined) body.userId = values.userId;
    await api("/doctors/" + id, { method: "PATCH", body });
    await reload();
  }

  async function setActive(id, isActive) {
    await api("/doctors/" + id, { method: "PATCH", body: { isActive } });
    await reload();
  }

  return { rows, logins, loading, error, reload, create, update, setActive };
}
