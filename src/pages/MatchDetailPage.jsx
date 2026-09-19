import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { getChampionIconUrl } from '../lib/ddragon';
import { getMatchDetail, getRiotErrorMessage } from '../lib/riotApi';
import { fetchMatchComments, createMatchComment } from '../lib/matchComments';
import { formatRelativeTime } from '../utils/format-date';
import { formatDuration } from '../utils/format-duration';
import { calcKda, formatPosition, getResultInfo } from '../utils/match-format';
import useAuth from '../hooks/useAuth';
import useDdragonVersion from '../hooks/useDdragonVersion';
import useChampions from '../hooks/useChampions';
import Scoreboard from '../components/match/Scoreboard';
import ReactionBar from '../components/match/ReactionBar';
import CommentList from '../components/post/CommentList';
import CommentForm from '../components/post/CommentForm';
import RiotDisclaimer from '../components/common/RiotDisclaimer';

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const version = useDdragonVersion();
  const { getChampionById } = useChampions();

  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const load = useCallback(async () => {
    // 다른 경기로 이동했을 때 이전 경기의 에러/데이터가 남지 않도록 초기화한다
    setLoading(true);
    setError('');
    setDetail(null);
    setComments([]);
    setCommentError('');
    try {
      const data = await getMatchDetail(matchId);
      setDetail(data);
      // 댓글은 열람 권한이 있는 경기만 조회된다 (권한이 없으면 빈 목록)
      setComments(await fetchMatchComments(matchId).catch(() => []));
    } catch (err) {
      setError(getRiotErrorMessage(err, '경기 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  /** @returns {Promise<boolean>} 등록 성공 여부 (실패 시 CommentForm이 입력 내용을 유지한다) */
  async function handleAddComment(content, timelineTag) {
    setCommentError('');
    setIsSubmittingComment(true);
    try {
      const comment = await createMatchComment({ matchId, userId: user.id, content, timelineTag });
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

  if (error || !detail) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 6 }}>
        <Container maxWidth="sm">
          <Alert severity="warning">{error}</Alert>
        </Container>
      </Box>
    );
  }

  const { match, appUsers, canInteract } = detail;
  // 강조할 참가자: 링크로 지정된 유저 > 이 경기에 참가한 나 > 이 경기의 첫 앱 유저
  const focusUserId =
    [searchParams.get('focus'), user?.id, appUsers[0]?.userId].find(
      (id) => id && match.participants.some((p) => p.userId === id),
    ) ?? null;
  const focus = focusUserId ? match.participants.find((p) => p.userId === focusUserId) : null;
  const focusChampion = focus ? getChampionById(focus.championId) : null;
  const focusUser = focus ? appUsers.find((u) => u.userId === focus.userId) : null;
  const focusResult = focus ? getResultInfo({ isWin: focus.isWin, isRemake: match.isRemake }) : null;
  const position = focus ? formatPosition(focus.position) : '';

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 2, md: 4 }, pb: { xs: 10, md: 10 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: '0.9rem', mb: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
          >
            ← 뒤로가기
          </Link>
        </Typography>

        {focus ? (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Box
              component="img"
              src={getChampionIconUrl(focusChampion.key, version)}
              alt={focusChampion.name}
              sx={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
                <Chip
                  size="small"
                  label={focusResult.label}
                  sx={{ bgcolor: focusResult.color, color: 'common.white', fontWeight: 700 }}
                />
                {position ? <Chip size="small" label={position} variant="outlined" /> : null}
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
                {focusUser ? (
                  <Link component={RouterLink} to={`/users/${focusUser.userId}`} sx={{ color: 'inherit' }}>
                    {focusUser.nickname}
                  </Link>
                ) : null}{' '}
                {focusChampion.name} {focus.kills}/{focus.deaths}/{focus.assists}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>KDA {calcKda(focus).toFixed(2)}</Typography>
            </Box>
          </Box>
        ) : null}

        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
          {match.gameMode} · {formatDuration(match.gameDuration)} · {formatRelativeTime(match.gameCreation)} ·{' '}
          참가자 {match.participants.length}명
        </Typography>

        <ReactionBar matchId={match.matchId} isInteractive={canInteract} />

        <Divider sx={{ my: 2 }} />

        <Scoreboard match={match} version={version} getChampionById={getChampionById} focusUserId={focusUserId} />

        <Divider sx={{ my: 3 }} />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>댓글/훈수</Typography>
        <CommentList comments={comments} />
        {canInteract ? (
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
            {appUsers.length > 0
              ? '이 경기에 참가한 유저를 팔로우하면 댓글과 훈수를 남길 수 있어요.'
              : 'OUR.GG 유저가 참가한 경기에서만 댓글과 훈수를 남길 수 있어요.'}
          </Alert>
        )}

        <RiotDisclaimer />
      </Container>
    </Box>
  );
}
