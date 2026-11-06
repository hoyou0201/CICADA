# 3D 에셋 기록

이슈 #81. 모델 파일은 `public/models/`에 둔다. AI 생성 대신 무료 공개 에셋을 받아 썼다(리더 확인함). 그래서 프롬프트는 없다.

| 파일 | 용도 | 출처 | 프롬프트 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| `public/models/student-1.glb` | 학생 1 | Khronos glTF-Sample-Assets `CesiumMan` — https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan | 해당 없음(무료 에셋) | CC BY 4.0 (© 2017 Cesium) — 저작자 표기 필요 | 원본 그대로, 걷기 애니메이션 포함 |
| `public/models/professor.glb` | 교수님 | three.js 예제 `RobotExpressive` (Tomás Laulhé / Quaternius, Don McCurdy 수정) — https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive | 해당 없음(무료 에셋) | CC0 1.0 | 원본 그대로, 표정 morph target 포함 |

- 학생 2종째(`student-2.glb`)는 선택 사항이라 넣지 않았다. 색·머리 프리셋은 1종을 재질로 바꾸는 방식으로 처리할 수 있다.
- CC BY 4.0 표기 문구(화면 또는 크레딧에 넣을 것): "Student model: CesiumMan © 2017 Cesium, CC BY 4.0".
