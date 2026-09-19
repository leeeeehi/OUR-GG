import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { getChampionIconUrl } from '../../lib/ddragon';
import { formatRelativeTime } from '../../utils/format-date';
import { formatDuration } from '../../utils/format-duration';
import useDdragonVersion from '../../hooks/useDdragonVersion';
import useChampions from '../../hooks/useChampions';
import ReactionBar from './ReactionBar';

/**
 * Props:
 * @param {object} post - og_posts row(+author 조인 데이터) [Required]
 *
 * Example usage:
 * <PostCard post={post} />
 */
export default function PostCard({ post }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const { getChampionById } = useChampions();
  const champion = getChampionById(post.champion_id);
  const kda = ((post.kills + post.assists) / Math.max(1, post.deaths)).toFixed(2);

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: '6px solid',
        borderLeftColor: post.is_win ? 'win.main' : 'error.main',
      }}
    >
      <CardActionArea onClick={() => navigate(`/posts/${post.id}`)} sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Link
            component={RouterLink}
            to={`/users/${post.user_id}`}
            onClick={(e) => e.stopPropagation()}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', textDecoration: 'none' }}
          >
            <Avatar src={post.author?.profile_image_url ?? undefined} sx={{ width: 32, height: 32 }}>
              {post.author?.nickname?.[0] ?? '?'}
            </Avatar>
            <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1rem' } }}>
              {post.author?.nickname ?? '알 수 없음'}
            </Typography>
          </Link>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            · {formatRelativeTime(post.created_at)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Box
            component="img"
            src={getChampionIconUrl(champion.key, version)}
            alt={champion.name}
            sx={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                size="small"
                label={post.is_win ? '승리' : '패배'}
                sx={{
                  bgcolor: post.is_win ? 'win.main' : 'error.main',
                  color: post.is_win ? 'win.contrastText' : 'error.contrastText',
                  fontWeight: 700,
                }}
              />
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {post.game_mode} · {formatDuration(post.game_duration)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: '0.9rem', md: '1rem' }, fontWeight: 600, mt: 0.5 }}>
              {champion.name} {post.kills}/{post.deaths}/{post.assists} (KDA {kda})
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              딜량 {post.damage_dealt?.toLocaleString?.() ?? post.damage_dealt}
            </Typography>
          </Box>
        </Box>

        {post.caption ? (
          <Typography sx={{ mt: 1.5, fontSize: { xs: '0.9rem', md: '1rem' } }}>{post.caption}</Typography>
        ) : null}

        <Box sx={{ mt: 1.5 }}>
          <ReactionBar postId={post.id} counts={post.reaction_counts} mode="readonly" />
        </Box>
      </CardActionArea>
    </Card>
  );
}
