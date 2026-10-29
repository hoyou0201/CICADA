# 공식 설정 근거

확인일: 2026-10-29. 문서에 따른 파일 준비이며, 각 팀원의 앱에서 실제 적용됐다는 의미는 아니다.
지원 상태는 바뀔 수 있으므로 설치된 버전에서 첫 대화로 확인한다.

| 항목 | 확인한 내용 | 공식 문서 |
| --- | --- | --- |
| Codex | 저장소 AGENTS.md를 프로젝트 지침으로 사용 | [OpenAI Docs: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| Claude Code | CLAUDE.md에서 `@AGENTS.md`로 공통 파일 import 가능 | [Claude Code: memory](https://code.claude.com/docs/en/memory) |
| Cursor | AGENTS.md 지원, `.cursor/rules/*.mdc`의 `alwaysApply: true` 지원 | [Cursor: rules](https://cursor.com/docs/rules) |
| Antigravity | 루트 AGENTS.md를 디렉터리 범위 상시 규칙으로 지원 | [Antigravity: rules](https://antigravity.google/docs/rules/) |
| Node.js | 지원 중인 LTS 계열 선택, 준비 CI에서는 26 사용 | [Node.js releases](https://nodejs.org/en/about/previous-releases) |
| 준비 CI | 공식 예제의 checkout/setup-node v7 사용, 앱 검사와 별도 | [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node) |

Antigravity 공식 문서에는 `.agents/rules/*.md`와 이전 `.agent/rules/*.md` 지원도 있다.
이 저장소는 경로별 규칙 복제 없이 공통 AGENTS.md를 직접 사용하는 방식으로 준비했다.
Cursor의 작은 연결 파일과 Claude import도 같은 원본을 가리킨다.
