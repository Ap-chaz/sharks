import { Activity, Baby, Bone, FlaskConical, HeartPulse, ShieldPlus, Smile, Stethoscope } from "lucide-react";
export const services = [
  { title: "General Consultation", category: "Clinical", description: "Professional diagnosis, treatment and preventive care for patients of all ages.", Icon: Stethoscope },
  { title: "Cardiology", category: "Specialist", description: "Comprehensive heart assessments, monitoring and specialist-led cardiac care.", Icon: HeartPulse },
  { title: "Emergency Care", category: "24 / 7", description: "Prompt, dependable medical attention when every minute matters.", Icon: ShieldPlus },
  { title: "Pediatrics", category: "Children", description: "Gentle, attentive healthcare supporting children through every stage of growth.", Icon: Baby },
  { title: "Dental Care", category: "Oral health", description: "Preventive and restorative dental services for confident, healthy smiles.", Icon: Smile },
  { title: "Orthopedics", category: "Mobility", description: "Assessment and treatment for bone, joint, muscle and movement concerns.", Icon: Bone },
  { title: "Laboratory Services", category: "Diagnostics", description: "Reliable testing and timely results that help guide your treatment plan.", Icon: FlaskConical },
  { title: "Dermatology", category: "Specialist", description: "Expert assessment and treatment for a wide range of skin conditions.", Icon: Activity },
];

/* ---- Content used by the shared page sections. Edit freely; these are placeholders to confirm. ---- */

export const clinicInfo = {
  phone: "+254 722 405 988",
  phoneHref: "tel:+254722405988",
  email: "hello@sharksclinic.com",
  address: "Nairobi, Kenya",
  mapQuery: "Nairobi, Kenya",
};

export const hours = [
  { day: "Monday – Friday", time: "08:00 – 17:00" },
  { day: "Saturday", time: "09:00 – 13:00" },
  { day: "Sunday", time: "Closed" },
  { day: "Emergency care", time: "Open 24 / 7", highlight: true },
];

export const processSteps = [
  { title: "Book online", copy: "Choose a department, date and time in under two minutes.", tone: "teal" },
  { title: "We confirm", copy: "Our team calls you to confirm the slot and answer questions.", tone: "coral" },
  { title: "Meet your doctor", copy: "A clear consultation, with time to ask and be heard.", tone: "amber" },
  { title: "Follow-up care", copy: "Prescriptions, lab results and check-ins handled in one place.", tone: "navy" },
];

export const healthTips = [
  { tag: "Heart health", title: "Know your numbers", copy: "Regular blood pressure and cholesterol checks catch problems years before symptoms appear.", tone: "coral" },
  { tag: "Children", title: "Keep vaccinations on schedule", copy: "Timely immunisation is one of the simplest ways to protect your child through early years.", tone: "teal" },
  { tag: "Everyday wellness", title: "Small habits, big difference", copy: "Hydration, movement and consistent sleep support almost every area of long-term health.", tone: "amber" },
];

export const insurers = ["SHA", "NHIF", "AAR", "Jubilee", "Britam", "M-Pesa", "Card", "Cash"];

export const faqs = [
  { q: "Do I need an appointment?", a: "Appointments are recommended so you are seen quickly, but emergency care is available without one, 24 hours a day." },
  { q: "How do I book a visit?", a: "Use the booking form on this site, call us, or message us on WhatsApp. Our team will contact you to confirm the time." },
  { q: "Which payment methods do you accept?", a: "We accept M-Pesa, card and cash, and work with a number of insurance providers. Ask the team to confirm your cover before your visit." },
  { q: "Can I get my laboratory results quickly?", a: "Most routine tests are processed on site. Your care team will let you know when to expect results and how to collect them." },
  { q: "Is my information kept confidential?", a: "Yes. Patient records and feedback are handled confidentially by our care team." },
];

export const doctors = [
  { name: "Dr. Jane Smith", role: "Diagnostic Medicine", days: "Mon, Wed, Fri", focus: "Diagnosis and preventive screening", tone: "teal" },
  { name: "Dr. Michael Brown", role: "General Practice", days: "Mon – Fri", focus: "Everyday care for all ages", tone: "coral" },
  { name: "Dr. Sarah Wilson", role: "Pediatrics", days: "Tue, Thu, Sat", focus: "Child health and development", tone: "amber" },
];

export const milestones = [
  { label: "Foundation", title: "A clinic built around people", copy: "SHARKS Clinic opens in Nairobi with a focus on accessible, compassionate care." },
  { label: "Growth", title: "More specialists, more services", copy: "Cardiology, pediatrics, dental, orthopedics and dermatology join general practice." },
  { label: "Diagnostics", title: "On-site laboratory", copy: "Reliable testing and timely results help guide treatment without leaving the building." },
  { label: "Today", title: "10K+ patients and counting", copy: "A trusted team with 24/7 emergency support and a 98% satisfaction rating." },
];

export const facilities = [
  { title: "Modern consultation rooms", copy: "Private, comfortable spaces designed for clear conversations.", tone: "teal" },
  { title: "Diagnostic laboratory", copy: "On-site testing with dependable turnaround times.", tone: "coral" },
  { title: "Emergency bay", copy: "Equipped and staffed around the clock.", tone: "amber" },
  { title: "Pharmacy support", copy: "Prescriptions handled with clear guidance on every dose.", tone: "navy" },
];
