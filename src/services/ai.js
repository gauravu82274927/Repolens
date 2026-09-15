const MAX_FILE_CHARS = 4000;
const MAX_TOTAL_CHARS = 20000;

export function buildRepositoryContext(files) {
  let totalCharacters = 0;

  const selectedFiles = [];

  for (const file of files) {
    if (totalCharacters >= MAX_TOTAL_CHARS) {
      break;
    }

    const remainingCharacters =
      MAX_TOTAL_CHARS - totalCharacters;

    const allowedCharacters = Math.min(
      MAX_FILE_CHARS,
      remainingCharacters
    );

    const content = file.content.slice(
      0,
      allowedCharacters
    );

    selectedFiles.push(`
FILE: ${file.path}
--------------------------------
${content}
`);

    totalCharacters += content.length;
  }

  console.log(
    "AI context characters:",
    totalCharacters
  );

  return selectedFiles.join("\n\n");
}