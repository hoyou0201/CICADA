#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REDACTED = "[REDACTED]";

/**
 * 토큰·키·비밀번호로 보이는 값을 마스킹한다.
 * @param {string} input
 * @returns {string}
 */
export function redactSecrets(input) {
  if (!input || typeof input !== "string") return "";
  let text = input;

  // 1. 알려진 접두사 토큰 (OpenAI/Anthropic sk-, JWT eyJ, GitHub ghp_/github_pat_, Supabase sbp_, Google AIza, Slack xox, AWS AKIA 등)
  text = text.replace(
    /\b(?:sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]{5,})*|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{8,}|sbp_[A-Za-z0-9_]{8,}|sb_(?:secret|publishable)_[A-Za-z0-9_]{8,}|xox[baprs]-[A-Za-z0-9-]{8,}|AIza[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|vcp_[A-Za-z0-9_-]{8,})\b/g,
    REDACTED,
  );

  // 2. Bearer 헤더
  text = text.replace(/(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${REDACTED}`);

  // 3. URL 쿼리의 민감 파라미터
  text = text.replace(
    /([?&](?:token|wstoken|access_token|refresh_token|api_key|apikey|key|password|passwd|pwd|secret)=)(?!\[REDACTED\])[^&\s#)'"]+/gi,
    `$1${REDACTED}`,
  );

  // 4. 키=값 / 키: 값 형태의 비밀번호·토큰·키·학번 표기
  text = text.replace(
    /((?:password|passwd|pwd|secret|token|wstoken|api[_-]?key|apikey|access[_-]?key|service[_-]?role[_-]?key|anon[_-]?key|private[_-]?key|auth[_-]?token|authorization|비밀번호|패스워드|비밀키|토큰)\s*(?:[:=]|은|는)\s*)(['"`]?)(?!\[REDACTED\])([^\s'"`,;})\]>]+)\2/gi,
    `$1$2${REDACTED}$2`,
  );

  // 5. 긴 16진수(24자 이상) 또는 숫자와 문자가 섞인 긴 영숫자 토큰(24자 이상, 경로 슬래시 제외)
  text = text.replace(/\b[a-fA-F0-9]{24,}\b/g, REDACTED);
  text = text.replace(/\b(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{24,}\b/g, REDACTED);
  text = text.replace(/\b[A-Za-z0-9]{28,}\b/g, REDACTED);

  return text;
}

/**
 * 응답 본문을 한눈에 볼 수 있게 요약하고 비밀값을 가린다.
 * @param {string} raw
 * @param {number} maxLen
 * @returns {string}
 */
export function summarizeText(raw, maxLen = 280) {
  const cleaned = redactSecrets(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return "";
  const singleLine = cleaned.replace(/\s*\n\s*/g, " ⏎ ");
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen).trimEnd()}…`;
}

/**
 * 메시지 content 필드에서 텍스트를 추출한다.
 * @param {unknown} content
 * @returns {{ text: string; isToolResultOnly: boolean }}
 */
function extractContentText(content) {
  if (typeof content === "string") {
    return { text: content.trim(), isToolResultOnly: false };
  }
  if (!Array.isArray(content)) {
    return { text: "", isToolResultOnly: false };
  }

  const textParts = [];
  const toolNames = [];
  let hasToolResult = false;

  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const block = /** @type {Record<string, unknown>} */ (item);
    const type = typeof block.type === "string" ? block.type : "";

    if (
      (type === "text" || type === "input_text" || type === "output_text" || !type) &&
      typeof block.text === "string"
    ) {
      textParts.push(block.text.trim());
    } else if (type === "tool_use" && typeof block.name === "string") {
      toolNames.push(block.name);
    } else if (type === "tool_result") {
      hasToolResult = true;
    }
  }

  const joined = textParts.filter(Boolean).join("\n").trim();
  if (joined) {
    return { text: joined, isToolResultOnly: false };
  }
  if (toolNames.length > 0) {
    return { text: `[도구 실행: ${toolNames.join(", ")}]`, isToolResultOnly: false };
  }
  return { text: "", isToolResultOnly: hasToolResult };
}

/**
 * 타임스탬프 문자열 또는 파일 수정 시각에서 YYYY-MM-DD와 HH:MM:SS를 뽑는다.
 * @param {unknown} rawTs
 * @param {Date} fallbackDate
 * @returns {{ date: string; time: string }}
 */
function formatTimestamp(rawTs, fallbackDate) {
  let d = fallbackDate;
  if (typeof rawTs === "string" || typeof rawTs === "number") {
    const parsed = new Date(rawTs);
    if (!Number.isNaN(parsed.getTime())) {
      d = parsed;
    }
  }
  const iso = d.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
  };
}

/**
 * JSONL 텍스트를 파싱해 메타데이터와 프롬프트-응답 턴 목록을 반환한다.
 * @param {string} content
 * @param {{ defaultDate?: Date; sessionIdFallback?: string }} [options]
 */
export function parseJsonlContent(content, options = {}) {
  const fallbackDate = options.defaultDate ?? new Date();
  const lines = content.split(/\r?\n/);

  /** @type {Set<string>} */
  const cwds = new Set();
  let sessionId = options.sessionIdFallback ?? "unknown-session";
  /** @type {{ role: "user" | "assistant"; text: string; date: string; time: string }[]} */
  const messages = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== "object") continue;

    if (typeof obj.cwd === "string") cwds.add(obj.cwd);
    if (typeof obj.sessionId === "string") sessionId = obj.sessionId;
    if (typeof obj.session_id === "string") sessionId = obj.session_id;

    if (obj.type === "session_meta" && obj.payload && typeof obj.payload === "object") {
      if (typeof obj.payload.cwd === "string") cwds.add(obj.payload.cwd);
      if (typeof obj.payload.id === "string") sessionId = obj.payload.id;
      if (
        obj.payload.git &&
        typeof obj.payload.git === "object" &&
        typeof obj.payload.git.repository_url === "string"
      ) {
        cwds.add(obj.payload.git.repository_url);
      }
      continue;
    }

    const ts = formatTimestamp(
      obj.timestamp ?? obj.created_at ?? obj.createdAt ?? obj.payload?.timestamp,
      fallbackDate,
    );

    // 1) Claude Code / 일반 message 구조
    if (obj.type === "user" || obj.type === "assistant" || typeof obj.role === "string") {
      const role =
        obj.type === "user" || obj.role === "user"
          ? "user"
          : obj.type === "assistant" || obj.role === "assistant"
            ? "assistant"
            : null;
      if (role) {
        const rawContent = obj.message ? obj.message.content : obj.content;
        const { text, isToolResultOnly } = extractContentText(rawContent);
        if (!isToolResultOnly && text) {
          messages.push({ role, text, date: ts.date, time: ts.time });
        }
        continue;
      }
    }

    // 2) Codex response_item 구조
    if (obj.type === "response_item" && obj.payload && typeof obj.payload === "object") {
      const p = obj.payload;
      if (p.role === "user" || p.role === "assistant") {
        const { text, isToolResultOnly } = extractContentText(p.content);
        if (!isToolResultOnly && text) {
          messages.push({ role: p.role, text, date: ts.date, time: ts.time });
        }
        continue;
      }
    }

    // 3) Codex event_msg 구조
    if (obj.type === "event_msg" && obj.payload && typeof obj.payload === "object") {
      const p = obj.payload;
      if (p.type === "user_message" && typeof p.message === "string" && p.message.trim()) {
        messages.push({ role: "user", text: p.message.trim(), date: ts.date, time: ts.time });
        continue;
      }
      if (p.type === "agent_message" && typeof p.message === "string" && p.message.trim()) {
        messages.push({ role: "assistant", text: p.message.trim(), date: ts.date, time: ts.time });
        continue;
      }
    }

    // 4) Antigravity transcript 구조
    if (obj.type === "USER_INPUT" && typeof obj.content === "string" && obj.content.trim()) {
      messages.push({ role: "user", text: obj.content.trim(), date: ts.date, time: ts.time });
      continue;
    }
    if (obj.type === "PLANNER_RESPONSE" && typeof obj.content === "string" && obj.content.trim()) {
      messages.push({ role: "assistant", text: obj.content.trim(), date: ts.date, time: ts.time });
      continue;
    }

    // 5) 단순 { prompt, response } 구조
    if (typeof obj.prompt === "string" && obj.prompt.trim()) {
      messages.push({ role: "user", text: obj.prompt.trim(), date: ts.date, time: ts.time });
      if (typeof obj.response === "string" && obj.response.trim()) {
        messages.push({ role: "assistant", text: obj.response.trim(), date: ts.date, time: ts.time });
      }
    }
  }

  // 연속된 user 프롬프트와 이어지는 assistant 응답을 하나의 턴으로 묶는다.
  /** @type {{ sessionId: string; date: string; time: string; prompt: string; responseSummary: string }[]} */
  const turns = [];
  let currentTurn = null;

  for (const msg of messages) {
    if (msg.role === "user") {
      if (currentTurn && !currentTurn.responseParts.length) {
        currentTurn.promptParts.push(msg.text);
      } else {
        if (currentTurn) {
          turns.push({
            sessionId,
            date: currentTurn.date,
            time: currentTurn.time,
            prompt: summarizeText(currentTurn.promptParts.join("\n"), 500),
            responseSummary: summarizeText(currentTurn.responseParts.join("\n"), 320) || "(응답 없음)",
          });
        }
        currentTurn = {
          date: msg.date,
          time: msg.time,
          promptParts: [msg.text],
          responseParts: [],
        };
      }
    } else if (msg.role === "assistant") {
      if (!currentTurn) {
        currentTurn = {
          date: msg.date,
          time: msg.time,
          promptParts: ["(이전 컨텍스트 이어짐)"],
          responseParts: [msg.text],
        };
      } else {
        currentTurn.responseParts.push(msg.text);
      }
    }
  }

  if (currentTurn) {
    turns.push({
      sessionId,
      date: currentTurn.date,
      time: currentTurn.time,
      prompt: summarizeText(currentTurn.promptParts.join("\n"), 500),
      responseSummary: summarizeText(currentTurn.responseParts.join("\n"), 320) || "(응답 없음)",
    });
  }

  return { sessionId, cwds: Array.from(cwds), turns };
}

/**
 * 폴더 아래의 모든 *.jsonl 파일을 재귀적으로 찾는다.
 * @param {string} targetPath
 * @returns {string[]}
 */
function findJsonlFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    return [];
  }
  if (stat.isFile()) {
    return targetPath.endsWith(".jsonl") ? [targetPath] : [];
  }
  if (!stat.isDirectory()) return [];

  /** @type {string[]} */
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(targetPath, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "backups") {
      continue;
    }
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * 파일 경로 또는 cwd 목록이 현재 레포에 해당하는지 확인한다.
 * @param {string} filePath
 * @param {string[]} cwds
 * @param {string} repoDir
 * @returns {boolean}
 */
function matchesRepo(filePath, cwds, repoDir) {
  const normRepo = path.resolve(repoDir).replace(/\\/g, "/").toLowerCase();
  const repoBase = path.basename(normRepo).toLowerCase();
  const repoSlug = normRepo.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const normFile = filePath.replace(/\\/g, "/").toLowerCase();
  const fileSlug = normFile.replace(/[^a-z0-9]+/g, "-");

  if (repoSlug && fileSlug.includes(repoSlug)) return true;
  if (repoBase && normFile.includes(repoBase)) return true;
  if (normFile.includes("cicada")) return true;

  if (cwds.length === 0) {
    // ~/.claude/projects/<다른-프로젝트> 폴더 소속이 아니면 허용
    const projectsMatch = normFile.match(/\/\.claude\/projects\/([^/]+)\//);
    if (projectsMatch) {
      const slug = projectsMatch[1].toLowerCase();
      return slug.includes(repoBase) || slug.includes("cicada");
    }
    return true;
  }

  for (const c of cwds) {
    const normCwd = c.replace(/\\/g, "/").toLowerCase();
    if (
      normCwd.includes(normRepo) ||
      normRepo.includes(normCwd) ||
      (repoBase && normCwd.includes(repoBase)) ||
      normCwd.includes("cicada")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * CLI 인자를 파싱한다.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const claudeDirs = [];
  /** @type {string[]} */
  const codexDirs = [];
  /** @type {string[]} */
  const customDirs = [];
  let outDir = path.resolve(process.cwd(), "docs/prompt-log/raw");
  let repoDir = process.cwd();
  let filterByRepo = true;
  let explicitRepoFilter = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inlineVal] = arg.startsWith("--") && arg.includes("=") ? arg.split("=", 2) : [arg, null];
    const nextVal = () => (inlineVal !== null ? inlineVal : argv[++i]);

    if (flag === "--claude-dir" || flag === "--claude") {
      const v = nextVal();
      if (v) claudeDirs.push(path.resolve(v));
    } else if (flag === "--codex-dir" || flag === "--codex") {
      const v = nextVal();
      if (v) codexDirs.push(path.resolve(v));
    } else if (flag === "--dir" || flag === "--input" || flag === "-d" || flag === "--path") {
      const v = nextVal();
      if (v) customDirs.push(path.resolve(v));
    } else if (flag === "--out-dir" || flag === "--output" || flag === "-o") {
      const v = nextVal();
      if (v) outDir = path.resolve(v);
    } else if (flag === "--repo" || flag === "--cwd") {
      const v = nextVal();
      if (v) {
        repoDir = path.resolve(v);
        explicitRepoFilter = true;
      }
    } else if (flag === "--all") {
      filterByRepo = false;
    } else if (!arg.startsWith("-")) {
      customDirs.push(path.resolve(arg));
    }
  }

  return {
    claudeDirs,
    codexDirs,
    customDirs,
    outDir,
    repoDir,
    filterByRepo,
    explicitRepoFilter,
  };
}

/**
 * 프롬프트 로그를 수집해 `docs/prompt-log/raw/<도구>-<날짜>.md` 파일들로 저장한다.
 * @param { Partial<ReturnType<typeof parseArgs>> } [opts]
 */
export function collectPromptLogs(opts = {}) {
  const home = os.homedir();
  const outDir = opts.outDir ?? path.resolve(process.cwd(), "docs/prompt-log/raw");
  const repoDir = opts.repoDir ?? process.cwd();
  const hasExplicitInput =
    (opts.claudeDirs && opts.claudeDirs.length > 0) ||
    (opts.codexDirs && opts.codexDirs.length > 0) ||
    (opts.customDirs && opts.customDirs.length > 0);

  /** @type {{ tool: "claude" | "codex"; dir: string; explicit: boolean }[]} */
  const sources = [];

  if (opts.claudeDirs && opts.claudeDirs.length > 0) {
    for (const d of opts.claudeDirs) sources.push({ tool: "claude", dir: d, explicit: true });
  } else if (!hasExplicitInput) {
    const defaultClaudeDirs = [
      path.join(home, ".claude", "projects"),
      path.join(home, ".claude"),
    ];
    if (process.env.CLAUDE_CONFIG_DIR) {
      defaultClaudeDirs.push(
        path.join(process.env.CLAUDE_CONFIG_DIR, "projects"),
        process.env.CLAUDE_CONFIG_DIR,
      );
    }
    for (const d of defaultClaudeDirs) {
      sources.push({ tool: "claude", dir: d, explicit: false });
    }
  }

  if (opts.codexDirs && opts.codexDirs.length > 0) {
    for (const d of opts.codexDirs) sources.push({ tool: "codex", dir: d, explicit: true });
  } else if (!hasExplicitInput) {
    const defaultCodexDirs = [path.join(home, ".codex", "sessions")];
    if (process.env.CODEX_HOME) {
      defaultCodexDirs.push(path.join(process.env.CODEX_HOME, "sessions"));
    }
    for (const d of defaultCodexDirs) {
      sources.push({ tool: "codex", dir: d, explicit: false });
    }
  }

  if (opts.customDirs && opts.customDirs.length > 0) {
    for (const d of opts.customDirs) {
      const lower = d.toLowerCase();
      const inferredTool = lower.includes("codex") ? "codex" : "claude";
      sources.push({ tool: inferredTool, dir: d, explicit: true });
    }
  }

  /** @type {Set<string>} */
  const visitedFiles = new Set();
  /** @type {Map<string, { tool: string; date: string; turns: { sessionId: string; date: string; time: string; prompt: string; responseSummary: string }[] }>} */
  const grouped = new Map();

  for (const source of sources) {
    const files = findJsonlFiles(source.dir);
    for (const file of files) {
      const resolved = path.resolve(file);
      if (visitedFiles.has(resolved)) continue;
      visitedFiles.add(resolved);

      let content = "";
      let stat;
      try {
        content = fs.readFileSync(resolved, "utf8");
        stat = fs.statSync(resolved);
      } catch {
        continue;
      }

      const fallbackId = path.basename(resolved, ".jsonl");
      const parsed = parseJsonlContent(content, {
        defaultDate: stat.mtime,
        sessionIdFallback: fallbackId,
      });

      if (parsed.turns.length === 0) continue;

      const shouldFilter =
        opts.filterByRepo !== false && (!source.explicit || opts.explicitRepoFilter === true);
      if (shouldFilter && !matchesRepo(resolved, parsed.cwds, repoDir)) {
        continue;
      }

      const fileLower = resolved.toLowerCase();
      const tool = fileLower.includes("codex") ? "codex" : source.tool;

      for (const turn of parsed.turns) {
        const key = `${tool}-${turn.date}`;
        let bucket = grouped.get(key);
        if (!bucket) {
          bucket = { tool, date: turn.date, turns: [] };
          grouped.set(key, bucket);
        }
        bucket.turns.push(turn);
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });

  /** @type {string[]} */
  const writtenFiles = [];

  for (const [key, bucket] of grouped.entries()) {
    const filePath = path.join(outDir, `${key}.md`);
    const sessions = new Map();
    for (const t of bucket.turns) {
      if (!sessions.has(t.sessionId)) sessions.set(t.sessionId, []);
      sessions.get(t.sessionId).push(t);
    }

    const lines = [
      `# 프롬프트 로그 — ${bucket.tool} (${bucket.date})`,
      "",
      `- 도구: \`${bucket.tool}\``,
      `- 날짜: \`${bucket.date}\``,
      `- 세션 수: ${sessions.size}`,
      `- 프롬프트 수: ${bucket.turns.length}`,
      "",
    ];

    for (const [sessionId, sessionTurns] of sessions.entries()) {
      lines.push(`## 세션 \`${redactSecrets(sessionId)}\``);
      lines.push("");
      sessionTurns.forEach((t, idx) => {
        lines.push(`### ${idx + 1}. [${t.time}]`);
        lines.push(`- **프롬프트**: ${t.prompt}`);
        lines.push(`- **응답 요약**: ${t.responseSummary}`);
        lines.push("");
      });
    }

    fs.writeFileSync(filePath, `${lines.join("\n").trimEnd()}\n`, "utf8");
    writtenFiles.push(filePath);
  }

  return {
    scannedFiles: visitedFiles.size,
    writtenFiles,
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const result = collectPromptLogs(parsedArgs);
  if (result.writtenFiles.length === 0) {
    console.log(
      `[collect-prompt-logs] 스캔한 JSONL ${result.scannedFiles}개 중 수집된 프롬프트 로그가 없습니다.`,
    );
  } else {
    console.log(
      `[collect-prompt-logs] ${result.writtenFiles.length}개 파일 생성 완료:\n` +
        result.writtenFiles.map((f) => `  - ${f}`).join("\n"),
    );
  }
}
