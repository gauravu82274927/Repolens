import { useState } from "react";
import "./App.css";

import {
  getRepository,
  getRepositoryTree,
  getMultipleFileContents
} from "./services/github";

import {
  filterRepositoryTree,
  selectImportantFiles
} from "./services/analyzer";

import {
  buildRepositoryContext
} from "./services/ai";

function App() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setError("");
    setRepo(null);
    setAnalysis(null);
    setLoading(true);

    try {
      const githubUrl = new URL(url.trim());

      if (githubUrl.hostname !== "github.com") {
        throw new Error("Please enter a valid GitHub repository URL");
      }

      const parts = githubUrl.pathname
        .split("/")
        .filter(Boolean);

      const owner = parts[0];
      const repoName = parts[1];

      if (!owner || !repoName) {
        throw new Error("Please enter a valid GitHub repository URL");
      }

      const data = await getRepository(owner, repoName);

      const tree = await getRepositoryTree(owner, repoName);

      console.log("Repository tree:", tree);

      const filteredFiles = filterRepositoryTree(tree.tree);
      const importantFiles = selectImportantFiles(filteredFiles);

      console.log("Total entries:", tree.tree.length);
      console.log("Relevant files:", filteredFiles.length);
      console.log("Important files:", importantFiles);

      const fileContents = await getMultipleFileContents(
        owner,
        repoName,
        importantFiles
      );

      const repositoryContext =
        buildRepositoryContext(fileContents);

      console.log("Repository context:");
      console.log(repositoryContext);

      const aiResponse = await fetch(
        "http://localhost:3001/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            repositoryContext
          })
        }
      );

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        throw new Error(
          aiData.error || "AI analysis failed"
        );
      }

      console.log("AI analysis:", aiData.analysis);

      setAnalysis(aiData.analysis);

      console.log(
        "Fetched file contents:",
        fileContents
      );

      setRepo({
        ...data,
        tree: importantFiles,
        files: fileContents
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">

      <header className="hero">
        <h1>RepoLens</h1>

        <p>
          Understand any GitHub repository with AI.
        </p>

        <div className="search-box">
          <input
            type="text"
            placeholder="Paste a GitHub repository URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />

          <button
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading
              ? "Analyzing Repository..."
              : "Analyze Repository"}
          </button>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {repo && (
  <section className="repository-card">

    <div className="repository-header">
      <div>
        <h2>{repo.name}</h2>

        <p className="description">
          {repo.description ||
            "No description available."}
        </p>
      </div>

      <a
        href={repo.html_url}
        target="_blank"
        rel="noreferrer"
      >
        View on GitHub
      </a>
    </div>

    <div className="repo-stats">

      <div className="stat">
        <span className="stat-value">
          {repo.stargazers_count}
        </span>

        <span className="stat-label">
          Stars
        </span>
      </div>

      <div className="stat">
        <span className="stat-value">
          {repo.forks_count}
        </span>

        <span className="stat-label">
          Forks
        </span>
      </div>

      <div className="stat">
        <span className="stat-value">
          {repo.open_issues_count}
        </span>

        <span className="stat-label">
          Issues / PRs
        </span>
      </div>

      <div className="stat">
        <span className="stat-value">
          {repo.language || "N/A"}
        </span>

        <span className="stat-label">
          Language
        </span>
      </div>

      <div className="stat">
        <span className="stat-value">
          {repo.size
            ? `${(repo.size / 1024).toFixed(1)} MB`
            : "N/A"}
        </span>

        <span className="stat-label">
          Repository Size
        </span>
      </div>

    </div>

  </section>
)}

      {analysis && (
        <main className="analysis">

          <h2 className="analysis-title">
            Repository Analysis
          </h2>

          {/* Summary */}

          <section className="card summary-card">
            <h3>Summary</h3>

            <p>
              {analysis.summary}
            </p>
          </section>

          {/* Tech Stack + Entry Point */}

          <div className="two-column">

            <section className="card">
              <h3>Tech Stack</h3>

              <div className="tech-list">
                {analysis.techStack.map(
                  (technology, index) => (
                    <span
                      className="tech-tag"
                      key={index}
                    >
                      {technology}
                    </span>
                  )
                )}
              </div>
            </section>

            <section className="card">
              <h3>Entry Point</h3>

              <p>
                {analysis.entryPoint}
              </p>
            </section>

          </div>

          {/* Architecture */}

          <section className="card">
            <h3>Architecture</h3>

            <p>
              {analysis.architecture}
            </p>
          </section>

          {/* Important Files */}

          <section className="card">
            <h3>Important Files</h3>

            <div className="file-list">

              {analysis.importantFiles.map(
                (file, index) => (
                  <div
                    className="file-item"
                    key={index}
                  >
                    <code>
                      {file.path}
                    </code>

                    <p>
                      {file.reason}
                    </p>
                  </div>
                )
              )}

            </div>
          </section>

          {/* Suggested Improvements */}

          <section className="card improvements-card">
            <h3>
              Suggested Improvements
            </h3>

            <ol>
              {analysis.improvements.map(
                (improvement, index) => (
                  <li key={index}>
                    {improvement}
                  </li>
                )
              )}
            </ol>
          </section>

        </main>
      )}

    </div>
  );
}

export default App;