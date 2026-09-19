import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { getChampionIconUrl } from '../../lib/ddragon';
import { formatRelativeTime } from '../../utils/format-date';
import { calcKda, formatPosition, getResultInfo } from '../../utils/match-format';
import useDdragonVersion from '../../hooks/useDdragonVersion';
import useChampions from '../../hooks/useChampions';

/**
 * 홈 화면의 친구 한 명 카드: 최근 5판 승/패, 마지막 판 요약. 클릭하면 그 친구의 전적 상세로 이동한다.
 *
 * Props:
 * @param {object} card - friendsFeed 응답의 카드 (userId, nickname, status, recentMatches 등) [Required]
 *
 * Example usage:
 * <FriendMatchCard card={card} />
 */
export default function FriendMatchCard({ card }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const { getChampionById } = useChampions();
  const last = card.recentMatches[0];
  const champion = last ? getChampionById(last.championId) : null;
  const wins = card.recentMatches.filter((m) => m.isWin && !m.isRemake).length;
  const losses = card.recentMatches.filter((m) => !m.isWin && !m.isRemake).length;
  const lastResult = last ? getResultInfo(last) : null;

  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => navigate(`/users/${card.userId}`)} sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
          <Avatar src={card.profileImageUrl ?? undefined} sx={{ width: 36, height: 36 }}>
            {card.nickname?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }} noWrap>
                {card.nickname}
              </Typography>
              {card.isMe ? <Chip size="small" label="나" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} /> : null}
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
              {card.riotGameName}#{card.riotTagLine}
            </Typography>
          </Box>
          {card.status === 'ok' && card.recentMatches.length > 0 ? (
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mb: 0.25 }}>
                {card.recentMatches.map((match) => (
                  <Box
                    key={match.matchId}
                    aria-label={getResultInfo(match).label}
                    sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getResultInfo(match).color }}
                  />
                ))}
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                최근 {wins}승 {losses}패
              </Typography>
            </Box>
          ) : null}
        </Box>

        {card.status === 'error' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: '0.8rem' }}>전적을 불러오는 중이에요. 잠시 후 자동으로 다시 시도해요</Typography>
          </Box>
        ) : !last ? (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>최근 전적이 없어요</Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              component="img"
              src={getChampionIconUrl(champion.key, version)}
              alt={champion.name}
              sx={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                <Box component="span" sx={{ color: lastResult.color }}>{lastResult.label}</Box> · {champion.name}{' '}
                {last.kills}/{last.deaths}/{last.assists}{' '}
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  (KDA {calcKda(last).toFixed(2)})
                </Box>
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {last.gameMode}
                {formatPosition(last.position) ? ` · ${formatPosition(last.position)}` : ''} ·{' '}
                {formatRelativeTime(last.gameCreation)}
              </Typography>
            </Box>
          </Box>
        )}
      </CardActionArea>
    </Card>
  );
}
