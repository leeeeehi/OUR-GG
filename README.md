# OUR.GG

리그 오브 레전드 전적을 친구들과 공유하고 피드백을 주고받는 미니 SNS (1~3차 개발 진행 중)

- 배포: https://leeeeehi.github.io/OUR-GG/
- 스택: React + Vite + MUI + Supabase (Auth/Postgres)

## 현재 범위

### 1차 (MVP) — 완료

- Supabase Auth 기반 회원가입/로그인, 만 14세 미만 가입 제한, Riot ID(소환사명#태그) 입력
- 전적 검색 / 최근 매치 조회 / 게시물 등록 — Riot API Key 미보유로 `src/lib/mockRiotApi.js` 목업 데이터 사용 (챔피언 아이콘만 Data Dragon 실제 CDN)
- 공개 피드, 게시물 상세(10인 매치 상세 + 댓글), 마이페이지, 이용약관/개인정보처리방침

### 2차 (소셜 & 소통) — 완료

- 친구 검색, 팔로우 관리, 팔로잉/탐색 피드 탭 (게시물 친구공개 옵션 포함)
- 게시물 감정표현(리액션), 댓글
- 신고(3건 누적 시 자동 숨김) / 차단(양방향 공개범위 적용)
- 알림 페이지 (팔로우·댓글·감정표현 발생 시 DB 트리거로 자동 생성)
- 유저 프로필 페이지

### 3차 (고도화) — 일부 완료

- 완료
  - 팔로잉 유저 기준 주간 KDA/딜량 랭킹, 최근 24시간 하이라이트
  - 설정 페이지: 알림 on/off, 다크모드 전환, Riot ID 재연동, 비밀번호 변경, 회원 탈퇴
- 미구현
  - 소셜 로그인 (구글, 카카오 등)
  - 푸시 알림 (현재는 앱 내 알림 페이지만 제공)
  - 실제 Riot API 연동 및 Production Key 전환 (현재 목업 데이터 사용)
  - Riot ID 본인 인증 (RSO) — 현재는 입력만으로 연동

## 개발

```bash
npm install
npm run dev
```

`.env.example`을 참고해 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정해야 합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 자동으로 빌드 후 GitHub Pages에 배포합니다.
