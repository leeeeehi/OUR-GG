# OUR.GG

리그 오브 레전드 전적을 친구들과 공유하고 피드백을 주고받는 미니 SNS (1~3차 개발 진행 중)

- 배포: https://leeeeehi.github.io/OUR-GG/
- 스택: React + Vite + MUI + Supabase (Auth/Postgres)

## 현재 범위

### 1차 (MVP) — 완료

- Supabase Auth 기반 회원가입/로그인, 만 14세 미만 가입 제한, Riot ID(소환사명#태그) 입력
- 전적 검색 / 최근 매치 조회 / 게시물 등록 — 실제 Riot API 연동 (아래 "Riot API 연동" 참고)
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
  - Riot Personal/Production Key 전환 (개발 키는 24시간마다 만료)
  - Riot ID 본인 인증 (프로필 아이콘 방식 또는 RSO) — 현재는 존재 여부만 확인하고 소유는 검증하지 않음

## Riot API 연동

브라우저에서는 Riot API를 직접 호출할 수 없으므로(키 노출/CORS) Supabase Edge Function `riot-proxy`를 거칩니다.

```
브라우저 ──(Supabase JWT)──▶ Edge Function riot-proxy ──(RIOT_API_KEY)──▶ Riot API (KR)
                                  └─ og_riot_cache 테이블에 응답 캐시
```

- 소스: `supabase/functions/riot-proxy/` (`index.ts` 핸들러, `transform.ts` 순수 변환 로직 + `transform.test.ts`)
- 클라이언트: `src/lib/riotApi.js`(함수 호출), `src/lib/ddragon.js`(챔피언 목록/아이콘, Data Dragon)
- 비로그인은 가입 시 Riot ID 존재 확인(`account`)만 가능하고, 검색/최근 매치/게시물 등록은 로그인이 필요합니다.
- 게시물 등록은 서버가 Riot 원본 데이터로 직접 저장합니다 (클라이언트는 `matchId`만 전달, 전적 수치 위조 방지).
- Riot 장애/키 만료 시 캐시가 있으면 마지막 값으로 응답합니다.

### API 키 설정

1. [developer.riotgames.com](https://developer.riotgames.com)에서 Development API Key를 발급받습니다 (24시간마다 재발급 필요).
2. Supabase 대시보드 → Edge Functions → Secrets에 `RIOT_API_KEY`로 등록합니다. **키를 코드/문서/채팅에 붙여넣지 마세요.**
3. 친구들끼리 쓰는 규모라면 제품을 등록해 Personal API Key를 신청하면 매일 재발급하지 않아도 됩니다.

### 테스트

```bash
node --test supabase/functions/riot-proxy/transform.test.ts
```

## 개발

```bash
npm install
npm run dev
```

`.env.example`을 참고해 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정해야 합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 자동으로 빌드 후 GitHub Pages에 배포합니다.
