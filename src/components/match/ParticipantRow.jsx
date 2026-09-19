import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import { getChampionIconUrl, getItemIconUrl } from '../../lib/ddragon';
import { calcKda, formatCompact, formatPosition } from '../../utils/match-format';

/**
 * 스코어보드의 참가자 한 줄: 챔피언, 이름, KDA, 딜량 막대, 세부 지표, 아이템.
 *
 * Props:
 * @param {object} participant - matchDetail 응답의 참가자 (puuid 없음, 앱 유저면 userId 포함) [Required]
 * @param {number} maxDamage - 이 경기 최대 딜량 (막대 비율 계산용) [Required]
 * @param {string} version - Data Dragon 버전 [Required]
 * @param {function} getChampionById - 챔피언 id -> { key, name } 조회 함수 [Required]
 * @param {boolean} isFocus - 강조할 참가자인지 여부 [Optional, 기본값: false]
 *
 * Example usage:
 * <ParticipantRow participant={p} maxDamage={50000} version={version} getChampionById={getChampionById} isFocus />
 */
export default function ParticipantRow({ participant, maxDamage, version, getChampionById, isFocus = false }) {
  const champion = getChampionById(participant.championId);
  const position = formatPosition(participant.position);
  const hasFarm = participant.cs > 0;
  const hasVision = participant.visionScore > 0;
  const damageRatio = maxDamage > 0 ? (participant.damageDealt / maxDamage) * 100 : 0;

  const name = `${participant.summonerName}${participant.tagLine ? `#${participant.tagLine}` : ''}`;

  return (
    <Box
      sx={{
        py: 1,
        px: 1,
        borderRadius: 1,
        bgcolor: isFocus ? 'action.selected' : 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box
            component="img"
            src={getChampionIconUrl(champion.key, version)}
            alt={champion.name}
            sx={{ width: 38, height: 38, borderRadius: '50%', display: 'block' }}
          />
          {participant.level > 0 ? (
            <Box
              sx={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                minWidth: 16,
                height: 16,
                px: 0.25,
                borderRadius: 8,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.6rem',
                lineHeight: '14px',
                textAlign: 'center',
              }}
            >
              {participant.level}
            </Box>
          ) : null}
        </Box>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: participant.userId ? 700 : 500 }} noWrap>
            {participant.userId ? (
              <Link component={RouterLink} to={`/users/${participant.userId}`} sx={{ color: 'inherit' }}>
                {name}
              </Link>
            ) : (
              name
            )}
            {position ? (
              <Box component="span" sx={{ ml: 0.75, color: 'text.secondary', fontWeight: 400 }}>
                {position}
              </Box>
            ) : null}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
            {champion.name}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {participant.kills}/{participant.deaths}/{participant.assists}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            KDA {calcKda(participant).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={damageRatio}
        aria-label="딜량 비율"
        sx={{ mt: 0.75, height: 4, borderRadius: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          딜량 {participant.damageDealt.toLocaleString()} · 받은 피해 {formatCompact(participant.damageTaken)} · 골드{' '}
          {formatCompact(participant.gold)}
          {hasFarm ? ` · CS ${participant.cs}` : ''}
          {hasVision ? ` · 시야 ${participant.visionScore}` : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          {participant.items.map((itemId, index) => (
            <Box
              // 아이템 슬롯은 위치가 곧 식별자이므로 index를 key로 쓴다
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: 'action.hover', overflow: 'hidden' }}
            >
              {itemId ? (
                <Box
                  component="img"
                  src={getItemIconUrl(itemId, version)}
                  alt=""
                  onError={(e) => {
                    // 아레나 전용 아이템 등 Data Dragon에 없는 아이콘은 숨긴다
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                  sx={{ width: 20, height: 20, display: 'block' }}
                />
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
