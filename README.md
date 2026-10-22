# Nexus 읽기 지도

유발 하라리 『Nexus: A Brief History of Information Networks from the Stone Age to AI』를
챕터별 흐름, 전체 논지, 핵심 인용구 중심으로 정리한 인터랙티브 요약 페이지입니다.
처음 보는 사람이 이 페이지만 읽어도 책의 뼈대를 잡을 수 있도록 만들었습니다.

**배포 주소**: https://hyeseungk.github.io/nexus_summary/ (GitHub Pages를 켠 뒤)

## 구성

| 영역 | 내용 |
|---|---|
| 3D 여정 | three.js 네트워크(13개 노드)를 GSAP ScrollTrigger로 고정하고, 스크롤에 따라 5개 장면(문제의식, Part I~III, 에필로그)을 카메라가 이동 |
| 세 관점 비교 | 순진한 관점, 포퓰리즘적 관점, 이 책의 관점을 탭으로 비교하고 "책 전체를 다섯 줄로" 요약 |
| 챕터 카드 | 13개 구간 카드. 누르면 핵심 / 흐름 / 개념 / 인용구 / 사례 탭이 있는 시트가 카드에서 펼쳐짐 |
| 인용구 레일 | 챕터마다 대표 문장 1개. 가로 스크롤 + 카드 뒤집기(영어 원문 ↔ 번역·맥락) |

모션 줄이기 설정이나 WebGL이 없는 환경에서는 애니메이션 없는 정적 레이아웃으로 바뀝니다.

## 파일

```
index.html                  배포되는 결과물 (scripts/build.py로 생성)
assets/PretendardVariable.woff2   한글 폰트 (SIL OFL 1.1)
src/template.html           페이지 템플릿 (CSS, JS 포함)
src/data.json               챕터별 요약·개념·사례·인용구
scripts/build.py            template + data → index.html
```

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

내용을 고치려면 `src/data.json` 또는 `src/template.html`을 수정하고 다시 빌드합니다.

```bash
python3 scripts/build.py
```

## GitHub Pages로 배포

1. 저장소 **Settings → Pages**
2. **Source**: `Deploy from a branch`, **Branch**: `main` / `/ (root)`
3. 저장 후 1~2분 뒤 `https://hyeseungk.github.io/nexus_summary/`

## 사용한 것

- [three.js](https://threejs.org) r128, [GSAP](https://gsap.com) 3.12.5 + ScrollTrigger, [vanilla-tilt](https://micku7zu.github.io/vanilla-tilt.js/) 1.8.1 (cdnjs)
- [Pretendard](https://github.com/orioncactus/pretendard), Schibsted Grotesk, Newsreader, JetBrains Mono (Google Fonts)

## 저작권

이 저장소는 책 전문을 포함하지 않습니다. 요약은 개인 학습 목적으로 작성했고, 인용은 챕터당 몇 문장의 짧은 발췌입니다.
책의 저작권은 저자와 출판사에 있습니다. 원전을 읽는 데 이 요약이 도움이 되길 바랍니다.
