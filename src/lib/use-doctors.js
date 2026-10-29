import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Backend doctor -> row shown in the table. */
export function toRow(d) {
  return {
    id: d.id,
    name: d.fullName,
    login: d.username ?? "No login",
    isDefault: d.isDefault,
    defaultLabel: d.isDefault ? "Default" : "-",
    status: d.isActive ? "Active" : "Inactive",
  };
}

export function useDoctors() {
  const [rows, setRows] = useState([]);
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
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
