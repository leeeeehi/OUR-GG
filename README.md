# OUR.GG

리그 오브 레전드 전적을 친구들과 공유하고 피드백을 주고받는 미니 SNS (1차 MVP)

- 배포: https://leeeeehi.github.io/OUR-GG/
- 스택: React + Vite + MUI + Supabase (Auth/Postgres)

## 현재 범위 (1차 MVP)

- Supabase Auth 기반 회원가입/로그인, 만 14세 미만 가입 제한, Riot ID(소환사명#태그) 입력
- 전적 검색 / 최근 매치 조회 / 게시물 등록 — Riot API Key 미보유로 `src/lib/mockRiotApi.js` 목업 데이터 사용 (챔피언 아이콘만 Data Dragon 실제 CDN)
- 공개 피드, 게시물 상세(10인 매치 상세 + 댓글), 마이페이지, 이용약관/개인정보처리방침

2차(팔로우, 좋아요, 알림, 신고/차단)·3차(랭킹, 설정, 소셜 로그인, 실제 Riot API 연동) 범위는 추후 확장 예정.

## 개발

```bash
npm install
npm run dev
```

`.env.example`을 참고해 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정해야 합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 자동으로 빌드 후 GitHub Pages에 배포합니다.
