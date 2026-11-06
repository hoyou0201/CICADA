# 강의실 소리

| 파일 | 용도 | 출처 | 라이선스 |
| --- | --- | --- | --- |
| `public/audio/birds.mp3` | 창밖 새소리 | stephan, PDSounds “Birdsong mild sunny day” (2007-04-17, 독일의 밝은 숲). 원본: https://commons.wikimedia.org/wiki/File:Birdsong_mild_sunny_day.ogg | 퍼블릭 도메인. 저작자 stephan이 권리를 포기했다. |
| (파일 없음) | 실내 잔향 | `src/audio/ambient.ts`의 `makeClassroomImpulse`가 작은 강의실의 초기 반사와 약 0.5초 감쇠로 합성한다. | 해당 없음 |
| (파일 없음) | 잔향만 켤 때의 실내 바닥음 | 같은 파일의 `makeRoomTone`이 낮은 잡음으로 합성한다. | 해당 없음 |

`birds.mp3`는 브라우저에서 재생하려고 원본 Ogg Vorbis를 모노 MP3로 바꾼 것이다. 앞뒤를 짧게 페이드해 반복할 때 경계가 덜 튀게 했다.
