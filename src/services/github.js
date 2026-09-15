export async function getRepository(owner, repo) {
  const response = await fetch(
    `http://localhost:3001/api/github/repository/${owner}/${repo}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not fetch repository");
  }

  return data;
}

export async function getRepositoryTree(owner, repo) {
  const response = await fetch(
    `http://localhost:3001/api/github/tree/${owner}/${repo}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not fetch repository files");
  }

  return data;
}

export async function getFileContent(owner, repo, file) {
  const response = await fetch(
    `http://localhost:3001/api/github/blob/${owner}/${repo}/${file.sha}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Could not fetch file: ${file.path}`
    );
  }

  if (!data.content) {
    throw new Error(`No content available for: ${file.path}`);
  }

  const binaryString = atob(data.content.replace(/\n/g, ""));

  const bytes = Uint8Array.from(binaryString, (char) =>
    char.charCodeAt(0)
  );

  const content = new TextDecoder().decode(bytes);

  return {
    path: file.path,
    content
  };
}

export async function getMultipleFileContents(owner, repo, files) {
  const results = await Promise.all(
    files.map((file) =>
      getFileContent(owner, repo, file)
    )
  );

  return results;
}