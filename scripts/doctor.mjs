import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 로컬 읽기 전용 점검. 네트워크·로그인·설치·Git 변경은 수행하지 않는다.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const major = Number(process.versions.node.split('.')[0]);
let failures = 0;
let warnings = 0;
const run = (command, args) => spawnSync(command, args, {
  cwd: root,
  encoding: 'utf8',
  timeout: 5000,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
});
function report(status, label, detail) {
  if (status === 'FAIL') failures += 1;
  if (status === 'WARN') warnings += 1;
  console.log(`${status} ${label}: ${detail}`);
}

console.log('CICADA 로컬 준비 점검 (계정·팀원·배포 검증과 별도)');
report(major >= 22 ? 'OK' : 'FAIL', 'Node.js', `${process.version} (필요: 22+)`);

const git = run('git', ['--version']);
report(git.status === 0 ? 'OK' : 'FAIL', 'Git', git.status === 0 ? git.stdout.trim() : '실행 불가');
if (git.status === 0) {
  const repo = run('git', ['rev-parse', '--is-inside-work-tree']);
  report(repo.status === 0 ? 'OK' : 'FAIL', '저장소', repo.status === 0 ? 'Git 작업 디렉터리 확인' : 'Git 저장소 아님');
  if (repo.status === 0) {
    const branch = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    report(branch.status === 0 ? 'OK' : 'WARN', '브랜치', branch.status === 0 ? branch.stdout.trim() : 'detached HEAD; 작업 브랜치 확인 필요');
    for (const key of ['user.name', 'user.email']) {
      const configured = run('git', ['config', '--get', key]);
      // 개인정보의 실제 값은 출력하지 않는다.
      report(configured.status === 0 && configured.stdout.trim() ? 'OK' : 'WARN', key, configured.status === 0 && configured.stdout.trim() ? '설정됨 (값 출력 생략)' : '미설정; 커밋 전 확인');
    }
    const remotes = run('git', ['remote']);
    report(remotes.status === 0 && remotes.stdout.split(/\r?\n/).includes('origin') ? 'OK' : 'WARN', 'origin', remotes.status === 0 && remotes.stdout.split(/\r?\n/).includes('origin') ? '등록됨; 접근·쓰기 권한은 별도 확인' : '원격 등록 확인 필요');
    const state = run('git', ['status', '--porcelain=v1', '--untracked-files=normal']);
    if (state.status !== 0) {
      report('FAIL', '작업 상태', '조회 실패');
    } else {
      report(state.stdout.trim() ? 'WARN' : 'OK', '작업 상태', state.stdout.trim() ? '미커밋/미추적 변경 있음; 브랜치 전환 전에 보존' : '깨끗함');
    }
  }
}

console.log('\n참고: 아래는 PATH의 명령 유무이며 앱 설치·로그인 상태가 아닙니다.');
for (const command of ['orca', 'codex', 'claude', 'cursor', 'antigravity', 'gh']) {
  const found = process.platform === 'win32'
    ? run('where.exe', [command])
    : run('/bin/sh', ['-c', 'command -v "$1" >/dev/null 2>&1', 'doctor', command]);
  console.log(`INFO ${command}: ${found.status === 0 ? '명령 있음' : 'PATH에 없음 (필수 아님)'}`);
}

console.log(`\n로컬 필수 오류 ${failures}개 / 로컬 확인 필요 ${warnings}개`);
console.log('NOT RUN AI 로그인·규칙 실제 로딩 / 원격 권한 / 팀원 환경 / 앱·브라우저·배포');
console.log('다음: node scripts/check-prep.mjs → docs/READY.md 공동 확인');
process.exitCode = failures ? 1 : 0;
