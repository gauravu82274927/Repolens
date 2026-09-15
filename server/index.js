import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


const PORT =
  process.env.PORT || 10000;


const gemini =
  new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY
  });


/* =========================================================
   GITHUB API
========================================================= */

async function githubRequest(url) {
  const response =
    await fetch(url, {
      headers: {
        Accept:
          "application/vnd.github+json",

        Authorization:
          `Bearer ${process.env.GITHUB_TOKEN}`,

        "X-GitHub-Api-Version":
          "2022-11-28"
      }
    });


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      `GitHub API error ${response.status}: ${
        data.message ||
        "Unknown error"
      }`
    );
  }


  return data;
}


/* =========================================================
   GITHUB REPOSITORY
========================================================= */

app.get(
  "/api/github/repository/:owner/:repo",
  async (req, res) => {

    try {

      const {
        owner,
        repo
      } = req.params;


      const data =
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}`
        );


      res.json(data);

    } catch (error) {

      console.error(
        "GitHub repository error:",
        error
      );


      res.status(500).json({
        error:
          error.message ||
          "Could not fetch repository"
      });

    }

  }
);


/* =========================================================
   GITHUB TREE
========================================================= */

app.get(
  "/api/github/tree/:owner/:repo",
  async (req, res) => {

    try {

      const {
        owner,
        repo
      } = req.params;


      const data =
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
        );


      res.json(data);

    } catch (error) {

      console.error(
        "GitHub tree error:",
        error
      );


      res.status(500).json({
        error:
          error.message ||
          "Could not fetch repository files"
      });

    }

  }
);


/* =========================================================
   GITHUB FILE CONTENT
========================================================= */

app.get(
  "/api/github/blob/:owner/:repo/:sha",
  async (req, res) => {

    try {

      const {
        owner,
        repo,
        sha
      } = req.params;


      const data =
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`
        );


      res.json(data);

    } catch (error) {

      console.error(
        "GitHub blob error:",
        error
      );


      res.status(500).json({
        error:
          error.message ||
          "Could not fetch file"
      });

    }

  }
);


/* =========================================================
   GEMINI ANALYSIS
========================================================= */

async function generateGeminiAnalysis(
  repositoryContext,
  model
) {

  return await gemini.models.generateContent({

    model,

    contents: `
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
    `,

    config: {

      responseMimeType:
        "application/json",

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

    }

  });

}


/* =========================================================
   RETRY HELPER
========================================================= */

function wait(ms) {

  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );

}


async function generateWithRetry(
  repositoryContext,
  model,
  retries = 2
) {

  let lastError;


  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {

    try {

      console.log(
        `Gemini request: ${model} | attempt ${
          attempt + 1
        }`
      );


      const response =
        await generateGeminiAnalysis(
          repositoryContext,
          model
        );


      return response;

    } catch (error) {

      lastError = error;


      console.error(
        `Gemini ${model} attempt ${
          attempt + 1
        } failed:`,
        error.message
      );


      const status =
        error.status ||
        error.code ||
        error?.response?.status;


      const message =
        error.message?.toLowerCase() ||
        "";


      const temporaryError =
        status === 503 ||
        status === 429 ||
        message.includes(
          "high demand"
        ) ||
        message.includes(
          "temporarily unavailable"
        ) ||
        message.includes(
          "unavailable"
        ) ||
        message.includes(
          "overloaded"
        );


      if (!temporaryError) {
        throw error;
      }


      if (attempt < retries) {

        const delay =
          1500 *
          Math.pow(
            2,
            attempt
          );


        console.log(
          `Retrying Gemini in ${delay}ms...`
        );


        await wait(delay);

      }

    }

  }


  throw lastError;
}


/* =========================================================
   ANALYZE ROUTE
========================================================= */

app.post(
  "/api/analyze",
  async (req, res) => {

    try {

      const {
        repositoryContext
      } = req.body;


      if (!repositoryContext) {

        return res.status(400).json({
          error:
            "Repository context is required"
        });

      }


      console.log(
        "Repository context size:",
        repositoryContext.length,
        "characters"
      );


      let response;


      try {

        response =
          await generateWithRetry(
            repositoryContext,
            "gemini-3.6-flash",
            2
          );

      } catch (primaryError) {

        console.error(
          "Primary Gemini model unavailable:",
          primaryError.message
        );


        console.log(
          "Trying fallback model: gemini-3.5-flash-lite"
        );


        response =
          await generateWithRetry(
            repositoryContext,
            "gemini-3.5-flash-lite",
            2
          );

      }


      const analysis =
        JSON.parse(
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


      res.status(500).json({
        error:
          error.message ||
          "AI analysis failed"
      });

    }

  }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      status: "ok",
      service: "RepoLens API"
    });

  }
);


/* =========================================================
   SERVER
========================================================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "RepoLens API"
  });
});

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `RepoLens server running on port ${PORT}`
    );

  }
);