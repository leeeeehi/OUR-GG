import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { formatRelativeTime } from '../../utils/format-date';
import EmptyState from '../ui/EmptyState';

/**
 * Props:
 * @param {Array} comments - og_comments 목록(+author 조인 데이터) [Required]
 *
 * Example usage:
 * <CommentList comments={comments} />
 */
export default function CommentList({ comments }) {
  if (!comments || comments.length === 0) {
    return <EmptyState title="아직 댓글/피드백이 없어요" description="가장 먼저 훈수를 남겨보세요" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {comments.map((comment) => (
        <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
          <Avatar src={comment.author?.profile_image_url ?? undefined} sx={{ width: 28, height: 28 }}>
            {comment.author?.nickname?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {comment.author?.nickname ?? '알 수 없음'}
              </Typography>
              {comment.timeline_tag ? (
                <Chip size="small" label={comment.timeline_tag} variant="outlined" />
              ) : null}
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {formatRelativeTime(comment.created_at)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.9rem', mt: 0.25 }}>{comment.content}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
