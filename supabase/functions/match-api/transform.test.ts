/**
 * transform.ts 단위 테스트 (실행: node --test supabase/functions/match-api/transform.test.ts)
 * 주의: fixture는 Riot match-v5 문서의 필드 구조를 본떠 만든 가짜 데이터이며, 실제 API 응답이 아니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLeaderboard,
  computeKda,
  formatTier,
  isValidMatchId,
  isValidPuuid,
  isValidUuid,
  queueLabel,
  summarizeForPuuid,
  toClientMatch,
  trimMatch,
} from './transform.ts';

const ME = 'puuid-me-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function makeRawMatch(overrides = {}) {
  return {
    metadata: { matchId: 'KR_7000000001' },
    info: {
      queueId: 420,
      gameMode: 'CLASSIC',
      gameDuration: 1834,
      gameCreation: 1790000000000,
      participants: Array.from({ length: 10 }, (_, i) => ({
        puuid: i === 3 ? ME : `puuid-other-${i}-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`,
        participantId: i + 1,
        teamId: i < 5 ? 100 : 200,
        win: i < 5,
        championId: 100 + i,
        championName: `Champ${i}`,
        champLevel: 15 + i,
        teamPosition: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'][i % 5],
        kills: i,
        deaths: 2,
        assists: 3,
        totalMinionsKilled: 150 + i,
        neutralMinionsKilled: 10,
        goldEarned: 10000 + i * 100,
        totalDamageDealtToChampions: 10000 + i * 100,
        totalDamageTaken: 15000,
        visionScore: 20 + i,
        item0: 3006,
        item1: 3020,
        item2: 0,
        riotIdGameName: i === 3 ? '나의닉네임' : `상대${i}`,
        riotIdTagline: 'KR1',
        summonerName: '',
      })),
      teams: [
        { teamId: 100, win: true, objectives: { tower: { kills: 9 }, dragon: { kills: 3 }, baron: { kills: 1 } } },
        { teamId: 200, win: false, objectives: { tower: { kills: 2 }, dragon: { kills: 1 }, baron: { kills: 0 } } },
      ],
      ...overrides,
    },
  };
}

test('trimMatch: 상세 지표(CS, 골드, 받은 피해, 시야, 아이템, 포지션)를 담고 한국어 큐 라벨을 붙인다', () => {
  const m = trimMatch(makeRawMatch());
  assert.equal(m.gameMode, '솔로랭크');
  const me = m.participants[3];
  assert.equal(me.summonerName, '나의닉네임');
  assert.equal(me.tagLine, 'KR1');
  assert.equal(me.cs, 163); // 미니언 153 + 정글 10
  assert.equal(me.gold, 10300);
  assert.equal(me.damageTaken, 15000);
  assert.equal(me.visionScore, 23);
  assert.equal(me.level, 18);
  assert.equal(me.position, 'BOTTOM');
  assert.deepEqual(me.items, [3006, 3020, 0, 0, 0, 0, 0]);
  assert.equal(me.placement, null);
});

test('trimMatch: 팀 합계와 오브젝트 (오브젝트 정보가 없으면 null)', () => {
  const m = trimMatch(makeRawMatch());
  assert.equal(m.teams.length, 2);
  const blue = m.teams.find((t) => t.teamId === 100);
  assert.equal(blue?.isWin, true);
  assert.equal(blue?.kills, 0 + 1 + 2 + 3 + 4);
  assert.equal(blue?.towers, 9);
  assert.equal(blue?.barons, 1);

  const noObjectives = trimMatch(makeRawMatch({ teams: undefined }));
  assert.equal(noObjectives.teams[0].towers, null);
});

test('trimMatch: 아레나처럼 팀이 여러 개이고 참가자가 10명이 아니어도 처리한다', () => {
  const raw = makeRawMatch({ queueId: 1700, gameMode: 'CHERRY' });
  raw.info.participants = Array.from({ length: 16 }, (_, i) => ({
    ...raw.info.participants[i % 10],
    puuid: `arena-${i}-cccccccccccccccccccccccccccccccc`,
    participantId: i + 1,
    teamId: i < 8 ? 100 : 200, // 실제 아레나도 teamId는 100/200뿐이다
    playerSubteamId: Math.floor(i / 2) + 1,
    placement: Math.floor(i / 2) + 1,
  }));
  const m = trimMatch(raw);
  assert.equal(m.gameMode, '아레나');
  assert.equal(m.participants.length, 16);
  assert.equal(m.teams.length, 8); // 서브팀(듀오) 기준으로 묶는다
  assert.equal(m.participants[5].placement, 3);
  assert.equal(m.participants[5].teamId, 3);
  assert.equal(m.teams.find((t) => t.teamId === 3)?.placement, 3);
  // 일반 5:5 매치는 순위가 없다
  assert.equal(trimMatch(makeRawMatch()).teams[0].placement, null);
});

test('trimMatch: 밀리초 단위 gameDuration 변환, 다시하기 판정', () => {
  assert.equal(trimMatch(makeRawMatch({ gameDuration: 1834000 })).gameDuration, 1834);
  const remake = makeRawMatch({ gameDuration: 180 });
  remake.info.participants[0].gameEndedInEarlySurrender = true;
  assert.equal(trimMatch(remake).isRemake, true);
  assert.equal(trimMatch(makeRawMatch()).isRemake, false);
});

test('trimMatch: 예상과 다른 형태면 예외', () => {
  assert.throws(() => trimMatch({ metadata: {}, info: {} } as never), /UNEXPECTED_MATCH_SHAPE/);
  assert.throws(() => trimMatch(null as never), /UNEXPECTED_MATCH_SHAPE/);
});

test('queueLabel: 알려진 큐, gameMode 대체, 기타', () => {
  assert.equal(queueLabel(450, 'ARAM'), '칼바람나락');
  assert.equal(queueLabel(99999, 'ARAM'), '칼바람나락');
  assert.equal(queueLabel(99999, 'SOMETHING_NEW'), '기타');
});

test('summarizeForPuuid: 내 참가 정보 요약, 참가자가 아니면 null', () => {
  const m = trimMatch(makeRawMatch());
  const s = summarizeForPuuid(m, ME);
  assert.equal(s?.championId, 103);
  assert.equal(s?.kills, 3);
  assert.equal(s?.cs, 163);
  assert.equal(s?.position, 'BOTTOM');
  assert.equal(summarizeForPuuid(m, 'nobody'), null);
});

test('toClientMatch: puuid는 제거하고 허용된 앱 유저에게만 userId를 붙인다', () => {
  const m = trimMatch(makeRawMatch());
  const client = toClientMatch(m, { [ME]: 'user-uuid-1' });
  assert.equal(JSON.stringify(client).includes('puuid'), false);
  assert.equal(client.participants[3].userId, 'user-uuid-1');
  assert.equal(client.participants.filter((p) => p.userId).length, 1);
  assert.equal(client.teams.length, 2);
});

test('formatTier: 솔로랭크만 사용, 마스터 이상은 디비전 없음, 기록 없으면 null', () => {
  const gold = formatTier([
    { queueType: 'RANKED_FLEX_SR', tier: 'SILVER', rank: 'I', leaguePoints: 5 },
    { queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 47 },
  ]);
  assert.deepEqual(gold, { tier: '골드', rank: 'II', leaguePoints: 47 });
  assert.deepEqual(formatTier([{ queueType: 'RANKED_SOLO_5x5', tier: 'MASTER', rank: 'I', leaguePoints: 120 }]), {
    tier: '마스터',
    rank: '',
    leaguePoints: 120,
  });
  assert.deepEqual(formatTier([]), { tier: null, rank: null, leaguePoints: null });
});

function summary(overrides = {}) {
  return {
    matchId: 'KR_1',
    gameMode: '솔로랭크',
    gameDuration: 1800,
    gameCreation: 0,
    isWin: true,
    isRemake: false,
    championId: 1,
    championName: 'A',
    position: 'TOP',
    kills: 5,
    deaths: 1,
    assists: 5,
    cs: 100,
    damageDealt: 20000,
    ...overrides,
  };
}

test('buildLeaderboard: 7일 평균, 24시간 하이라이트, 리메이크/오래된 경기 제외', () => {
  const now = 1_800_000_000_000;
  const HOUR = 3600 * 1000;
  const result = buildLeaderboard(
    [
      {
        userId: 'u1',
        nickname: '가',
        profileImageUrl: null,
        matches: [
          summary({ gameCreation: now - 2 * HOUR, kills: 10, deaths: 1, assists: 10, damageDealt: 30000 }), // KDA 20
          summary({ gameCreation: now - 3 * 24 * HOUR, kills: 0, deaths: 1, assists: 0, damageDealt: 10000 }), // KDA 0
          summary({ gameCreation: now - 10 * 24 * HOUR, kills: 99, deaths: 0, assists: 99, damageDealt: 99999 }), // 7일 초과
          summary({ gameCreation: now - HOUR, isRemake: true, kills: 50, damageDealt: 90000 }), // 리메이크
        ],
      },
      {
        userId: 'u2',
        nickname: '나',
        profileImageUrl: null,
        matches: [summary({ gameCreation: now - 5 * HOUR, kills: 2, deaths: 2, assists: 2, damageDealt: 50000 })],
      },
    ],
    now,
  );

  assert.equal(result.byKda[0].userId, 'u1');
  assert.equal(result.byKda[0].matchCount, 2);
  assert.equal(result.byKda[0].avgKda, 10); // (20 + 0) / 2
  assert.equal(result.byDamage[0].userId, 'u2'); // 50000 > (30000+10000)/2
  assert.equal(result.highlights.topDamage?.userId, 'u2');
  assert.equal(result.highlights.topKda?.userId, 'u1');
});

test('buildLeaderboard: 기록이 없으면 비어 있다', () => {
  const result = buildLeaderboard([{ userId: 'u', nickname: 'x', profileImageUrl: null, matches: [] }], Date.now());
  assert.deepEqual(result.byKda, []);
  assert.equal(result.highlights.topDamage, null);
});

test('computeKda / 검증 함수', () => {
  assert.equal(computeKda({ kills: 3, deaths: 0, assists: 3 }), 6);
  assert.equal(isValidPuuid(ME), true);
  assert.equal(isValidPuuid('../../etc/passwd/aaaaaaaaaaaaaaaaaaaa'), false);
  assert.equal(isValidMatchId('KR_7000000001'), true);
  assert.equal(isValidMatchId('KR_1/../x'), false);
  assert.equal(isValidUuid('e876ad6d-ccd2-4fd9-aab3-df4550b437dc'), true);
  assert.equal(isValidUuid("x' or 1=1"), false);
});
