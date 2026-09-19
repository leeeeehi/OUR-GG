import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import { getChampionIconUrl } from '../../lib/ddragon';
import { formatRelativeTime } from '../../utils/format-date';
import { formatDuration } from '../../utils/format-duration';
import { calcKda, formatPosition, getResultInfo } from '../../utils/match-format';
import useDdragonVersion from '../../hooks/useDdragonVersion';
import useChampions from '../../hooks/useChampions';

/**
 * 전적 목록의 한 판. 클릭하면 경기 상세 화면으로 이동한다.
 *
 * Props:
 * @param {object} match - riot 경기 요약 (matchId, gameMode, isWin, championId, kills 등) [Required]
 * @param {string} focusUserId - 상세 화면에서 강조할 유저 id [Optional]
 *
 * Example usage:
 * <MatchListItem match={match} focusUserId={userId} />
 */
export default function MatchListItem({ match, focusUserId }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const { getChampionById } = useChampions();
  const champion = getChampionById(match.championId);
  const result = getResultInfo(match);
  const position = formatPosition(match.position);

  return (
    <ButtonBase
      onClick={() => navigate(`/matches/${match.matchId}${focusUserId ? `?focus=${focusUserId}` : ''}`)}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.5,
        p: 1.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '5px solid',
        borderLeftColor: result.color,
        textAlign: 'left',
      }}
    >
      <Box
        component="img"
        src={getChampionIconUrl(champion.key, version)}
        alt={champion.name}
        sx={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: result.color }}>{result.label}</Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{champion.name}</Typography>
          {position ? <Chip size="small" label={position} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} /> : null}
        </Box>
        <Typography sx={{ fontSize: '0.85rem' }}>
          {match.kills}/{match.deaths}/{match.assists}{' '}
          <Box component="span" sx={{ color: 'text.secondary' }}>
            (KDA {calcKda(match).toFixed(2)}){match.cs > 0 ? ` · CS ${match.cs}` : ''}
          </Box>
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {match.gameMode} · {formatDuration(match.gameDuration)} · {formatRelativeTime(match.gameCreation)}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
