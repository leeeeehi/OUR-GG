import { useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { reportContent } from '../../lib/reports';
import useAuth from '../../hooks/useAuth';

/**
 * Props:
 * @param {boolean} open - 다이얼로그 표시 여부 [Required]
 * @param {function} onClose - 닫기 핸들러 [Required]
 * @param {string} targetType - 신고 대상 종류 ('match_comment') [Required]
 * @param {number|string} targetId - 신고 대상 id [Required]
 *
 * Example usage:
 * <ReportDialog open={open} onClose={handleClose} targetType="match_comment" targetId={comment.id} />
 */
export default function ReportDialog({ open, onClose, targetType, targetId }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function handleClose() {
    setReason('');
    setError('');
    setDone(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await reportContent({ reporterId: user.id, targetType, targetId, reason: reason.trim() });
      setDone(true);
    } catch (err) {
      setError(err?.code === '23505' ? '이미 신고한 댓글입니다.' : '신고 접수에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>댓글 신고</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success">신고가 접수되었습니다.</Alert>
        ) : (
          <Box component="form" id="report-form" onSubmit={handleSubmit}>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={2}
              label="신고 사유"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{done ? '닫기' : '취소'}</Button>
        {!done ? (
          <Button type="submit" form="report-form" variant="contained" disabled={isSubmitting || !reason.trim()}>
            신고하기
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
