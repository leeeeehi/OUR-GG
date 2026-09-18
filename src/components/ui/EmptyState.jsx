import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

/**
 * Props:
 * @param {string} title - 빈 상태 안내 제목 [Required]
 * @param {string} description - 부가 설명 텍스트 [Optional]
 * @param {string} actionLabel - 액션 버튼 텍스트 [Optional]
 * @param {function} onAction - 액션 버튼 클릭 핸들러 [Optional]
 *
 * Example usage:
 * <EmptyState title="아직 게시물이 없어요" actionLabel="전적 공유하러 가기" onAction={goCreate} />
 */
export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: { xs: 6, md: 10 },
        px: 2,
      }}
    >
      <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 600 }}>
        {title}
      </Typography>
      {description ? (
        <Typography sx={{ fontSize: { xs: '0.9rem', md: '1rem' }, color: 'text.secondary' }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
