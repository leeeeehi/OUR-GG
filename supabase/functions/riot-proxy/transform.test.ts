/**
 * transform.ts 단위 테스트 (실행: node --test supabase/functions/riot-proxy/transform.test.ts)
 * 주의: 아래 fixture는 Riot match-v5 문서의 필드 구조를 본떠 만든 가짜 데이터이며, 실제 API 응답이 아니다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPostRow,
  formatTier,
  isValidMatchId,
  isValidPuuid,
  queueLabel,
  sanitizeCaption,
  summarizeForPuuid,
  toStoredDetail,
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
        kills: i,
        deaths: 2,
        assists: 3,
        totalDamageDealtToChampions: 10000 + i * 100,
        riotIdGameName: i === 3 ? '나의닉네임' : `상대${i}`,
        riotIdTagline: 'KR1',
        summonerName: '',
      })),
      ...overrides,
    },
  };
}

test('trimMatch: 필요한 필드만 남기고 한국어 큐 라벨을 붙인다', () => {
  const m = trimMatch(makeRawMatch());
  assert.equal(m.matchId, 'KR_7000000001');
  assert.equal(m.gameMode, '솔로랭크');
  assert.equal(m.participants.length, 10);
  assert.equal(m.participants[3].summonerName, '나의닉네임');
  assert.equal(m.participants[3].damageDealt, 10300);
});

test('trimMatch: 밀리초 단위 gameDuration은 초로 변환한다', () => {
  const m = trimMatch(makeRawMatch({ gameDuration: 1834000 }));
  assert.equal(m.gameDuration, 1834);
});

test('trimMatch: riotIdGameName이 없으면 summonerName, 그것도 없으면 기본값', () => {
  const raw = makeRawMatch();
  raw.info.participants[0].riotIdGameName = '';
  raw.info.participants[0].summonerName = '구닉네임';
  raw.info.participants[1].riotIdGameName = '';
  raw.info.participants[1].summonerName = '';
  const m = trimMatch(raw);
  assert.equal(m.participants[0].summonerName, '구닉네임');
  assert.equal(m.participants[1].summonerName, '소환사');
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
  assert.equal(s?.isWin, true);
  assert.equal(summarizeForPuuid(m, 'nobody'), null);
});

test('toStoredDetail: 공개 저장용 상세에는 puuid가 없고 isOwner만 있다', () => {
  const m = trimMatch(makeRawMatch());
  const detail = toStoredDetail(m, ME);
  assert.equal(JSON.stringify(detail).includes('puuid'), false);
  assert.equal(detail.participants.filter((p) => p.isOwner).length, 1);
  assert.equal(detail.participants[3].isOwner, true);
});

test('buildPostRow: 수치는 Riot 원본에서, 참가자가 아니면 예외', () => {
  const m = trimMatch(makeRawMatch());
  const row = buildPostRow('user-1', m, ME, '한 줄 소감', 'friends');
  assert.equal(row.kills, 3);
  assert.equal(row.damage_dealt, 10300);
  assert.equal(row.champion_id, 103);
  assert.equal(row.visibility, 'friends');
  assert.equal(row.caption, '한 줄 소감');
  assert.equal(row.game_creation, new Date(1790000000000).toISOString());
  assert.throws(() => buildPostRow('user-1', m, 'nobody', '', 'public'), /NOT_PARTICIPANT/);
  assert.equal(buildPostRow('user-1', m, ME, '', 'public').caption, null);
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
  assert.deepEqual(formatTier(undefined), { tier: null, rank: null, leaguePoints: null });
});

test('검증 함수: caption 길이/공백, puuid, matchId 형식', () => {
  assert.equal(sanitizeCaption('  안녕  '), '안녕');
  assert.equal(sanitizeCaption('a'.repeat(500)).length, 200);
  assert.equal(sanitizeCaption(123), '');
  assert.equal(isValidPuuid(ME), true);
  assert.equal(isValidPuuid('short'), false);
  assert.equal(isValidPuuid('../../etc/passwd/aaaaaaaaaaaaaaaaaaaa'), false);
  assert.equal(isValidMatchId('KR_7000000001'), true);
  assert.equal(isValidMatchId('KR_MOCK_123'), false);
  assert.equal(isValidMatchId('KR_1/../x'), false);
});
