import { useEffect, useRef, useState } from "react";
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


/*
 * REVEAL ANIMATION
 */

function Reveal({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("reveal-visible");
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.08
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}


/*
 * STATIC PARTICLE FIELD
 *
 * Particles are distributed across the entire viewport.
 * They do NOT follow the cursor.
 * The cursor only repels nearby particles.
 */

function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const mouse = {
      x: -1000,
      y: -1000,
      active: false
    };

    const particles = [];

    const PARTICLE_COUNT = Math.min(
      220,
      Math.floor((width * height) / 6500)
    );

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    }

    resize();

    /*
     * Create particles across the whole page.
     */

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,

        baseX: 0,
        baseY: 0,

        vx: 0,
        vy: 0,

        radius:
          Math.random() < 0.82
            ? 0.7 + Math.random() * 0.8
            : 1.4 + Math.random() * 1.2,

        opacity:
          0.15 + Math.random() * 0.55
      });

      particles[i].baseX =
        particles[i].x;

      particles[i].baseY =
        particles[i].y;
    }

    /*
     * Mouse movement.
     */

    function handleMouseMove(event) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    }

    function handleMouseLeave() {
      mouse.active = false;
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    document.addEventListener(
      "mouseleave",
      handleMouseLeave
    );

    /*
     * Draw particles.
     */

    function draw() {
      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      particles.forEach((particle) => {

        /*
         * Distance from cursor.
         */

        const dx =
          particle.x - mouse.x;

        const dy =
          particle.y - mouse.y;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        /*
         * Radius of the repulsion field.
         */

        const REPULSION_RADIUS = 110;

        if (
          mouse.active &&
          distance < REPULSION_RADIUS
        ) {
          const force =
            (REPULSION_RADIUS - distance) /
            REPULSION_RADIUS;

          const angle =
            Math.atan2(dy, dx);

          /*
           * Push particle away
           * from cursor.
           */

          particle.vx +=
            Math.cos(angle) *
            force *
            1.8;

          particle.vy +=
            Math.sin(angle) *
            force *
            1.8;
        }

        /*
         * Slowly return particles
         * to their original positions.
         */

        particle.vx +=
          (particle.baseX - particle.x) *
          0.0025;

        particle.vy +=
          (particle.baseY - particle.y) *
          0.0025;

        /*
         * Friction.
         */

        particle.vx *= 0.88;
        particle.vy *= 0.88;

        /*
         * Move particle.
         */

        particle.x += particle.vx;
        particle.y += particle.vy;

        /*
         * Draw.
         */

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(255, 255, 255, ${particle.opacity})`;

        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    const animationFrame =
      requestAnimationFrame(draw);

    /*
     * Resize.
     */

    window.addEventListener(
      "resize",
      resize
    );

    /*
     * Cleanup.
     */

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseleave",
        handleMouseLeave
      );

      window.removeEventListener(
        "resize",
        resize
      );

      cancelAnimationFrame(
        animationFrame
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-field"
      aria-hidden="true"
    />
  );
}


/*
 * APP
 */

function App() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const githubLogoRef = useRef(null);


  /*
   * GITHUB LOGO SCROLL ROTATION
   */

  useEffect(() => {
    let lastScrollY =
      window.scrollY;

    let rotation = 0;

    function handleScroll() {
      const currentScrollY =
        window.scrollY;

      const difference =
        currentScrollY -
        lastScrollY;

      if (difference > 0) {
        rotation +=
          Math.min(
            difference * 0.12,
            12
          );
      } else if (difference < 0) {
        rotation -=
          Math.min(
            Math.abs(difference) * 0.12,
            12
          );
      }

      if (githubLogoRef.current) {
        githubLogoRef.current.style.transform =
          `translate(-50%, -50%) rotate(${rotation}deg)`;
      }

      lastScrollY =
        currentScrollY;
    }

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);


  /*
   * ANALYZE REPOSITORY
   */

  async function handleAnalyze() {
    setError("");
    setRepo(null);
    setAnalysis(null);
    setLoading(true);

    try {
      const githubUrl =
        new URL(url.trim());

      if (
        githubUrl.hostname !==
          "github.com" &&
        githubUrl.hostname !==
          "www.github.com"
      ) {
        throw new Error(
          "Please enter a valid GitHub repository URL"
        );
      }

      const parts =
        githubUrl.pathname
          .split("/")
          .filter(Boolean);

      const owner = parts[0];
      const repoName = parts[1];

      if (!owner || !repoName) {
        throw new Error(
          "Please enter a valid GitHub repository URL"
        );
      }

      const data =
        await getRepository(
          owner,
          repoName
        );

      const tree =
        await getRepositoryTree(
          owner,
          repoName
        );

      const filteredFiles =
        filterRepositoryTree(
          tree.tree
        );

      const importantFiles =
        selectImportantFiles(
          filteredFiles
        );

      const fileContents =
        await getMultipleFileContents(
          owner,
          repoName,
          importantFiles
        );

      const repositoryContext =
        buildRepositoryContext(
          fileContents
        );

      const aiResponse =
        await fetch(
          "http://localhost:3001/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              repositoryContext
            })
          }
        );

      const aiData =
        await aiResponse.json();

      if (!aiResponse.ok) {
        throw new Error(
          aiData.error ||
            "AI analysis failed"
        );
      }

      setAnalysis(
        aiData.analysis
      );

      setRepo({
        ...data,
        tree: importantFiles,
        files: fileContents
      });

    } catch (err) {
      setError(
        err.message
      );
    } finally {
      setLoading(false);
    }
  }


  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !loading
    ) {
      handleAnalyze();
    }
  }


  function useExample(
    exampleUrl
  ) {
    setUrl(exampleUrl);
    setError("");
  }


  return (
    <div className="app">

      {/* STATIC PARTICLES */}

      <ParticleField />


      {/* BACKGROUND GITHUB MARK */}

      <div
        ref={githubLogoRef}
        className="github-background"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 98 96"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.943 40.22 33.28 46.754 2.427.46 3.31-1.056 3.31-2.34 0-1.151-.043-4.192-.065-8.225-13.53 2.979-16.4-6.559-16.4-6.559-2.207-5.658-5.395-7.167-5.395-7.167-4.414-3.032.334-2.97.334-2.97 4.89.35 7.463 5.093 7.463 5.093 4.339 7.52 11.379 5.348 14.152 4.089.434-3.18 1.699-5.348 3.088-6.57-10.795-1.245-22.15-5.488-22.15-24.397 0-5.39 1.89-9.792 4.993-13.248-.502-1.245-2.165-6.27.47-13.067 0 0 4.07-1.324 13.354 5.06 3.878-1.09 8.04-1.638 12.176-1.658 4.136.02 8.298.568 12.176 1.658 9.284-6.384 13.354-5.06 13.354-5.06 2.635 6.797.972 11.822.47 13.067 3.103 3.456 4.993 7.858 4.993 13.248 0 18.954-11.377 23.138-22.204 24.36 1.745 1.52 3.305 4.514 3.305 9.105 0 6.57-.06 11.86-.06 13.47 0 1.296.873 2.824 3.33 2.336C84.082 89.426 98 70.96 98 49.217 98 22 76.02 0 48.854 0Z"
          />
        </svg>
      </div>


      {/* SCROLL BAR */}

      <div className="scroll-progress" />



      {/* HERO */}

      <header className="hero">

        <div className="hero-brand">
          RepoLens
        </div>

        <h1>
          Understand the codebase

          <span>
            before you open it.
          </span>
        </h1>

        <p className="hero-description">
          Analyze the structure,
          technology, architecture
          and key files of any public
          GitHub repository.
        </p>


        <div className="search-wrapper">

          <div className="search-box">

            <div className="github-prefix">
              github.com/
            </div>

            <input
              type="text"
              placeholder="owner/repository"
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
              onKeyDown={
                handleKeyDown
              }
              disabled={loading}
            />

            <button
              onClick={
                handleAnalyze
              }
              disabled={
                loading ||
                !url.trim()
              }
            >

              {loading ? (
                <>
                  <span className="button-spinner" />
                  Analyzing
                </>
              ) : (
                <>
                  Analyze

                  <span className="button-arrow">
                    →
                  </span>
                </>
              )}

            </button>

          </div>


          <div className="search-hint">
            Press Enter to analyze
          </div>


          <div className="examples">

            <span>
              Try
            </span>

            <button
              onClick={() =>
                useExample(
                  "https://github.com/facebook/react"
                )
              }
            >
              facebook/react
            </button>

            <button
              onClick={() =>
                useExample(
                  "https://github.com/vercel/next.js"
                )
              }
            >
              vercel/next.js
            </button>

            <button
              onClick={() =>
                useExample(
                  "https://github.com/expressjs/express"
                )
              }
            >
              expressjs/express
            </button>

          </div>

        </div>

      </header>


      {/* ERROR */}

      {error && (
        <Reveal>

          <div className="error">

            <div className="error-icon">
              !
            </div>

            <div>

              <strong>
                Analysis failed
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>

        </Reveal>
      )}


      {/* REPOSITORY */}

      {repo && (
        <Reveal className="repository-section">

          <section className="repository-card">

            <div className="repository-top">

              <div className="repository-identity">

                <div className="repo-icon">
                  {repo.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <div className="repo-path">
                    GitHub repository
                  </div>

                  <h2>
                    {repo.name}
                  </h2>

                  <p>
                    {repo.description ||
                      "No repository description available."}
                  </p>

                </div>

              </div>


              <a
                className="github-link"
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
              >
                View source
                <span>↗</span>
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
                  Issues
                </span>

              </div>


              <div className="stat">

                <span className="stat-value">
                  {repo.language || "—"}
                </span>

                <span className="stat-label">
                  Primary language
                </span>

              </div>


              <div className="stat">

                <span className="stat-value">
                  {repo.size
                    ? `${(
                        repo.size / 1024
                      ).toFixed(1)} MB`
                    : "—"}
                </span>

                <span className="stat-label">
                  Repository size
                </span>

              </div>

            </div>

          </section>

        </Reveal>
      )}


      {/* ANALYSIS */}

      {analysis && (
        <main className="analysis">

          <Reveal className="analysis-heading">

            <div>

              <div className="section-kicker">
                ANALYSIS
              </div>

              <h2>
                Repository intelligence
              </h2>

            </div>

            <div className="analysis-status">

              <span />

              Complete

            </div>

          </Reveal>


          {/* SUMMARY */}

          <Reveal>

            <section className="analysis-block summary-block">

              <div className="block-number">
                01
              </div>

              <div className="block-content">

                <div className="block-label">
                  Overview
                </div>

                <h3>
                  What this repository does
                </h3>

                <p className="summary-text">
                  {analysis.summary}
                </p>

              </div>

            </section>

          </Reveal>


          {/* TECH + ENTRY */}

          <Reveal>

            <section className="analysis-grid">

              <div className="analysis-block">

                <div className="block-number">
                  02
                </div>

                <div className="block-content">

                  <div className="block-label">
                    Technology
                  </div>

                  <h3>
                    Built with
                  </h3>

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

                </div>

              </div>


              <div className="analysis-block">

                <div className="block-number">
                  03
                </div>

                <div className="block-content">

                  <div className="block-label">
                    Execution
                  </div>

                  <h3>
                    Entry point
                  </h3>

                  <div className="entry-point">

                    <span className="terminal-symbol">
                      $
                    </span>

                    {analysis.entryPoint}

                  </div>

                </div>

              </div>

            </section>

          </Reveal>


          {/* ARCHITECTURE */}

          <Reveal>

            <section className="analysis-block architecture-block">

              <div className="block-number">
                04
              </div>

              <div className="block-content">

                <div className="block-label">
                  Structure
                </div>

                <h3>
                  Architecture
                </h3>

                <p>
                  {analysis.architecture}
                </p>

              </div>

            </section>

          </Reveal>


          {/* FILES */}

          <Reveal>

            <section className="analysis-block">

              <div className="block-number">
                05
              </div>

              <div className="block-content">

                <div className="block-label">
                  Source map
                </div>

                <h3>
                  Important files
                </h3>

                <div className="file-list">

                  {analysis.importantFiles.map(
                    (file, index) => (
                      <div
                        className="file-item"
                        key={index}
                      >

                        <div className="file-index">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </div>

                        <div className="file-info">

                          <code>
                            {file.path}
                          </code>

                          <p>
                            {file.reason}
                          </p>

                        </div>

                        <span className="file-arrow">
                          →
                        </span>

                      </div>
                    )
                  )}

                </div>

              </div>

            </section>

          </Reveal>


          {/* IMPROVEMENTS */}

          <Reveal>

            <section className="analysis-block improvements-block">

              <div className="block-number">
                06
              </div>

              <div className="block-content">

                <div className="block-label">
                  Engineering review
                </div>

                <h3>
                  Recommended improvements
                </h3>

                <div className="improvements-list">

                  {analysis.improvements.map(
                    (improvement, index) => (
                      <div
                        className="improvement"
                        key={index}
                      >

                        <span>
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </span>

                        <p>
                          {improvement}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>

            </section>

          </Reveal>


          <footer className="footer">

            <div>
              RepoLens
            </div>

            <span>
              Repository intelligence for developers
            </span>

          </footer>

        </main>
      )}

    </div>
  );
}


export default App;