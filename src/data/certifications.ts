// Certificates shown on About, Events and the related project page.
// Add the image to src/assets/images/content/ and the PDF to public/certificates/.
import type { ImageMetadata } from "astro";
import appBuildersHackathon2026 from "@/assets/images/content/appbuildersph-hackathon-2026-certificate.png";

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  /** "YYYY-MM", for sorting. */
  date: string;
  dateLabel: string;
  /** One line under the name: team, dates, place. */
  detail: string;
  image: ImageMetadata;
  imageAlt: string;
  /** Original PDF in public/. */
  pdf?: string;
  /** Public page where anyone can check the certificate. */
  verifyUrl?: string;
  /** How to check it on that page. */
  verifyHint?: string;
  /** Project id the certificate belongs to, if any. */
  project?: string;
};

export const CERTIFICATIONS: Certification[] = [
  {
    id: "appbuildersph-hackathon-2026",
    name: "Certificate of Participation, AppBuildersPH Hackathon 2026",
    issuer: "App Builders PH",
    date: "2026-10",
    dateLabel: "October 2026",
    detail: "Team Potato · October 9 to 10, 2026 · Cyberzone, SM Makati",
    image: appBuildersHackathon2026,
    imageAlt:
      "Certificate of Participation from App Builders PH certifying that Uriel Papa took part in the AppBuildersPH Hackathon 2026 as a member of Team Potato, October 9 to 10, 2026, at Cyberzone, SM Makati, signed by founder Bryl Lim",
    pdf: "/certificates/uriel-papa-appbuildersph-hackathon-2026-certificate.pdf",
    verifyUrl: "https://appbuildersph.com/hackathon/participants/",
    verifyHint: "Search for Uriel Papa on the participants page.",
    project: "tell-liora",
  },
];
