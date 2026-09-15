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
  "package.json",
  "README.md",
  "vite.config.js",
  "vite.config.ts",
  "tsconfig.json",
  "requirements.txt",
  "pyproject.toml",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example"
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

    const path = item.path;

    const isIgnored = IGNORED_DIRECTORIES.some((directory) =>
      path.split("/").includes(directory)
    );

    if (isIgnored) {
      return false;
    }

    if (IMPORTANT_FILES.includes(path)) {
      return true;
    }

    return SOURCE_EXTENSIONS.some((extension) =>
      path.endsWith(extension)
    );
  });
}