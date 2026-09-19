import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { formatRelativeTime } from '../../utils/format-date';
import EmptyState from '../ui/EmptyState';
import ReportDialog from './ReportDialog';
import useAuth from '../../hooks/useAuth';

/**
 * Props:
 * @param {Array} comments - og_match_comments 목록(+author 조인 데이터) [Required]
 *
 * Example usage:
 * <CommentList comments={comments} />
 */
export default function CommentList({ comments }) {
  const { user } = useAuth();
  const [reportTargetId, setReportTargetId] = useState(null);

  if (!comments || comments.length === 0) {
    return <EmptyState title="아직 댓글/피드백이 없어요" description="가장 먼저 훈수를 남겨보세요" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {comments.map((comment) => (
        <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
          <Link component={RouterLink} to={`/users/${comment.user_id}`}>
            <Avatar src={comment.author?.profile_image_url ?? undefined} sx={{ width: 28, height: 28 }}>
              {comment.author?.nickname?.[0] ?? '?'}
            </Avatar>
          </Link>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link component={RouterLink} to={`/users/${comment.user_id}`} sx={{ color: 'text.primary' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {comment.author?.nickname ?? '알 수 없음'}
                </Typography>
              </Link>
              {comment.timeline_tag ? (
                <Chip size="small" label={comment.timeline_tag} variant="outlined" />
              ) : null}
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {formatRelativeTime(comment.created_at)}
              </Typography>
              {user ? (
                <IconButton size="small" aria-label="댓글 신고" onClick={() => setReportTargetId(comment.id)} sx={{ ml: 'auto' }}>
                  <FlagOutlinedIcon fontSize="inherit" />
                </IconButton>
              ) : null}
            </Box>
            <Typography sx={{ fontSize: '0.9rem', mt: 0.25 }}>{comment.content}</Typography>
          </Box>
        </Box>
      ))}

      <ReportDialog
        open={reportTargetId !== null}
        onClose={() => setReportTargetId(null)}
        targetType="match_comment"
        targetId={reportTargetId}
      />
    </Box>
  );
}
