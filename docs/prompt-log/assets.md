# 3D 에셋 기록

이슈 #81. 모델 파일은 `public/models/`에 둔다. AI 생성 대신 무료 공개 에셋을 받아 썼다(리더 확인함). 그래서 프롬프트는 없다.

| 파일 | 용도 | 출처 | 프롬프트 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| `public/models/professor-bear.glb` | 교수님 | Plumberry Plains Vol.2 `bruno-the-bear` (Chibipup) — https://chibipup.itch.io/plumberry-plains-vol-2-even-more-free-animal-friends-for-your-village | 해당 없음(무료 에셋) | 상업 이용 가능, 재배포 금지, AI 학습 금지, 표기 불필요 | 원본 그대로 |
| `public/models/student-rabbit.glb` | 학생 1 | 같은 팩 `kiki-the-rabbit` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-fox.glb` | 학생 2 | 같은 팩 `zinnia-the-fox` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-hamster.glb` | 학생 3 | 같은 팩 `freya-the-hamster` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-mouse.glb` | 학생 4 | 같은 팩 `poppy-the-mouse` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-duck.glb` | 학생 5 | 같은 팩 `ernie-the-duck` | 해당 없음 | 같음 | 원본 그대로 |
| `public/models/student-penguin.glb` | 학생 6 | 같은 팩 `orson-the-penguin` | 해당 없음 | 같음 | 원본 그대로 |

- 클립 26개가 모델에 들어 있고 스키닝 없이 노드를 돌리는 방식이다. 쓰는 클립은 `idle`, `walk`, 손들기 `wave`, 교수님 말하기 `talk`다.
- itch.io 페이지에 "AI Assisted" 태그가 붙어 있다(어느 부분인지는 밝히지 않음). 대회 규정의 AI 에셋 허용 여부를 확인해야 한다.
- 재배포 금지라서 저장소를 공개로 바꾸면 위 GLB 7개도 빼야 한다.

## 강의실 소품

| 파일 | 출처 | 라이선스 | 용도 |
|---|---|---|---|
| `student_desk`, `student_chair`, `world_map`, `teacher_desk`, `globe`, `open_book`, `pencil_cup`, `backpack`, `books_stack`, `paper_trash_bin`, `bench`, `cubby_shelf` | Low Poly School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-school-pack | 상업 이용 가능, 재배포 금지, 표기 불필요 | 책상, 의자, 세계지도, 교탁과 책상 위 소품, 수납장, 벤치 |
| `bookshelf_tall`, `locker_row` | Low Poly Library & School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-library-school-pack | 같음 | 책장, 사물함 |
| `lamp_standing`, `pictureframe_medium` | KayKit Furniture Bits 1.0 (Kay Lousberg) — https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | CC0 1.0 | 램프, 액자 |

- School Pack 두 개도 재배포가 금지라서 이 저장소는 비공개로 유지해야 한다. 공개로 바꾸면 School Pack에서 온 `public/models/props/` 파일(위 표 첫 두 줄)을 모두 빼야 한다.
- 바닥은 모델 없이 `Room.tsx`에서 canvas로 그린 마룻바닥 무늬를 쓴다.
- 태극기, 급훈, 시간표(예시), 벽시계는 모델 없이 `KoreanDecor.tsx`에서 canvas로 그린다.
