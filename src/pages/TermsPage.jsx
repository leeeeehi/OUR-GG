import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

const SECTIONS = [
  {
    title: '1. 서비스 소개',
    body:
      'OUR.GG는 리그 오브 레전드 전적을 친구들과 공유하고 피드백을 주고받는 커뮤니티 서비스입니다.\n' +
      '본 서비스는 Riot Games의 공식 서비스가 아니며, Riot Games와 관계되어 있지 않습니다.',
  },
  {
    title: '2. 가입 자격 및 연령 제한',
    body: '만 14세 미만은 서비스에 가입할 수 없습니다. 가입 시 입력한 생년월일을 기준으로 연령을 검증합니다.',
  },
  {
    title: '3. 개인정보의 수집 및 이용',
    body:
      '회원가입 시 이메일, 닉네임, 생년월일, Riot ID(소환사명#태그)를 수집하며, 서비스 제공 및 부정 이용 방지 ' +
      '목적으로만 사용합니다. 회원 탈퇴 시 개인 식별 정보는 익명화 처리됩니다.',
  },
  {
    title: '4. 게시물 및 커뮤니티 운영 정책',
    body:
      '부적절한 게시물/댓글은 신고 누적 시 운영자 검토를 거쳐 숨김 처리될 수 있습니다. 타인에게 불쾌감을 주는 ' +
      '훈수·비방은 삼가주세요.',
  },
];

export default function TermsPage() {
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md" sx={{ py: 2, px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700, mb: 3 }}>
          이용약관 · 개인정보처리방침
        </Typography>

        {SECTIONS.map((section, index) => (
          <Box key={section.title} sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 700, mb: 1 }}>
              {section.title}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {section.body}
            </Typography>
            {index < SECTIONS.length - 1 ? <Divider sx={{ mt: 3 }} /> : null}
          </Box>
        ))}
      </Container>
    </Box>
  );
}
