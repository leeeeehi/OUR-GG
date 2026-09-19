import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { parseRiotId } from '../../utils/validators';

/**
 * 소환사명#태그를 입력받아 검색 결과 화면(/search)으로 이동시키는 검색창.
 *
 * Props:
 * @param {string} initialValue - 처음에 채워둘 검색어 [Optional, 기본값: '']
 *
 * Example usage:
 * <PlayerSearchBox />
 */
export default function PlayerSearchBox({ initialValue = '' }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!parseRiotId(value)) {
      setError('소환사명#태그 형식으로 입력해주세요 (예: Hide on bush#KR1)');
      return;
    }
    setError('');
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="소환사명#태그로 전적 검색 (예: Hide on bush#KR1)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={Boolean(error)}
        helperText={error || undefined}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button type="submit" variant="contained" sx={{ flexShrink: 0, alignSelf: 'flex-start', height: 40 }}>
        검색
      </Button>
    </Box>
  );
}
