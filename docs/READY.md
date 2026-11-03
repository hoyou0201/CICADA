# 대회 전 준비 체크리스트

확인한 것에만 체크한다. 체크하지 않은 항목은 미확인이다.

## 계정과 권한
- [ ] 세 명 모두 이 저장소의 collaborator다 (push 가능).
- [ ] 각자 `gh auth status`가 정상이다.
- [ ] 각자 별도 clone에서 브랜치를 만들어 push해 봤다.

## AI 도구
- [ ] 각자 쓰는 도구에서 저장소 **루트**를 열고 첫 대화로 `AGENTS.md`를 읽는지 확인했다 (읽은 파일 경로와 작업 루프를 요약하게 한다).
- [ ] 자동으로 읽지 않는 도구는 `AGENTS.md`를 대화에 첨부하면 되는 것을 확인했다.

## Plankton (상태 보기)
- [ ] https://plankton.hoyou.dev 에 각자 GitHub로 로그인되고, 이 저장소를 연결하면 보인다.
- [ ] (선택) 리더 화면에서 사람별 여유를 보고 싶으면 `.plankton.example.yml`을 `.plankton.yml`로 복사해 팀원 GitHub 아이디를 적어 커밋했다. 없어도 담당자로 등장한 사람이 팀원으로 잡힌다.
- [ ] 읽기 전용 토큰을 만들어 `PLANKTON_TOKEN` 환경 변수로 넣었다. GitHub → Settings → Developer settings → Fine-grained tokens, 이 저장소만 선택, Issues·Pull requests·Contents·Metadata 모두 Read-only.

## 배포
- [ ] 쓸 배포 서비스에 로그인해 두었다 (스택이 정해지면 빈 배포를 한 번 해 본다).

## 리허설
- [ ] `contest-topic`의 연습 모드로 `contest-plan`, `contest-split`까지 한 번 돌려 봤다 (연습용 레포에서).
