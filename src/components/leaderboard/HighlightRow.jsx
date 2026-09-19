import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { getChampionIconUrl } from '../../lib/ddragon';
import useChampions from '../../hooks/useChampions';

/**
 * Props:
 * @param {string} label - 하이라이트 종류 라벨 ('최고 딜량' 등) [Required]
 * @param {object} entry - 하이라이트 주인공 { userId, nickname, match } (leaderboard 응답) [Required]
 * @param {string} version - Data Dragon 버전 문자열 [Required]
 *
 * Example usage:
 * <HighlightRow label="최고 딜량" entry={highlights.topDamage} version={version} />
 */
export default function HighlightRow({ label, entry, version }) {
  const { getChampionById } = useChampions();
  const { match } = entry;
  const champion = getChampionById(match.championId);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
      <Box
        component="img"
        src={getChampionIconUrl(champion.key, version)}
        alt={champion.name}
        sx={{ width: 32, height: 32, borderRadius: '50%' }}
      />
      <Typography sx={{ fontSize: '0.85rem' }}>
        <strong>{label}</strong> · {entry.nickname} ·{' '}
        <Link component={RouterLink} to={`/matches/${match.matchId}?focus=${entry.userId}`}>
          {champion.name} {match.kills}/{match.deaths}/{match.assists}
        </Link>
      </Typography>
    </Box>
  );
}
