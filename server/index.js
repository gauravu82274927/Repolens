import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3001;

async function githubRequest(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `GitHub API error ${response.status}: ${
        data.message || "Unknown error"
      }`
    );
  }

  return data;
}

app.get("/api/github/repository/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const data = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}`
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/github/tree/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const data = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/github/blob/:owner/:repo/:sha", async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;

    const data = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`RepoLens server running on port ${PORT}`);
});