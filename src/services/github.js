export async function getRepository(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`
  );

  if (!response.ok) {
    throw new Error("Repository not found");
  }

  return response.json();
}

export async function getRepositoryTree(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
  );

  if (!response.ok) {
    throw new Error("Could not fetch repository files");
  }

  return response.json();
}

export async function getFileContent(owner, repo, path) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  );

  if (!response.ok) {
    throw new Error(`Could not fetch file: ${path}`);
  }

  const data = await response.json();

  if (data.type !== "file") {
    throw new Error(`${path} is not a file`);
  }

  const content = atob(data.content.replace(/\n/g, ""));

  return {
    path: data.path,
    content
  };
}