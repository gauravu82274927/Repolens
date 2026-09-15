import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

/* --------------------------------------------------
   BASIC ROUTES
-------------------------------------------------- */

app.get("/", (req, res) => {
  res.json({
    name: "RepoLens API",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "RepoLens API"
  });
});

/* --------------------------------------------------
   GITHUB API
-------------------------------------------------- */

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

/* Repository metadata */

app.get(
  "/api/github/repository/:owner/:repo",
  async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const data = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`
      );

      res.json(data);
    } catch (error) {
      console.error("GitHub repository error:", error);

      res.status(500).json({
        error: error.message
      });
    }
  }
);

/* Repository tree */

app.get(
  "/api/github/tree/:owner/:repo",
  async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const data = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
      );

      res.json(data);
    } catch (error) {
      console.error("GitHub tree error:", error);

      res.status(500).json({
        error: error.message
      });
    }
  }
);

/* File contents */

app.get(
  "/api/github/blob/:owner/:repo/:sha",
  async (req, res) => {
    try {
      const { owner, repo, sha } = req.params;

      const data = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`
      );

      res.json(data);
    } catch (error) {
      console.error("GitHub blob error:", error);

      res.status(500).json({
        error: error.message
      });
    }
  }
);

/* --------------------------------------------------
   GEMINI CONFIGURATION
-------------------------------------------------- */

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const RETRY_DELAYS = [
  2000,
  5000
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/*
  Gemini can temporarily return 503 / UNAVAILABLE
  when the model is experiencing high demand.

  We retry those errors and then switch to a
  fallback model.
*/

function isRetryableGeminiError(error) {
  const message = String(
    error?.message || error || ""
  ).toUpperCase();

  const code = String(
    error?.code ||
    error?.status ||
    error?.error?.code ||
    error?.error?.status ||
    ""
  ).toUpperCase();

  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    code.includes("503") ||
    code.includes("UNAVAILABLE")
  );
}

async function generateGeminiAnalysis(
  contents,
  config
) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    console.log(
      `Trying Gemini model: ${model}`
    );

    for (
      let attempt = 0;
      attempt <= RETRY_DELAYS.length;
      attempt++
    ) {
      try {
        const response =
          await gemini.models.generateContent({
            model,
            contents,
            config
          });

        console.log(
          `Gemini analysis succeeded using ${model}`
        );

        return response;
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini error using ${model}, attempt ${
            attempt + 1
          }:`,
          error?.message || error
        );

        const retryable =
          isRetryableGeminiError(error);

        if (!retryable) {
          throw error;
        }

        /*
          If there are retries remaining,
          wait before trying again.
        */

        if (
          attempt < RETRY_DELAYS.length
        ) {
          const delay =
            RETRY_DELAYS[attempt];

          console.log(
            `Retrying ${model} in ${
              delay / 1000
            } seconds...`
          );

          await sleep(delay);
        }
      }
    }

    console.log(
      `Switching from ${model} to fallback model...`
    );
  }

  throw lastError;
}

/* --------------------------------------------------
   AI ANALYSIS
-------------------------------------------------- */

app.post("/api/analyze", async (req, res) => {
  try {
    const { repositoryContext } = req.body;

    if (!repositoryContext) {
      return res.status(400).json({
        error: "Repository context is required"
      });
    }

    const prompt = `
You are RepoLens, an expert software engineer who analyzes GitHub repositories.

Analyze ONLY the repository files provided below.

Do not invent technologies, architecture, features, files, or behavior that cannot be supported by the provided files.

If information is unavailable, explicitly say so.

Return a structured analysis containing:

- summary: A concise explanation of what the project is.
- techStack: Technologies, frameworks, languages, tools, and libraries actually supported by the files.
- architecture: How the major parts of the repository interact.
- importantFiles: Important files and why they matter.
- entryPoint: The most likely application or development entry point.
- improvements: Exactly 3 practical improvements supported by the repository.

Repository files:

${repositoryContext}
`;

    const config = {
      responseMimeType: "application/json",

      responseSchema: {
        type: "object",

        properties: {
          summary: {
            type: "string"
          },

          techStack: {
            type: "array",
            items: {
              type: "string"
            }
          },

          architecture: {
            type: "string"
          },

          importantFiles: {
            type: "array",

            items: {
              type: "object",

              properties: {
                path: {
                  type: "string"
                },

                reason: {
                  type: "string"
                }
              },

              required: [
                "path",
                "reason"
              ]
            }
          },

          entryPoint: {
            type: "string"
          },

          improvements: {
            type: "array",

            items: {
              type: "string"
            }
          }
        },

        required: [
          "summary",
          "techStack",
          "architecture",
          "importantFiles",
          "entryPoint",
          "improvements"
        ]
      }
    };

    const response =
      await generateGeminiAnalysis(
        prompt,
        config
      );

    if (!response?.text) {
      throw new Error(
        "Gemini returned an empty response"
      );
    }

    const analysis = JSON.parse(
      response.text
    );

    res.json({
      analysis
    });
  } catch (error) {
    console.error(
      "Gemini analysis error:",
      error
    );

    /*
      Give the frontend a useful error instead
      of exposing a huge Gemini error object.
    */

    if (isRetryableGeminiError(error)) {
      return res.status(503).json({
        error:
          "AI analysis is temporarily unavailable. Gemini is experiencing high demand. Please try again in a moment."
      });
    }

    res.status(500).json({
      error:
        error?.message ||
        "AI analysis failed"
    });
  }
});

/* --------------------------------------------------
   404 HANDLER
-------------------------------------------------- */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

/* --------------------------------------------------
   START SERVER
-------------------------------------------------- */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `RepoLens server running on port ${PORT}`
    );
  }
);