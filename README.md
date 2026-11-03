# CICADA

3인 대회용 협업 저장소. 할 일을 사람에게 미리 나누지 않고 **작은 GitHub 이슈의 공용 풀**로 두고, 각자의 AI 에이전트가 착수 가능한 일을 집어 병렬로 처리한다. 상태는 [Plankton](https://plankton.hoyou.dev)에서 본다.

## 흐름

1. [대회 전 준비](docs/READY.md)를 확인한다.
2. 주제가 공개되면 스킬을 순서대로 쓴다: `contest-topic` → `contest-plan` → `contest-split`. 결과는 [docs/BRIEF.md](docs/BRIEF.md)와 GitHub 이슈에 쌓인다.
3. 에이전트는 [AGENTS.md](AGENTS.md)의 작업 루프대로 일을 고르고, 만들고, 합친다.
4. 마지막 15%는 [발표 준비](docs/DEMO.md).

## 구성

| 경로 | 내용 |
| --- | --- |
| `AGENTS.md` | 모든 AI 도구가 따르는 규칙과 작업 루프 |
| `docs/BRIEF.md` | 계획의 단일 원본 (스킬이 채운다) |
| `.claude/skills/` | `contest-topic`, `contest-plan`, `contest-split` |
| `.plankton.example.yml` | 팀원과 동시 작업 수 설정 예시 |
