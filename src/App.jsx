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


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

  function ParticleField() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({
    x: -1000,
    y: -1000
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let animationFrame;

    const particles = [];

    const PARTICLE_COUNT = 220;
    const REPULSION_RADIUS = 110;
    const RETURN_SPEED = 0.025;

    function resizeCanvas() {
      const dpr =
        window.devicePixelRatio || 1;

      canvas.width =
        window.innerWidth * dpr;

      canvas.height =
        window.innerHeight * dpr;

      canvas.style.width =
        `${window.innerWidth}px`;

      canvas.style.height =
        `${window.innerHeight}px`;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    }


    function createParticles() {
      particles.length = 0;

      for (
        let i = 0;
        i < PARTICLE_COUNT;
        i++
      ) {
        const x =
          Math.random() *
          window.innerWidth;

        const y =
          Math.random() *
          window.innerHeight;

        particles.push({
          x,
          y,

          originalX: x,
          originalY: y,

          vx: 0,
          vy: 0,

          size:
            Math.random() * 1.5 +
            0.5,

          opacity:
            Math.random() * 0.45 +
            0.2
        });
      }
    }


    function handleMouseMove(event) {
      mouseRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    }


    function handleMouseLeave() {
      mouseRef.current = {
        x: -1000,
        y: -1000
      };
    }


    function animate() {
      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );


      const mouse =
        mouseRef.current;


      particles.forEach(
        (particle) => {

          const dx =
            particle.x - mouse.x;

          const dy =
            particle.y - mouse.y;

          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy
            );


          if (
            distance <
            REPULSION_RADIUS
          ) {

            const force =
              (REPULSION_RADIUS -
                distance) /
              REPULSION_RADIUS;

            const angle =
              Math.atan2(
                dy,
                dx
              );

            particle.vx +=
              Math.cos(angle) *
              force *
              0.8;

            particle.vy +=
              Math.sin(angle) *
              force *
              0.8;
          }


          particle.vx *= 0.92;
          particle.vy *= 0.92;


          particle.x +=
            particle.vx;

          particle.y +=
            particle.vy;


          particle.x +=
            (particle.originalX -
              particle.x) *
            RETURN_SPEED;

          particle.y +=
            (particle.originalY -
              particle.y) *
            RETURN_SPEED;


          ctx.beginPath();

          ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            `rgba(255, 255, 255, ${particle.opacity})`;

          ctx.fill();

        }
      );


      animationFrame =
        requestAnimationFrame(
          animate
        );
    }


    resizeCanvas();
    createParticles();
    animate();


    window.addEventListener(
      "resize",
      () => {
        resizeCanvas();
        createParticles();
      }
    );

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseleave",
      handleMouseLeave
    );


    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseleave",
        handleMouseLeave
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

function Reveal({
  children,
  className = ""
}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            element.classList.add(
              "reveal-visible"
            );

            observer.unobserve(element);
          }
        },
        {
          threshold: 0.08
        }
      );

    observer.observe(element);

    return () =>
      observer.disconnect();
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


function App() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] =
    useState(null);
  const [loading, setLoading] =
    useState(false);

  const [mousePosition, setMousePosition] =
    useState({
      x: 50,
      y: 30
    });


  useEffect(() => {
    function handleMouseMove(event) {
      setMousePosition({
        x: event.clientX,
        y: event.clientY
      });
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
    };
  }, []);


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
          `${API_BASE_URL}/api/analyze`,
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
        err.message ||
          "Something went wrong"
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


  return (
    <div
      className="app"
      style={{
        "--cursor-x":
          `${mousePosition.x}px`,
        "--cursor-y":
          `${mousePosition.y}px`
      }}
    >

      <ParticleField />

      <div className="cursor-glow" />

      <div className="background-grid" />

      <div className="scroll-progress" />


      {/* HERO */}

      <header className="hero">

        <div className="hero-eyebrow">

          <span className="eyebrow-line" />

          DEVELOPER TOOL

          <span className="eyebrow-line" />

        </div>


        <h1>
          Understand the codebase
          <span>
            {" "}before you open it.
          </span>
        </h1>


        <p className="hero-description">
          RepoLens analyzes the structure,
          technology, architecture and key
          files of any public GitHub
          repository.
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
              onChange={(event) =>
                setUrl(event.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={loading}
            />


            <button
              onClick={handleAnalyze}
              disabled={loading}
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
                      (
                        technology,
                        index
                      ) => (
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
                    (
                      file,
                      index
                    ) => (

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
                    (
                      improvement,
                      index
                    ) => (

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