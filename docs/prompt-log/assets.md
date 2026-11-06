# 3D 에셋 기록

이슈 #81. 모델 파일은 `public/models/`에 둔다. AI 생성 대신 무료 공개 에셋을 받아 썼다(리더 확인함). 그래서 프롬프트는 없다.

| 파일 | 용도 | 출처 | 프롬프트 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| `public/models/professor-mage.glb` | 교수님 | KayKit Adventurers 1.0 `Mage` (Kay Lousberg) — https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | 해당 없음(무료 에셋) | CC0 1.0 | 손에 든 물건(지팡이·책) 제거, 텍스처 512px WebP로 축소, 애니메이션 리샘플 |
| `public/models/student-knight.glb` | 학생 1 | 같은 팩 `Knight` | 해당 없음 | CC0 1.0 | 무기·방패 제거, 같은 처리 |
| `public/models/student-barbarian.glb` | 학생 2 | 같은 팩 `Barbarian` | 해당 없음 | CC0 1.0 | 같은 처리 |
| `public/models/student-rogue.glb` | 학생 3 | 같은 팩 `Rogue` | 해당 없음 | CC0 1.0 | 같은 처리 |
| `public/models/student-rogue-hooded.glb` | 학생 4 | 같은 팩 `Rogue_Hooded` | 해당 없음 | CC0 1.0 | 같은 처리 |

- 애니메이션은 모델에 들어 있다(`Idle`, `Walking_A`, 교수님 말하기 `Spellcasting`).
- 가공은 gltf-transform으로 했다(손에 든 메시 제거, 텍스처 축소). 원본 모델은 CC0라 저작자 표기 의무는 없다.

## 강의실 소품

모두 Kay Lousberg(KayKit)의 CC0 에셋이다. 텍스처를 256px WebP로 줄였을 뿐 모양은 원본 그대로다. 파일은 `public/models/props/`에 있다.

| 파일 | 출처 | 용도 |
|---|---|---|
| `table_medium`, `chair_A_wood`, `cabinet_medium_decorated`, `shelf_B_large_decorated`, `lamp_standing`, `rug_rectangle_A`, `pictureframe_large_A`, `pictureframe_medium` | KayKit Furniture Bits 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | 책상, 의자, 캐비닛, 선반, 램프, 러그, 액자 |
| `floor_wood_large`, `floor_wood_large_dark`, `banner_patternA_blue` | KayKit Dungeon Remastered 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 | 나무 바닥 타일, 현수막 |

