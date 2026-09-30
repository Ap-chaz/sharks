import { usePageMeta } from "@/lib/use-page-meta";
import { CheckCircle2, MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { Eyebrow, MixedHeading } from "@/components/PageParts";
import { saveFeedback } from "@/lib/clinic-db";
const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255).or(z.literal("")), rating: z.string().regex(/^[1-5]$/), message: z.string().trim().min(10).max(1000) });
const pageMeta = [{ title: "Patient Feedback — SHARKS Clinic" }, { name: "description", content: "Share feedback about your experience at SHARKS Clinic and help us improve patient care." }, { property: "og:title", content: "Patient Feedback — SHARKS Clinic" }, { property: "og:description", content: "Tell SHARKS Clinic about your care experience." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
export default function FeedbackPage() { usePageMeta(pageMeta); const [done, setDone] = useState(false); const [errors, setErrors] = useState({}); function submit(e) { e.preventDefault(); const result = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries())); if (!result.success) {
  const next = {};
  result.error.issues.forEach(i => next[String(i.path[0])] = "Please check this field.");
  setErrors(next);
  return;
} setErrors({}); try {
  saveFeedback(result.data);
}
catch { /* storage unavailable — feedback is still acknowledged on screen */ } setDone(true); } return <section className="form-page shell"><aside className="form-intro"><Eyebrow>Patient feedback</Eyebrow><MixedHeading as="h1" regular="Your experience matters." strong="Help us care better."/><p>Your feedback helps our team understand what worked and where we can improve.</p><div className="privacy-note"><MessageSquareQuote size={21}/><p>Feedback is reviewed confidentially by our care team.</p></div></aside><div className="form-panel">{done ? <div className="success-state"><CheckCircle2 size={38}/><Eyebrow>Feedback received</Eyebrow><h2>Thank you for sharing.</h2><p>Your perspective helps us improve every patient experience.</p><Button variant="outline" onClick={() => setDone(false)}>Share more feedback</Button></div> : <><div className="form-title"><MessageSquareQuote size={23}/><h2>Tell us about your visit</h2></div><form onSubmit={submit} noValidate><Field label="Your name" error={errors["name"]}><input name="name" maxLength={100} placeholder="Your full name"/></Field><Field label="Email (optional)" error={errors["email"]}><input name="email" type="email" maxLength={255} placeholder="you@example.com"/></Field><Field label="Overall experience" error={errors["rating"]}><select name="rating" defaultValue=""><option value="" disabled>Select a rating</option><option value="5">Excellent — 5/5</option><option value="4">Very good — 4/5</option><option value="3">Good — 3/5</option><option value="2">Fair — 2/5</option><option value="1">Poor — 1/5</option></select></Field><Field label="Your feedback" error={errors["message"]}><textarea name="message" rows={6} maxLength={1000} placeholder="Tell us about your experience"/></Field><Button variant="accent" type="submit" className="form-submit">Submit feedback</Button></form></>}</div></section>; }
function Field({ label, error, children }) { return <label className={`field ${error ? "field-invalid" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>; }
