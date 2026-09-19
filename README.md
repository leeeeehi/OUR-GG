# OUR.GG

리그 오브 레전드 전적을 친구들과 함께 보고 훈수를 주고받는 미니 SNS

- 배포: https://leeeeehi.github.io/OUR-GG/
- 스택: React + Vite + MUI + Supabase (Auth/Postgres/Edge Functions)

## 화면 흐름

```
홈
 ├ 전적 검색창 (소환사명#태그) ─▶ 검색 결과 (프로필 + 최근 매치)
 └ 친구들의 전적 (내가 팔로우한 친구별 카드, 약 90초마다 자동 갱신)
      · 최근 5판 승/패, 마지막 판 요약
      └ 친구 클릭 ─▶ 친구 전적 상세 (프로필 + 최근 10판 목록)
            └ 한 판 클릭 ─▶ 경기 상세: 팀별 스코어보드 + 리액션 + 댓글/훈수
```

- 경기 상세: 참가자별 KDA·딜량·받은 피해·골드·CS·시야·아이템, 팀 합계(타워/용/바론), 아레나는 순위별 서브팀
- 댓글/리액션은 **경기(matchId) 단위**이며, 내가 참가했거나 **팔로우한 유저가 참가한 경기**에서만 남길 수 있습니다.
- 그 외: 친구 찾기/팔로우, 차단, 신고(3건 누적 시 댓글 자동 숨김), 알림, 주간 KDA/딜량 랭킹, 설정(알림, 다크모드, **내 전적 공개 여부**, Riot ID 재연동, 비밀번호 변경, 탈퇴)

### 아직 없는 것

- 소셜 로그인 (구글, 카카오 등)
- 푸시 알림 (현재는 앱 내 알림 페이지만 제공)
- Riot Personal/Production Key 전환 (개발 키는 24시간마다 만료)
- Riot ID 본인 인증 (프로필 아이콘 방식 또는 RSO) — 현재는 존재 여부만 확인하고 소유는 검증하지 않음
- "지금 게임 중" 표시, 경기 타임라인 (SPECTATOR / match timeline API 필요)

## Riot API 연동

브라우저에서는 Riot API를 직접 호출할 수 없으므로(키 노출/CORS) Supabase Edge Function `match-api`를 거칩니다.

```
브라우저 ──(Supabase JWT)──▶ Edge Function match-api ──(RIOT_API_KEY)──▶ Riot API (KR)
                                  ├─ og_riot_cache 테이블에 응답 캐시
                                  └─ 팔로우/공개 설정/차단 판정 (service_role은 이 함수 안에서만 사용)
```

- 소스: `supabase/functions/match-api/` (`index.ts` 핸들러, `transform.ts` 순수 변환 로직 + `transform.test.ts`)
- 클라이언트: `src/lib/riotApi.js`(함수 호출), `src/lib/ddragon.js`(챔피언 목록/아이콘, Data Dragon)
- 동작(action): `account`(가입 시 Riot ID 확인, 비로그인 허용), `search`, `userMatches`, `friendsFeed`, `matchDetail`, `leaderboard` (나머지는 로그인 필요)
- "실시간"은 Riot에 푸시가 없어 **화면이 보이는 동안 주기적으로 다시 조회**하는 방식입니다. 조회 결과는 서버에서 공유 캐시되어, 호출량은 접속자 수가 아니라 추적하는 서로 다른 친구 수에 비례합니다 (개발 키 한도 2분 100회 기준 대략 30~40명).
- Riot 장애/키 만료 시 캐시가 있으면 마지막 값으로 응답합니다.

### 공개 범위 규칙

| 대상 | 규칙 |
|---|---|
| 친구 피드 | 내가 팔로우한 유저 중 "내 전적 공개"를 켜 둔 유저만 |
| 유저 전적/검색 | 차단 관계이거나 상대가 공개를 끈 경우 숨김 (본인은 항상 볼 수 있음) |
| 경기 상세 | 그 경기의 앱 유저가 모두 나에게 비공개면 열리지 않음 |
| 댓글/리액션 | DB의 `og_can_view_match()` (RLS)가 판정: 본인 경기, 또는 팔로우한 공개 유저의 경기 |

### API 키 설정

1. [developer.riotgames.com](https://developer.riotgames.com)에서 Development API Key를 발급받습니다 (24시간마다 재발급 필요).
2. Supabase 대시보드 → Edge Functions → Secrets에 `RIOT_API_KEY`로 등록합니다. **키를 코드/문서/채팅에 붙여넣지 마세요.**
3. 친구들끼리 쓰는 규모라면 제품을 등록해 Personal API Key를 신청하면 매일 재발급하지 않아도 됩니다.

### 테스트

```bash
node --test supabase/functions/match-api/transform.test.ts
```

## 개발

```bash
npm install
npm run dev
```

`.env.example`을 참고해 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정해야 합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 자동으로 빌드 후 GitHub Pages에 배포합니다.
