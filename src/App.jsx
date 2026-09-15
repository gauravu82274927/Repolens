import { useState } from "react";
import { getRepository, getRepositoryTree } from "./services/github";
import { filterRepositoryTree } from "./services/analyzer";

function App() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setError("");
    setRepo(null);

    try {
      const parts = url
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .split("/");

      const owner = parts[0];
      const repoName = parts[1];

      if (!owner || !repoName) {
        throw new Error("Please enter a valid GitHub repository URL");
      }

      const data = await getRepository(owner, repoName);

      const tree = await getRepositoryTree(owner, repoName);

      console.log("Repository tree:", tree);

      const filteredFiles = filterRepositoryTree(tree.tree);

      console.log("Total entries:", tree.tree.length);
      console.log("Relevant files:", filteredFiles.length);
      console.log("Filtered files:", filteredFiles);

      setRepo({
        ...data,
        tree: filteredFiles
      });

    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>RepoLens</h1>

      <p>Understand any GitHub repository with AI.</p>

      <input
        type="text"
        placeholder="Paste a GitHub repository URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button onClick={handleAnalyze}>
        Analyze Repository
      </button>

      {error && <p>{error}</p>}

      {repo && (
        <div>
          <h2>{repo.name}</h2>
          <p>{repo.description}</p>

          <p>
            Stars: {repo.stargazers_count}
          </p>

          <p>
            Language: {repo.language || "Not specified"}
          </p>

          <p>
            {repo.html_url}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;