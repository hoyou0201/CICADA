# 3D 에셋 기록

이슈 #81. 모델 파일은 `public/models/`에 둔다. AI 생성 대신 무료 공개 에셋을 받아 썼다(리더 확인함). 그래서 프롬프트는 없다.

| 파일 | 용도 | 출처 | 프롬프트 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| `public/models/professor-elder.glb` | 교수님 | Chibi People Starter `person-elder-a` (Absurdox Lab) — https://olha-m.itch.io/chibi-people-starter | 해당 없음(무료 에셋) | 상업 이용 가능, 재배포 금지, 표기 불필요 | 원본 그대로 |
| `public/models/student-woman.glb` | 학생 1 | 같은 팩 `person-guest-a` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-man.glb` | 학생 2 | 같은 팩 `person-guest-b` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-kid.glb` | 학생 3 | 같은 팩 `person-kid-a` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-waiter.glb` | 학생 4 | 같은 팩 `person-waiter-a` | 해당 없음 | 같음 | 원본 그대로 |

- 스키닝 없이 몸 부위 노드를 돌리는 방식의 애니메이션이다(`idle`, `walk`, `sit`, `holding-both`, `emote-yes`, `emote-no`).
- 손들기 클립이 없어서 `GlbAvatar`가 오른팔(`arm-right`) 노드를 코드로 들어 올린다(`RAISE_HAND`). 교수님 말하기는 `emote-yes`(끄덕임)를 쓴다.
- 팩 라이선스 문서에 "AI 도움으로 절차적으로 생성한 뒤 사람이 선별했다"고 적혀 있다.
- 재배포 금지라서 저장소를 공개로 바꾸면 위 GLB 5개도 빼야 한다.

## 강의실 소품

| 파일 | 출처 | 라이선스 | 용도 |
|---|---|---|---|
| `student_desk`, `student_chair`, `world_map`, `teacher_desk`, `globe`, `open_book`, `pencil_cup`, `backpack`, `books_stack`, `paper_trash_bin`, `bench`, `cubby_shelf`, `wall_clock`, `flagpole` | Low Poly School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-school-pack | 상업 이용 가능, 재배포 금지, 표기 불필요 | 책상, 의자, 세계지도, 교탁과 책상 위 소품, 수납장, 벤치, 시계, 깃대 |
| `bookshelf_tall`, `locker_row` | Low Poly Library & School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-library-school-pack | 같음 | 책장, 사물함 |
| `lamp_standing`, `pictureframe_medium` | KayKit Furniture Bits 1.0 (Kay Lousberg) — https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | CC0 1.0 | 램프, 액자 |
| `banner_patternA_blue` | KayKit Dungeon Remastered 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 | CC0 1.0 | 현수막 |

- School Pack 두 개도 재배포가 금지라서 이 저장소는 비공개로 유지해야 한다. 공개로 바꾸면 School Pack에서 온 `public/models/props/` 파일(위 표 첫 두 줄)을 모두 빼야 한다.
- 바닥은 모델 없이 `Room.tsx`에서 canvas로 그린 마룻바닥 무늬를 쓴다.
