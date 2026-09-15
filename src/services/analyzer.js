const IGNORED_DIRECTORIES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  "vendor"
];


const IMPORTANT_FILES = [
  "README.md",
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Dockerfile",
  "docker-compose.yml",
  "vite.config.js",
  "vite.config.ts",
  "tsconfig.json",
  "index.js",
  "main.js",
  "main.jsx",
  "App.jsx",
  "App.js"
];


const SOURCE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".cs",
  ".go",
  ".rs",
  ".swift",
  ".kt"
];


export function filterRepositoryTree(tree) {

  return tree.filter((item) => {

    if (item.type !== "blob") {
      return false;
    }


    const pathParts =
      item.path.split("/");


    const isIgnored =
      IGNORED_DIRECTORIES.some(
        (directory) =>
          pathParts.includes(directory)
      );


    if (isIgnored) {
      return false;
    }


    if (
      IMPORTANT_FILES.includes(
        item.path
      )
    ) {
      return true;
    }


    return SOURCE_EXTENSIONS.some(
      (extension) =>
        item.path.endsWith(
          extension
        )
    );

  });

}


export function selectImportantFiles(
  files,
  limit = 15
) {

  const scoredFiles =
    files.map((file) => {

      let score = 0;

      const path =
        file.path.toLowerCase();


      if (
        path === "readme.md"
      ) {
        score += 100;
      }


      if (
        path === "package.json"
      ) {
        score += 95;
      }


      if (
        path === "requirements.txt"
      ) {
        score += 95;
      }


      if (
        path === "pyproject.toml"
      ) {
        score += 95;
      }


      if (
        path.includes(
          "src/app."
        ) ||
        path.includes(
          "src/main."
        ) ||
        path.includes(
          "src/index."
        )
      ) {
        score += 80;
      }


      if (
        path.includes(
          "/services/"
        ) ||
        path.includes(
          "/controllers/"
        ) ||
        path.includes(
          "/routes/"
        ) ||
        path.includes(
          "/api/"
        ) ||
        path.includes(
          "/models/"
        )
      ) {
        score += 60;
      }


      if (
        path.includes(
          "config"
        ) ||
        path.includes(
          "vite.config"
        ) ||
        path.includes(
          "webpack.config"
        )
      ) {
        score += 40;
      }


      score += Math.max(
        0,
        20 -
          path.split("/").length *
            2
      );


      return {
        ...file,
        score
      };

    });


  return scoredFiles
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, limit);

}