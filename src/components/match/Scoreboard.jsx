import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ParticipantRow from './ParticipantRow';
import { formatCompact } from '../../utils/match-format';

const CLASSIC_TEAM_NAMES = { 100: '블루팀', 200: '레드팀' };

function getTeamTitle(team) {
  if (team.placement !== null) return `${team.placement}위`;
  return `${CLASSIC_TEAM_NAMES[team.teamId] ?? `팀 ${team.teamId}`} · ${team.isWin ? '승리' : '패배'}`;
}

function getTeamSummary(team) {
  const parts = [`킬 ${team.kills}`, `골드 ${formatCompact(team.gold)}`];
  if (team.towers !== null) parts.push(`타워 ${team.towers}`);
  if (team.dragons !== null) parts.push(`용 ${team.dragons}`);
  if (team.barons !== null) parts.push(`바론 ${team.barons}`);
  return parts.join(' · ');
}

/**
 * 경기의 팀별 스코어보드. 5:5 모드는 두 팀, 아레나처럼 서브팀이 있는 모드는 순위순으로 보여준다.
 *
 * Props:
 * @param {object} match - matchDetail 응답의 match (teams, participants) [Required]
 * @param {string} version - Data Dragon 버전 [Required]
 * @param {function} getChampionById - 챔피언 id -> { key, name } 조회 함수 [Required]
 * @param {string} focusUserId - 강조할 유저 id [Optional]
 *
 * Example usage:
 * <Scoreboard match={match} version={version} getChampionById={getChampionById} focusUserId={focusUserId} />
 */
export default function Scoreboard({ match, version, getChampionById, focusUserId }) {
  const maxDamage = Math.max(0, ...match.participants.map((p) => p.damageDealt));
  const focusTeamId = match.participants.find((p) => p.userId && p.userId === focusUserId)?.teamId;

  // 순위가 있는 모드는 순위순, 그 외에는 강조할 유저의 팀을 위로
  const teams = [...match.teams].sort((a, b) => {
    if (a.placement !== null && b.placement !== null) return a.placement - b.placement;
    if (a.teamId === focusTeamId) return -1;
    if (b.teamId === focusTeamId) return 1;
    return a.teamId - b.teamId;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {teams.map((team) => (
        <Box key={team.teamId}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, px: 1, mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: team.isWin ? 'win.main' : 'error.main' }}>
              {getTeamTitle(team)}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{getTeamSummary(team)}</Typography>
          </Box>
          <Divider />
          {match.participants
            .filter((p) => p.teamId === team.teamId)
            .map((participant) => (
              <ParticipantRow
                key={participant.participantId}
                participant={participant}
                maxDamage={maxDamage}
                version={version}
                getChampionById={getChampionById}
                isFocus={Boolean(focusUserId) && participant.userId === focusUserId}
              />
            ))}
        </Box>
      ))}
    </Box>
  );
}
