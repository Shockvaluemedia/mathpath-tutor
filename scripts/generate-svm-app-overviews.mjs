import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const owner = "Shockvaluemedia";
const outDir = path.resolve("SVM_APP_OVERVIEWS");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const today = "May 27, 2026";

mkdirSync(outDir, { recursive: true });

function gh(args, fallback = "") {
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleize(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bSvm\b/g, "SVM")
    .replace(/\bSaas\b/g, "SaaS")
    .replace(/\bOs\b/g, "OS")
    .replace(/\bHq\b/g, "HQ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractSummary(readme, description, repoName) {
  const cleanLines = readme
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("[!") && !line.startsWith("!") && !line.startsWith("---"))
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/\*\*/g, ""));

  const paragraph = cleanLines.find((line) => {
    const lower = line.toLowerCase();
    return line.length > 55 && !lower.includes("npm ") && !lower.includes("```") && !lower.startsWith("|");
  });

  return paragraph || description || `${titleize(repoName)} is an SVM app in the ${owner} account.`;
}

function inferCategory(repo) {
  const text = `${repo.name} ${repo.description || ""}`.toLowerCase();
  if (text.includes("tutor") || text.includes("diagnostic") || text.includes("learning")) return "Education and learning";
  if (text.includes("culture")) return "Culture and assessment";
  if (text.includes("option") || text.includes("trading")) return "Trading education";
  if (text.includes("growth") || text.includes("performance")) return "Growth and performance";
  if (text.includes("funding") || text.includes("deal") || text.includes("cash") || text.includes("ash-flow")) return "Finance and deal operations";
  if (text.includes("fan") || text.includes("sonic") || text.includes("music") || text.includes("speaker")) return "Creator and media";
  if (text.includes("wellness") || text.includes("heartway")) return "Wellness and community";
  if (text.includes("rent")) return "Real estate intelligence";
  if (text.includes("entity") || text.includes("guard")) return "Compliance and protection";
  if (text.includes("command") || text.includes("operator") || text.includes("exec")) return "Operations and command center";
  if (text.includes("afterschool")) return "Afterschool operations";
  return "SVM product app";
}

function inferReadiness(repo, readme) {
  const pushed = new Date(repo.pushedAt || repo.updatedAt || 0);
  const daysOld = Number.isFinite(pushed.getTime()) ? (Date.now() - pushed.getTime()) / 86400000 : 999;
  const text = `${repo.name} ${repo.description || ""} ${readme}`.toLowerCase();
  if (repo.isArchived) return "Coming soon";
  if (text.includes("coming soon") || text.includes("prototype") || text.includes("wip")) return "Coming soon";
  if (repo.description && daysOld < 150) return "Ready candidate";
  if (daysOld < 45) return "Ready candidate";
  return "Coming soon";
}

function inferReadyCapabilities(repo, readme) {
  const text = `${repo.name} ${repo.description || ""} ${readme}`.toLowerCase();
  const caps = [];

  if (text.includes("next.js") || text.includes("react")) caps.push("Web application foundation");
  if (text.includes("dashboard")) caps.push("Dashboard experience");
  if (text.includes("auth") || text.includes("login") || text.includes("signup")) caps.push("User authentication flow");
  if (text.includes("stripe") || text.includes("payment") || text.includes("billing")) caps.push("Payments or subscription flow");
  if (text.includes("ai") || text.includes("openai") || text.includes("llm")) caps.push("AI-assisted workflow");
  if (text.includes("postgres") || text.includes("database") || text.includes("prisma") || text.includes("drizzle")) caps.push("Persistent data model");
  if (text.includes("admin")) caps.push("Admin or operator controls");
  if (text.includes("assessment") || text.includes("diagnostic")) caps.push("Assessment or diagnostic flow");
  if (text.includes("student") || text.includes("parent")) caps.push("Student or family management");
  if (text.includes("report") || text.includes("analytics")) caps.push("Reporting and analytics");
  if (text.includes("content") || text.includes("subscription")) caps.push("Content and membership surfaces");
  if (text.includes("deploy") || text.includes("docker") || text.includes("aws") || text.includes("vercel")) caps.push("Deployment foundation");

  const fallback = [
    `${titleize(repo.name)} product shell`,
    "Core app structure",
    "Initial user-facing experience",
    "Repo foundation for launch iteration",
  ];

  return [...new Set(caps.length ? caps : fallback)].slice(0, 8);
}

function inferComingSoon(repo, category) {
  const name = repo.name.toLowerCase();
  const common = [
    "End-to-end QA and production hardening",
    "Analytics, monitoring, and error tracking",
    "Customer onboarding and support workflows",
  ];

  if (category.includes("Education")) {
    return ["Expanded learner insights", "More adaptive content paths", "Parent or admin reporting upgrades", ...common].slice(0, 6);
  }
  if (category.includes("Finance") || name.includes("option")) {
    return ["Risk controls and compliance language", "Scenario tracking and decision history", "Deeper reporting dashboards", ...common].slice(0, 6);
  }
  if (category.includes("Creator")) {
    return ["Creator onboarding", "Audience segmentation", "Membership or campaign analytics", ...common].slice(0, 6);
  }
  if (category.includes("Operations") || category.includes("Growth")) {
    return ["Operator workflows", "Automation triggers", "Executive reporting", ...common].slice(0, 6);
  }
  if (category.includes("Wellness")) {
    return ["Program delivery flows", "Participant progress reporting", "Privacy and consent review", ...common].slice(0, 6);
  }
  return ["Feature completion", "Launch messaging", "Data model review", ...common].slice(0, 6);
}

function markdownFor(repo, readme) {
  const appName = titleize(repo.name);
  const category = inferCategory(repo);
  const status = inferReadiness(repo, readme);
  const summary = extractSummary(readme, repo.description, repo.name);
  const ready = inferReadyCapabilities(repo, readme);
  const soon = inferComingSoon(repo, category);

  return `# ${appName}

**SVM App Overview**  
**Prepared:** ${today}  
**Repository:** ${repo.url}  
**Category:** ${category}  
**Launch Status:** ${status}

## What This App Is About

${summary}

## Ready Now

${ready.map((item) => `- ${item}`).join("\n")}

## Coming Soon

${soon.map((item) => `- ${item}`).join("\n")}

## Launch Notes

- Confirm product owner, launch audience, and pricing or access model.
- Review README, environment variables, and deploy notes before public launch.
- Run QA across the main user journey and admin/operator flows.
- Confirm privacy, security, and support language for the intended audience.
`;
}

function htmlFor(repo, md) {
  const appName = titleize(repo.name);
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (inList) html += "</ul>";
      inList = false;
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith("## ")) {
      if (inList) html += "</ul>";
      inList = false;
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.slice(2))}</li>`;
    } else if (line.trim()) {
      if (inList) html += "</ul>";
      inList = false;
      html += `<p>${escapeHtml(line).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }
  }
  if (inList) html += "</ul>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(appName)} App Overview</title>
  <style>
    @page { size: Letter; margin: 0.6in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 10.5pt; line-height: 1.5; }
    h1 { margin: 0 0 8px; padding: 22px 24px 10px; color: #fff; background: #172033; font-size: 26pt; line-height: 1.05; letter-spacing: 0; }
    h2 { margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #1d4ed8; color: #0f172a; font-size: 15pt; }
    p { margin: 0 0 8px; }
    ul { margin: 6px 0 12px 18px; padding: 0; }
    li { margin: 3px 0; }
    strong { color: #0f172a; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

const repos = JSON.parse(
  gh(["repo", "list", owner, "--limit", "200", "--json", "name,description,url,isPrivate,isArchived,primaryLanguage,updatedAt,pushedAt,defaultBranchRef"], "[]")
);

const generated = [];

for (const repo of repos) {
  const fullName = `${owner}/${repo.name}`;
  const readme = gh(["api", `repos/${fullName}/readme`, "-H", "Accept: application/vnd.github.raw"], "");
  const slug = slugify(repo.name);
  const md = markdownFor(repo, readme);
  const html = htmlFor(repo, md);
  const mdPath = path.join(outDir, `${slug}.md`);
  const htmlPath = path.join(outDir, `${slug}.html`);
  const pdfPath = path.join(outDir, `${slug}.pdf`);

  writeFileSync(mdPath, md);
  writeFileSync(htmlPath, html);

  if (existsSync(chrome)) {
    spawnSync(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`,
    ], { stdio: "ignore" });
  }

  generated.push({ repo, slug, mdPath, htmlPath, pdfPath });
}

const indexMd = `# SVM App Overview Index

**Prepared:** ${today}  
**Account:** ${owner}  
**Apps covered:** ${generated.length}

## App PDFs

${generated.map(({ repo, slug, pdfPath }) => {
  const status = existsSync(pdfPath) ? "PDF generated" : "PDF missing";
  return `- [${titleize(repo.name)}](./${slug}.pdf) — ${status}`;
}).join("\n")}
`;

writeFileSync(path.join(outDir, "INDEX.md"), indexMd);
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(generated.map(({ repo, slug, pdfPath }) => ({
  name: repo.name,
  title: titleize(repo.name),
  url: repo.url,
  slug,
  pdf: path.basename(pdfPath),
  status: existsSync(pdfPath) ? "generated" : "missing",
})), null, 2));

if (existsSync(chrome)) {
  const indexHtml = htmlFor({ name: "SVM App Overview Index" }, indexMd);
  const indexHtmlPath = path.join(outDir, "INDEX.html");
  const indexPdfPath = path.join(outDir, "INDEX.pdf");
  writeFileSync(indexHtmlPath, indexHtml);
  spawnSync(chrome, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    `--print-to-pdf=${indexPdfPath}`,
    `file://${indexHtmlPath}`,
  ], { stdio: "ignore" });
}

const manifest = JSON.parse(readFileSync(path.join(outDir, "manifest.json"), "utf8"));
console.log(JSON.stringify({
  outDir,
  apps: manifest.length,
  pdfs: manifest.filter((item) => item.status === "generated").length,
}, null, 2));
