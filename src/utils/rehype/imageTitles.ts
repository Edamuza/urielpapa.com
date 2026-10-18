type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

/** Gives every Markdown image a title from its alt text, so no image ships without one. */
export function rehypeImageTitles() {
  const walk = (node: Node) => {
    if (node.type === "element" && node.tagName === "img" && node.properties) {
      const { alt, title } = node.properties;
      if (!title && typeof alt === "string" && alt.trim()) {
        node.properties.title = alt;
      }
    }
    node.children?.forEach(walk);
  };
  return (tree: Node) => walk(tree);
}
