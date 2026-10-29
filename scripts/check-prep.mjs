import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md', 'AGENTS.md', 'CLAUDE.md', '.cursor/rules/team.mdc',
  '.editorconfig', '.gitattributes', '.gitignore',
  'docs/TEAM.md', 'docs/READY.md', 'docs/BRIEF.md', 'docs/PROMPTS.md',
  'docs/DEMO.md', 'docs/SOURCES.md', 'docs/STATUS.md',
  '.github/PULL_REQUEST_TEMPLATE.md', '.github/workflows/prep-check.yml',
  'scripts/doctor.mjs', 'scripts/check-prep.mjs',
];
let failures = 0;
let localLinks = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
  }
}
const content = new Map();
for (const file of required) {
  const path = resolve(root, file);
  check(existsSync(path), `필수 파일 누락: ${file}`);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');
  content.set(file, text);
  check(text.endsWith('\n'), `마지막 줄바꿈 누락: ${file}`);
  check(!text.split(/\r?\n/).some((line) => /[\t ]+$/.test(line)), `줄 끝 공백: ${file}`);
  if (!/\.(md|mdc)$/.test(file)) continue;
  // 이 키트의 inline 문서 링크만 검사한다. 코드 예제·외부 URL·앵커는 대상에서 제외.
  const prose = text.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  for (const match of prose.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue;
    localLinks += 1;
    const relativePath = decodeURIComponent(target.split(/[?#]/)[0]);
    check(existsSync(resolve(dirname(path), relativePath)), `끊어진 링크: ${file} → ${target}`);
  }
}
check(/^@AGENTS\.md\s*$/m.test(content.get('CLAUDE.md') ?? ''), 'CLAUDE.md의 AGENTS.md import 누락');
const cursor = content.get('.cursor/rules/team.mdc') ?? '';
check(/^---\r?\n[\s\S]*?alwaysApply: true\r?\n[\s\S]*?---\r?\n/.test(cursor), 'Cursor 상시 적용 frontmatter 누락');
check(cursor.includes('../../AGENTS.md'), 'Cursor의 공통 규칙 연결 누락');

const ignoreCases = [
  ['.env', true], ['.env.local', true], ['.env.production', true],
  ['.env.production.local', true], ['.env.example', false],
  ['.env.production.example', false], ['server/.env', true],
  ['server/.env.local', true], ['server/.env.example', false],
  ['test-secret.pem', true], ['test-secret.key', true],
];
for (const [path, ignored] of ignoreCases) {
  const result = spawnSync('git', ['check-ignore', '--no-index', '--quiet', path], {
    cwd: root, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  check(result.status === (ignored ? 0 : 1), `Git 제외 규칙 불일치: ${path} (기대: ${ignored ? '제외' : '공유 가능'})`);
}

if (!failures) {
  console.log(`OK 준비 파일 ${required.length}개 / 로컬 링크 ${localLinks}개 / AI 규칙 연결 / Git 제외 사례 ${ignoreCases.length}개`);
  console.log('범위: 준비 키트만 검사. 외부 링크 접속·비밀값 전체 탐지·AI 실제 로딩·앱·배포는 NOT RUN.');
} else {
  console.error(`준비 검사 실패 ${failures}개`);
}
process.exitCode = failures ? 1 : 0;
