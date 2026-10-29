import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const ROLE_LABEL = {
  administrator: "Administrator",
  doctor: "Doctor",
  receptionist: "Receptionist",
  lab_technician: "Lab technician",
};

/** Backend staff member -> row shown in the table. */
export function toRow(s) {
  return {
    id: s.id,
    username: s.username,
    name: s.fullName,
    role: ROLE_LABEL[s.role] ?? s.role,
    rawRole: s.role,
    isActive: s.isActive,
    status: s.isActive ? "Active" : "Deactivated",
    lastLogin: s.lastLoginAt ? String(s.lastLoginAt).slice(0, 10) : "Never",
  };
}

export function useStaff() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/staff");
      setRows(data.staff.map(toRow));
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

  /** values: { username, fullName, role, password } */
  async function create(values) {
    await api("/staff", {
      method: "POST",
      body: {
        username: String(values.username ?? "").trim(),
        fullName: String(values.fullName ?? "").trim(),
        role: values.role,
        password: values.password,
      },
    });
    await reload();
  }

  /** values: { fullName, role } */
  async function update(id, values) {
    await api("/staff/" + id, {
      method: "PATCH",
      body: { fullName: String(values.fullName ?? "").trim(), role: values.role },
    });
    await reload();
  }

  async function setActive(id, isActive) {
    await api("/staff/" + id, { method: "PATCH", body: { isActive } });
    await reload();
  }

  async function resetPassword(id, password) {
    await api("/staff/" + id + "/reset-password", { method: "POST", body: { password } });
  }

  return { rows, loading, error, reload, create, update, setActive, resetPassword };
}
