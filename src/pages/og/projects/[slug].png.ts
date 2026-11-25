import type { APIRoute } from "astro";
import { getProjects, type Project } from "@/utils/content";
import { projectPhoto, renderOgImage, SITE_PHOTO } from "@/utils/og";

// A social image for each project page with the project's own cover screenshot.
export async function getStaticPaths() {
  const projects = await getProjects();
  return projects.map(project => ({
    params: { slug: project.id },
    props: { project },
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  const { project } = props as { project: Project };
  return renderOgImage({
    title: project.data.title,
    label: "Project case study",
    art: (await projectPhoto(project.filePath)) ?? SITE_PHOTO,
    url,
  });
};
