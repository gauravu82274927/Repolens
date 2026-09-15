export function buildRepositoryContext(files) {
  return files
    .map((file) => {
      return `
FILE: ${file.path}
--------------------------------
${file.content}
`;
    })
    .join("\n\n");
}