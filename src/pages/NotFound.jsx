import { Link } from "react-router-dom";
import { usePageMeta } from "@/lib/use-page-meta";

const pageMeta = [
  { title: "Page not found — SHARKS Clinic" },
  { name: "robots", content: "noindex" },
];

export default function NotFound() {
  usePageMeta(pageMeta);
  return (
    <div className="status-page">
      <div className="status-card">
        <h1 className="status-code">404</h1>
        <h2>Page not found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="status-actions">
          <Link to="/" className="button button-primary">Go home</Link>
        </div>
      </div>
    </div>
  );
}
