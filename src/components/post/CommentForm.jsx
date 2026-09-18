import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

/**
 * Props:
 * @param {function} onSubmit - (content, timelineTag) => Promise<void> 형태의 등록 핸들러 [Required]
 * @param {boolean} isSubmitting - 등록 진행 중 여부 [Optional, 기본값: false]
 *
 * Example usage:
 * <CommentForm onSubmit={handleAddComment} />
 */
export default function CommentForm({ onSubmit, isSubmitting = false }) {
  const [content, setContent] = useState('');
  const [timelineTag, setTimelineTag] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content.trim(), timelineTag.trim());
    setContent('');
    setTimelineTag('');
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
      <TextField
        size="small"
        placeholder="15:20"
        value={timelineTag}
        onChange={(e) => setTimelineTag(e.target.value)}
        sx={{ width: { xs: '30%', md: 100 } }}
      />
      <TextField
        size="small"
        placeholder="훈수/피드백을 남겨보세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        sx={{ flexGrow: 1, minWidth: { xs: '60%', md: 200 } }}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting || !content.trim()}>
        등록
      </Button>
    </Box>
  );
}
