import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

app.post("/api/analyze", async (req, res) => {
  try {
    const { repositoryContext } = req.body;

    if (!repositoryContext) {
      return res.status(400).json({
        error: "Repository context is required"
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
You are RepoLens, an expert software engineer who explains GitHub repositories.

Analyze ONLY the repository files provided by the user.

Do not invent technologies, architecture, features, or files that are not supported by the provided code.

Return a clear analysis suitable for a developer who wants to quickly understand the repository.
              `
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Analyze this GitHub repository.

Provide:
1. A concise project summary.
2. The technologies and frameworks used.
3. The overall architecture and how the major parts interact.
4. The most important files and why they matter.
5. The likely entry point of the application.
6. Three useful improvements a developer could make.

Repository files:

${repositoryContext}
              `
            }
          ]
        }
      ]
    });

    res.json({
      analysis: response.output_text
    });

  } catch (error) {
    console.error("AI analysis error:", error);

    res.status(500).json({
      error: error.message || "AI analysis failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`RepoLens server running on port ${PORT}`);
});