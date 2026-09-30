import { usePageMeta } from "@/lib/use-page-meta";
import doctorOne from "@/assets/clinic/thumbnail-5.jpeg";
import doctorTwo from "@/assets/clinic/thumbnail-2.jpeg";
import doctorThree from "@/assets/clinic/thumbnail-7.jpeg";
import { CtaBand, Eyebrow, MixedHeading, PageIntro } from "@/components/PageParts";
import { DepartmentTiles, DoctorCards, FaqList } from "@/components/Sections";

const pageMeta = [
  { title: "Our Doctors — SHARKS Clinic" },
  { name: "description", content: "Meet the SHARKS Clinic doctors and specialists caring for patients in Nairobi." },
  { property: "og:title", content: "Our Doctors — SHARKS Clinic" },
  { property: "og:type", content: "website" },
];

export default function DoctorsPage() {
  usePageMeta(pageMeta);
  return (
    <>
      <PageIntro eyebrow="Our team" regular="Doctors who listen." strong="Specialists who care." copy="Meet the clinicians behind SHARKS Clinic, and book directly with the doctor who fits your needs." />
      <section className="section shell">
        <div className="section-heading">
          <div>
            <Eyebrow>Clinical team</Eyebrow>
            <MixedHeading regular="Experienced," strong="approachable care." />
          </div>
          <p>Every doctor is committed to clear explanations and personalised treatment plans.</p>
        </div>
        <DoctorCards images={[doctorOne, doctorTwo, doctorThree]} />
      </section>
      <DepartmentTiles />
      <FaqList />
      <CtaBand regular="Find the right doctor." strong="Book in minutes." copy="Choose a time and our team will confirm your visit." />
    </>
  );
}
