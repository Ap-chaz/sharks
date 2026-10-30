import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { hours as fallbackHours } from "@/lib/clinic-data";

const ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const NAMES = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const DASH = " \u2013 ";

function timeText(day) {
  return day ? day.open + DASH + day.close : "Closed";
}

/** Saved opening hours -> rows for the public site, grouping days that share the same hours. */
export function toRows(data) {
  const groups = [];
  for (const key of ORDER) {
    const text = timeText(data.days[key]);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.keys.push(key);
    else groups.push({ text, keys: [key] });
  }
  const rows = groups.map((g) => ({
    day:
      g.keys.length === 1
        ? NAMES[g.keys[0]]
        : NAMES[g.keys[0]] + DASH + NAMES[g.keys[g.keys.length - 1]],
    time: g.text,
  }));
  return [...rows, ...fallbackHours.filter((r) => r.highlight)];
}

/** Rows for the opening-hours lists. Shows the fixed text until the saved hours load (or if they cannot). */
export function useHoursRows() {
  const [rows, setRows] = useState(fallbackHours);
  useEffect(() => {
    let alive = true;
    api("/public/opening-hours")
      .then((data) => {
        if (alive && data && data.days) setRows(toRows(data));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return rows;
}
