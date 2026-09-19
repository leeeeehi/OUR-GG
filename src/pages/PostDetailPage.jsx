import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { getChampionById, getChampionIconUrl } from '../lib/mockRiotApi';
import { fetchPostById, fetchComments, createComment } from '../lib/posts';
import { formatRelativeTime } from '../utils/format-date';
import { formatDuration } from '../utils/format-duration';
import useAuth from '../hooks/useAuth';
import useDdragonVersion from '../hooks/useDdragonVersion';
import CommentList from '../components/post/CommentList';
import CommentForm from '../components/post/CommentForm';
import ReactionBar from '../components/post/ReactionBar';
import ReportDialog from '../components/post/ReportDialog';

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const version = useDdragonVersion();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  const load = useCallback(async () => {
    // 다른 게시물로 이동했을 때 이전 게시물의 에러/데이터가 남지 않도록 초기화한다
    setLoading(true);
    setError('');
    setPost(null);
    setComments([]);
    setCommentError('');
    try {
      const [postData, commentData] = await Promise.all([fetchPostById(postId), fetchComments(postId)]);
      if (!postData) {
        setError('게시물을 찾을 수 없거나 비공개 게시물입니다.');
      } else {
        setPost(postData);
        setComments(commentData);
      }
    } catch {
      setError('게시물을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  /** @returns {Promise<boolean>} 등록 성공 여부 (실패 시 CommentForm이 입력 내용을 유지한다) */
  async function handleAddComment(content, timelineTag) {
    setCommentError('');
    setIsSubmittingComment(true);
    try {
      const comment = await createComment({ postId, userId: user.id, content, timelineTag });
      setComments((prev) => [...prev, comment]);
      return true;
    } catch {
      setCommentError('댓글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    } finally {
      setIsSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 6 }}>
        <Container maxWidth="sm">
          <Alert severity="warning">{error}</Alert>
        </Container>
      </Box>
    );
  }

  const champion = getChampionById(post.champion_id);
  const detail = post.match_detail_json;
  const myTeamId = detail?.participants?.find((p) => p.isOwner)?.teamId;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: '0.9rem', mb: 2 }}>
          <Link component={RouterLink} to="/" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
            ← 뒤로가기
          </Link>
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Box
            component="img"
            src={getChampionIconUrl(champion.key, version)}
            alt={champion.name}
            sx={{ width: 64, height: 64, borderRadius: '50%' }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Chip
              size="small"
              label={post.is_win ? '승리' : '패배'}
              sx={{
                bgcolor: post.is_win ? 'win.main' : 'error.main',
                color: post.is_win ? 'win.contrastText' : 'error.contrastText',
                fontWeight: 700,
                mb: 0.5,
              }}
            />
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              {champion.name} {post.kills}/{post.deaths}/{post.assists}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {post.game_mode} · {formatDuration(post.game_duration)} · {formatRelativeTime(post.created_at)} ·
              작성자{' '}
              <Link component={RouterLink} to={`/users/${post.user_id}`}>
                {post.author?.nickname}
              </Link>
            </Typography>
          </Box>
          {user ? (
            <IconButton aria-label="게시물 신고" onClick={() => setIsReportOpen(true)}>
              <FlagOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        {post.caption ? (
          <Typography sx={{ mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>{post.caption}</Typography>
        ) : null}

        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
          딜량 {post.damage_dealt?.toLocaleString?.() ?? post.damage_dealt}
        </Typography>

        <ReactionBar postId={post.id} counts={post.reaction_counts} mode="interactive" />

        <ReportDialog open={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="post" targetId={post.id} />

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>전체 참가자 (10인)</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 3 }}>
          {(detail?.participants ?? []).map((p) => {
            const pChampion = getChampionById(p.championId);
            return (
              <Box
                key={p.participantId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                  borderLeft: '4px solid',
                  borderLeftColor: p.teamId === myTeamId ? 'win.main' : 'error.main',
                  pl: 1,
                  fontWeight: p.isOwner ? 700 : 400,
                }}
              >
                <Box
                  component="img"
                  src={getChampionIconUrl(pChampion.key, version)}
                  alt={pChampion.name}
                  sx={{ width: 24, height: 24, borderRadius: '50%' }}
                />
                <Typography sx={{ fontSize: '0.85rem', flexGrow: 1 }}>
                  {p.summonerName} · {pChampion.name}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                  {p.kills}/{p.deaths}/{p.assists}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>댓글/피드백</Typography>
        <CommentList comments={comments} />
        {user ? (
          <>
            {commentError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {commentError}
              </Alert>
            ) : null}
            <CommentForm onSubmit={handleAddComment} isSubmitting={isSubmittingComment} />
          </>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            댓글을 작성하려면 로그인해주세요.
          </Alert>
        )}
      </Container>
    </Box>
  );
}
