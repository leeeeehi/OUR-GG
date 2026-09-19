import Typography from '@mui/material/Typography';

/**
 * Riot Games 데이터를 표시하는 화면에 붙이는 면책 고지.
 * TODO: 문구는 Riot 표준 고지문을 옮긴 것이므로 정식 공개 전 Riot 정책 페이지의 원문과 대조할 것.
 *
 * Example usage:
 * <RiotDisclaimer />
 */
export default function RiotDisclaimer() {
  return (
    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.5, mt: 3 }}>
      OUR.GG는 Riot Games의 후원이나 승인을 받지 않았으며, Riot Games 또는 Riot Games 자산의 제작·관리에 공식적으로
      참여한 어느 누구의 견해도 반영하지 않습니다. Riot Games 및 관련 자산은 Riot Games, Inc.의 상표 또는 등록상표입니다.
    </Typography>
  );
}
