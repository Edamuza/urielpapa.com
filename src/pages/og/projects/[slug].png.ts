import type { APIRoute } from "astro";
import { getProjects, type Project } from "@/utils/content";
import { renderOgImage } from "@/utils/og";

// A social image for each project page, in the same style as the posts'.
export async function getStaticPaths() {
  const projects = await getProjects();
  return projects.map(project => ({
    params: { slug: project.id },
    props: { project },
  }));
}

export const GET: APIRoute = ({ props, url }) => {
  const { project } = props as { project: Project };
  return renderOgImage({
    title: project.data.title,
    label: "Project case study",
    url,
  });
};
