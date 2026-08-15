// The Material Design 3 reference ramps as the Material Theme Builder emitted
// them for --md-source #006495, captured before tokens/_reference.scss switched
// to deriving them at runtime.
//
// This is the fixed point the drift test measures against. It is deliberately
// a literal table rather than anything computed: if the generation formula and
// its reference were derived from the same code, the test would only prove the
// code agrees with itself.

export const MD_SOURCE = '#006495';

export const M3_REFERENCE_RAMPS = {
  'primary': {
    0: '#000000', 10: '#001e30', 20: '#003450', 25: '#003f60',
    30: '#004b71', 35: '#005783', 40: '#006495', 50: '#0f7eb8',
    60: '#3d98d4', 70: '#5db3f0', 80: '#8fcdff', 90: '#cbe6ff',
    95: '#e6f2ff', 98: '#f7f9ff', 99: '#fcfcff', 100: '#ffffff',
  },
  'secondary': {
    0: '#000000', 10: '#0d1d29', 20: '#22323f', 25: '#2d3d4b',
    30: '#394856', 35: '#445462', 40: '#50606f', 50: '#697988',
    60: '#8293a2', 70: '#9dadbd', 80: '#b8c8d9', 90: '#d4e4f6',
    95: '#e6f2ff', 98: '#f7f9ff', 99: '#fcfcff', 100: '#ffffff',
  },
  'tertiary': {
    0: '#000000', 10: '#211634', 20: '#362b4a', 25: '#423656',
    30: '#4d4162', 35: '#594c6e', 40: '#66587b', 50: '#7f7195',
    60: '#998ab0', 70: '#b4a4cb', 80: '#d0bfe7', 90: '#ecdcff',
    95: '#f7edff', 98: '#fef7ff', 99: '#fffbff', 100: '#ffffff',
  },
  'neutral': {
    0: '#000000', 10: '#1a1c1e', 20: '#2e3133', 25: '#3a3c3e',
    30: '#454749', 35: '#515255', 40: '#5d5e61', 50: '#76777a',
    60: '#8f9194', 70: '#aaabae', 80: '#c6c6c9', 90: '#e2e2e5',
    95: '#f0f0f3', 98: '#f9f9fc', 99: '#fcfcff', 100: '#ffffff',
  },
  'neutral-variant': {
    0: '#000000', 10: '#161c22', 20: '#2b3137', 25: '#363c42',
    30: '#41474d', 35: '#4d5359', 40: '#595f65', 50: '#72787e',
    60: '#8b9198', 70: '#a6acb3', 80: '#c1c7ce', 90: '#dee3ea',
    95: '#ecf1f9', 98: '#f7f9ff', 99: '#fcfcff', 100: '#ffffff',
  },
  'error': {
    0: '#000000', 10: '#410002', 20: '#690005', 25: '#7e0007',
    30: '#93000a', 35: '#a80710', 40: '#ba1a1a', 50: '#de3730',
    60: '#ff5449', 70: '#ff897d', 80: '#ffb4ab', 90: '#ffdad6',
    95: '#ffedea', 98: '#fff8f7', 99: '#fffbff', 100: '#ffffff',
  },
};
