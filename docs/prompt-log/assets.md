# 3D 에셋 기록

이슈 #81. 모델 파일은 `public/models/`에 둔다. AI 생성 대신 무료 공개 에셋을 받아 썼다(리더 확인함). 그래서 프롬프트는 없다.

| 파일 | 용도 | 출처 | 프롬프트 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| `public/models/professor-office-lady.glb` | 교수님 | Gobkit Free Character Pack Vol.1 `OfficeLady` — https://gobkit.itch.io/gobkit-free-character-pack-vol-1 | 해당 없음(무료 에셋) | CC0 1.0 | 원본 그대로 |
| `public/models/student-schoolkid.glb` | 학생 1 | 같은 팩 `Schoolkid` | 해당 없음 | CC0 1.0 | 원본 그대로 |
| `public/models/student-courier.glb` | 학생 2 | 같은 팩 `FoodCourier` | 해당 없음 | CC0 1.0 | 원본 그대로 |
| `public/models/student-cashier.glb` | 학생 3 | 같은 팩 `Cashier` | 해당 없음 | CC0 1.0 | 원본 그대로 |
| `public/models/student-clerk.glb` | 학생 4 | 같은 팩 `StockClerk` | 해당 없음 | CC0 1.0 | 원본 그대로 |

- 애니메이션은 모델에 들어 있다(`Idle`, `Walk`, 손들기·교수님 말하기 `Special`). 캐릭터마다 Special 동작이 다르다(손 흔들기, 점프, 환호).
- Kinemiq 무료 애니메이션 팩은 스켈레톤이 달라서(66본 vs 13본) 쓰지 않았다.

## 강의실 소품

| 파일 | 출처 | 라이선스 | 용도 |
|---|---|---|---|
| `student_desk`, `student_chair`, `world_map` | Low Poly School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-school-pack | 상업 이용 가능, 재배포 금지, 표기 불필요 | 책상, 의자, 세계지도 |
| `bookshelf_tall`, `locker_row` | Low Poly Library & School Pack (reodesuxz) — https://reodesuxz.itch.io/low-poly-library-school-pack | 같음 | 책장, 사물함 |
| `lamp_standing`, `rug_rectangle_A`, `pictureframe_medium` | KayKit Furniture Bits 1.0 (Kay Lousberg) — https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | CC0 1.0 | 램프, 러그, 액자 |
| `floor_wood_large`, `floor_wood_large_dark`, `banner_patternA_blue` | KayKit Dungeon Remastered 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 | CC0 1.0 | 나무 바닥 타일, 현수막 |

- School Pack 두 개는 재배포가 금지라서 이 저장소는 비공개로 유지해야 한다. 공개로 바꾸면 `student_desk`, `student_chair`, `world_map`, `bookshelf_tall`, `locker_row`를 빼야 한다.
