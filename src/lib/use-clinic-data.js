import { useCallback, useEffect, useState } from "react";
import { addRow, getAll, getSettings, removeRow, saveSettings, updateRow, } from "./clinic-db";
/** Reads a collection from the browser store after mount and keeps it in state. */
export function useCollection(key) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(() => {
    setRows(getAll(key));
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const add = useCallback((row) => {
    addRow(key, row);
    refresh();
  }, [key, refresh]);
  const update = useCallback((id, changes) => {
    updateRow(key, id, changes);
    refresh();
  }, [key, refresh]);
  const remove = useCallback((id) => {
    removeRow(key, id);
    refresh();
  }, [key, refresh]);
  return { rows, loaded, refresh, add, update, remove };
}
export function useSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    setSettings(getSettings());
  }, []);
  const save = useCallback((changes) => {
    setSettings(saveSettings(changes));
  }, []);
  return { settings, save };
}
