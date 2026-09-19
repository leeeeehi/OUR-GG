import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getChampionIconUrl } from '../../lib/ddragon';
import useChampions from '../../hooks/useChampions';

/**
 * Props:
 * @param {string} label - 하이라이트 종류 라벨 ('최고 딜량' 등) [Required]
 * @param {object} post - 하이라이트로 뽑힌 게시물 데이터(+author 조인) [Required]
 * @param {string} version - Data Dragon 버전 문자열 [Required]
 *
 * Example usage:
 * <HighlightRow label="최고 딜량" post={post} version={version} />
 */
export default function HighlightRow({ label, post, version }) {
  const { getChampionById } = useChampions();
  const champion = getChampionById(post.champion_id);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
      <Box
        component="img"
        src={getChampionIconUrl(champion.key, version)}
        alt={champion.name}
        sx={{ width: 32, height: 32, borderRadius: '50%' }}
      />
      <Typography sx={{ fontSize: '0.85rem' }}>
        <strong>{label}</strong> · {post.author?.nickname} · {champion.name} {post.kills}/{post.deaths}/{post.assists}
      </Typography>
    </Box>
  );
}
