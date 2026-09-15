const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

async function apiRequest(url, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}${url}`,
    options
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}

export async function getRepository(owner, repo) {
  return apiRequest(
    `/api/github/repository/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}`
  );
}

export async function getRepositoryTree(
  owner,
  repo
) {
  return apiRequest(
    `/api/github/tree/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}`
  );
}

export async function getFileContent(
  owner,
  repo,
  file
) {
  const data = await apiRequest(
    `/api/github/blob/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(
      repo
    )}/${encodeURIComponent(file.sha)}`
  );

  if (!data.content) {
    throw new Error(
      `No content available for: ${file.path}`
    );
  }

  const binaryString = atob(
    data.content.replace(/\n/g, "")
  );

  const bytes = Uint8Array.from(
    binaryString,
    (char) => char.charCodeAt(0)
  );

  const content = new TextDecoder().decode(bytes);

  return {
    path: file.path,
    content
  };
}

export async function getMultipleFileContents(
  owner,
  repo,
  files
) {
  const results = await Promise.all(
    files.map((file) =>
      getFileContent(owner, repo, file)
    )
  );

  return results;
}