import type { Recipe } from "@/types/recipe";

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO environment variables are required");
  }
  return { token, repo };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getRef(token: string, repo: string, branch = "master") {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Failed to get ref: ${res.status}`);
  const data = await res.json();
  return data.object.sha as string;
}

async function getCommit(token: string, repo: string, sha: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/commits/${sha}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Failed to get commit: ${res.status}`);
  return res.json();
}

async function createBlob(token: string, repo: string, content: string, encoding: "utf-8" | "base64" = "utf-8") {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/blobs`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ content, encoding }),
  });
  if (!res.ok) throw new Error(`Failed to create blob: ${res.status}`);
  const data = await res.json();
  return data.sha as string;
}

async function createTree(
  token: string,
  repo: string,
  baseTree: string,
  files: { path: string; sha: string }[]
) {
  const tree = files.map((f) => ({
    path: f.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: f.sha,
  }));

  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/trees`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (!res.ok) throw new Error(`Failed to create tree: ${res.status}`);
  const data = await res.json();
  return data.sha as string;
}

async function createCommit(
  token: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string
) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/commits`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  });
  if (!res.ok) throw new Error(`Failed to create commit: ${res.status}`);
  const data = await res.json();
  return data.sha as string;
}

async function updateRef(token: string, repo: string, sha: string, branch = "master") {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ sha }),
  });
  if (!res.ok) throw new Error(`Failed to update ref: ${res.status}`);
}

export async function commitRecipeChanges(
  recipes: Recipe[],
  tags: string[],
  image?: { filename: string; base64: string } | null
): Promise<{ success: boolean; commitSha: string }> {
  const { token, repo } = getConfig();

  // Get current HEAD
  const headSha = await getRef(token, repo);
  const headCommit = await getCommit(token, repo, headSha);
  const baseTreeSha = headCommit.tree.sha;

  // Create blobs for the files we're updating
  const recipesContent = JSON.stringify(recipes, null, 2) + "\n";
  const tagsContent = JSON.stringify(tags, null, 2) + "\n";

  const files: { path: string; sha: string }[] = [];

  const [recipesBlobSha, tagsBlobSha] = await Promise.all([
    createBlob(token, repo, recipesContent),
    createBlob(token, repo, tagsContent),
  ]);

  files.push({ path: "src/data/recipes.json", sha: recipesBlobSha });
  files.push({ path: "src/data/tags.json", sha: tagsBlobSha });

  // Optionally add an image
  if (image) {
    const imageBlobSha = await createBlob(token, repo, image.base64, "base64");
    files.push({ path: `public/images/recipes/${image.filename}`, sha: imageBlobSha });
  }

  // Create tree, commit, and update ref
  const treeSha = await createTree(token, repo, baseTreeSha, files);
  const newRecipe = recipes[recipes.length - 1]; // Most recently added
  const commitMessage = `Add recipe: ${newRecipe?.title || "new recipe"}`;
  const commitSha = await createCommit(token, repo, commitMessage, treeSha, headSha);
  await updateRef(token, repo, commitSha);

  return { success: true, commitSha };
}
