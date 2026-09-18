import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import ButtonBase from '@mui/material/ButtonBase';
import { getChampionById, getChampionIconUrl } from '../../lib/mockRiotApi';
import { formatRelativeTime } from '../../utils/format-date';
import { formatDuration } from '../../utils/format-duration';
import useDdragonVersion from '../../hooks/useDdragonVersion';

/**
 * Props:
 * @param {object} match - 목업 최근 매치 요약 데이터 [Required]
 * @param {boolean} selected - 현재 선택된 매치인지 여부 [Required]
 * @param {function} onSelect - 클릭 시 호출되는 선택 핸들러 [Required]
 *
 * Example usage:
 * <MatchPickerItem match={match} selected={selectedId === match.matchId} onSelect={setSelectedId} />
 */
export default function MatchPickerItem({ match, selected, onSelect }) {
  const version = useDdragonVersion();
  const champion = getChampionById(match.championId);

  return (
    <ButtonBase
      onClick={() => onSelect(match.matchId)}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
      }}
    >
      <Radio checked={selected} size="small" sx={{ mr: 1 }} />
      <Box
        component="img"
        src={getChampionIconUrl(champion.key, version)}
        alt={champion.name}
        sx={{ width: 40, height: 40, borderRadius: '50%', mr: 1.5, flexShrink: 0 }}
      />
      <Box sx={{ textAlign: 'left', minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
          {match.isWin ? '승리' : '패배'} · {champion.name} {match.kills}/{match.deaths}/{match.assists}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          {match.gameMode} · {formatDuration(match.gameDuration)} · {formatRelativeTime(match.gameCreation)}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
