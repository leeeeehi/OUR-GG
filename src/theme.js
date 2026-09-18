import { createTheme } from '@mui/material/styles';

// docs/미니 SNS 프로젝트/color-theme.json (Material Theme Builder export) 기반 팔레트
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4C662B', contrastText: '#FFFFFF' },
        secondary: { main: '#586249', contrastText: '#FFFFFF' },
        tertiary: { main: '#386663', contrastText: '#FFFFFF' },
        error: { main: '#BA1A1A', contrastText: '#FFFFFF' },
        win: { main: '#3B78E7', contrastText: '#FFFFFF' },
        background: { default: '#F9FAEF', paper: '#F4F4E9' },
        text: { primary: '#1A1C16', secondary: '#44483D' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#B1D18A', contrastText: '#1F3701' },
        secondary: { main: '#BFCBAD', contrastText: '#2A331E' },
        tertiary: { main: '#A0D0CB', contrastText: '#003735' },
        error: { main: '#FFB4AB', contrastText: '#690005' },
        win: { main: '#A9C6FF', contrastText: '#00246B' },
        background: { default: '#12140E', paper: '#1E2019' },
        text: { primary: '#E2E3D8', secondary: '#C5C8BA' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    h1: { fontSize: '2.125rem', fontWeight: 500 },
  },
  spacing: 8,
});

export default theme;
