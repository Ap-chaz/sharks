import { useEffect } from "react";

/**
 * Applies a page's <title> and <meta> tags while the page is mounted.
 * Accepts the same shape the routes declare: [{ title }, { name, content }, { property, content }].
 * Tags added here are removed on unmount so pages never leak metadata into each other.
 */
export function usePageMeta(meta) {
  useEffect(() => {
    const previousTitle = document.title;
    const created = [];
    const restored = [];

    meta.forEach((entry) => {
      if (entry.title) {
        document.title = entry.title;
        return;
      }
      const attr = entry.name ? "name" : "property";
      const key = entry.name ?? entry.property;
      if (!key) return;

      let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (tag) {
        restored.push([tag, tag.getAttribute("content")]);
      } else {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
        created.push(tag);
      }
      tag.setAttribute("content", entry.content);
    });

    return () => {
      document.title = previousTitle;
      created.forEach((tag) => tag.remove());
      restored.forEach(([tag, content]) => tag.setAttribute("content", content ?? ""));
    };
  }, [meta]);
}
