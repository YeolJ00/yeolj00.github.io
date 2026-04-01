// ========================================
// Configuration & Constants
// ========================================

// GitHub Gist Configuration
// Replace these with your own values
export const GIST_ID = '';
export const GITHUB_TOKEN = '';
export const PASSWORD_HASH = '';
export const GIST_FILENAME = 'meomunjari-data.json';

// Color Palette (soft tones based on colorhunt palette)
export const COLORS = {
    blue:       '#5A9CB5',
    blueSoft:   '#7BB4C9',
    blueLight:  '#A8D1E0',
    yellow:     '#FACE68',
    yellowSoft: '#FBD98A',
    orange:     '#FAAC68',
    orangeSoft: '#FBC08A',
    coral:      '#FA6868',
    coralSoft:  '#FB8A8A',

    // Light mode
    lightBg:        '#F5F0E8',
    lightBgAlt:     '#EDE7DC',
    lightSurface:   '#FFFDF8',
    lightText:      '#3D3528',
    lightTextSub:   '#7A7062',
    lightBorder:    '#E0D9CE',

    // Dark mode
    darkBg:         '#1E1E24',
    darkBgAlt:      '#28282F',
    darkSurface:    '#32323A',
    darkText:       '#E8E4DC',
    darkTextSub:    '#9E998F',
    darkBorder:     '#3E3E46',
};

// Country colors for the map (soft palette)
export const MAP_COUNTRY_COLORS = [
    '#D4E4D9',  // sage green
    '#E0D5C8',  // warm beige
    '#D4D9E4',  // soft lavender-blue
    '#E4DDD4',  // light taupe
    '#C8D8D4',  // muted teal
    '#D9D4D0',  // warm gray
    '#D8E0D4',  // light olive
    '#E0D8D0',  // cream
];

export const MAP_COUNTRY_COLORS_DARK = [
    '#2A3630',
    '#352F28',
    '#2A2F38',
    '#35302A',
    '#283530',
    '#302E2B',
    '#2F3528',
    '#35302B',
];

// Map SVG config
export const MAP_CONFIG = {
    viewBoxWidth: 2000,
    viewBoxHeight: 857,
};

// Korea map SVG config
// Calibration derived from 3 reference circles in kr.svg #points group:
//   id=0: lat=33.469, lng=124.929 → cx=115.2, cy=910.5
//   id=1: lat=35.640, lng=128.082 → cx=542.8, cy=553.1
//   id=2: lat=38.353, lng=130.605 → cx=884.8, cy=92.5
export const KOREA_MAP_CONFIG = {
    viewBoxWidth: 1000,
    viewBoxHeight: 1000,
    // Linear mapping: cx = xRef + (lng - lngRef) * xScale
    //                 cy = yRef + (lat - latRef) * yScale
    calib: {
        lngRef: 124.929, xRef: 115.2, xScale: 135.53,  // (884.8-115.2)/(130.605-124.929)
        latRef: 33.469,  yRef: 910.5, yScale: -167.63,  // (92.5-910.5)/(38.353-33.469)
    },
};

// Country geographic bounding boxes for accurate SVG mapping
// { latMin, latMax, lngMin, lngMax }
export const COUNTRY_GEO = {
    JP: { latMin: 24, latMax: 46, lngMin: 123, lngMax: 146 },
    KR: { latMin: 33.1, latMax: 38.6, lngMin: 124.6, lngMax: 131.9 },
    FR: { latMin: 41.3, latMax: 51.1, lngMin: -5.1, lngMax: 9.6 },
    US: { latMin: 24.5, latMax: 49.4, lngMin: -124.8, lngMax: -66.9 },
    GB: { latMin: 49.9, latMax: 58.7, lngMin: -8.2, lngMax: 1.8 },
    DE: { latMin: 47.3, latMax: 55.1, lngMin: 5.9, lngMax: 15.0 },
    IT: { latMin: 36.6, latMax: 47.1, lngMin: 6.6, lngMax: 18.5 },
    ES: { latMin: 36.0, latMax: 43.8, lngMin: -9.3, lngMax: 3.3 },
    TH: { latMin: 5.6, latMax: 20.5, lngMin: 97.3, lngMax: 105.6 },
    VN: { latMin: 8.6, latMax: 23.4, lngMin: 102.1, lngMax: 109.5 },
    CN: { latMin: 18.2, latMax: 53.6, lngMin: 73.5, lngMax: 134.8 },
    TW: { latMin: 21.9, latMax: 25.3, lngMin: 120.0, lngMax: 122.0 },
    AU: { latMin: -43.6, latMax: -10.7, lngMin: 113.2, lngMax: 153.6 },
    CA: { latMin: 41.7, latMax: 83.1, lngMin: -141.0, lngMax: -52.6 },
    NZ: { latMin: -47.3, latMax: -34.4, lngMin: 166.4, lngMax: 178.6 },
    IN: { latMin: 6.7, latMax: 35.5, lngMin: 68.2, lngMax: 97.4 },
    BR: { latMin: -33.8, latMax: 5.3, lngMin: -73.6, lngMax: -34.8 },
    EG: { latMin: 22.0, latMax: 31.7, lngMin: 24.7, lngMax: 36.9 },
    ZA: { latMin: -34.8, latMax: -22.1, lngMin: 16.5, lngMax: 32.9 },
    MX: { latMin: 14.5, latMax: 32.7, lngMin: -117.1, lngMax: -86.7 },
    AR: { latMin: -55.1, latMax: -21.8, lngMin: -73.6, lngMax: -53.6 },
    GR: { latMin: 34.8, latMax: 41.8, lngMin: 19.4, lngMax: 29.6 },
    TR: { latMin: 36.0, latMax: 42.1, lngMin: 26.0, lngMax: 44.8 },
    PT: { latMin: 37.0, latMax: 42.2, lngMin: -9.5, lngMax: -6.2 },
    AT: { latMin: 46.4, latMax: 49.0, lngMin: 9.5, lngMax: 17.2 },
    CH: { latMin: 45.8, latMax: 47.8, lngMin: 6.0, lngMax: 10.5 },
    CZ: { latMin: 48.6, latMax: 51.1, lngMin: 12.1, lngMax: 18.9 },
    HR: { latMin: 42.4, latMax: 46.6, lngMin: 13.5, lngMax: 19.4 },
    SG: { latMin: 1.2, latMax: 1.5, lngMin: 103.6, lngMax: 104.0 },
    MY: { latMin: 0.9, latMax: 7.4, lngMin: 99.6, lngMax: 119.3 },
    PH: { latMin: 4.6, latMax: 21.1, lngMin: 116.9, lngMax: 126.6 },
    ID: { latMin: -11.0, latMax: 5.9, lngMin: 95.0, lngMax: 141.0 },
    AE: { latMin: 22.6, latMax: 26.1, lngMin: 51.6, lngMax: 56.4 },
};

// Country name variants used in the SVG (class names)
export const COUNTRY_SVG_NAMES = {
    JP: 'Japan',
    US: 'United States',
    GB: 'United Kingdom',
    AU: 'Australia',
    NZ: 'New Zealand',
    AR: 'Argentina',
    FR: 'France',
};

// Fallback linear formula (calibrated from SVG reference points)
export function latLngToSvgFallback(lat, lng) {
    const x = 5.512 * lng + 981.8;
    const y = -6.518 * lat + 501.4;
    return { x, y };
}

// Animation durations (ms)
export const ANIM = {
    fast:       200,
    normal:     400,
    slow:       700,
    verySlow:   1200,
    entrance:   1500,
    mapZoom:    800,
    panelSlide: 500,
    pinBounce:  600,
    stagger:    30,
};

// Clustering config
export const CLUSTER = {
    minDistance: 40,   // minimum pixel distance before clustering
    zoomThreshold: 3, // zoom level at which clusters always expand
};

// Sample trip data for demo (non-KR trips for world map)
export const SAMPLE_TRIPS = [
    {
        id: '1',
        title: '도쿄 여행',
        location: '도쿄, 일본',
        lat: 35.6762,
        lng: 139.6503,
        startDate: '2024-03-15',
        endDate: '2024-03-22',
        comment: '벚꽃이 피기 시작하는 시기에 방문. 시부야, 아사쿠사, 하라주쿠 등을 돌아다녔다.',
        images: ['https://picsum.photos/seed/tokyo1/400/300', 'https://picsum.photos/seed/tokyo2/400/300'],
        thumbnail: 'https://picsum.photos/seed/tokyo1/200/150',
        country: 'JP',
    },
    {
        id: '2',
        title: '파리 여행 2023',
        location: '파리, 프랑스',
        lat: 48.8566,
        lng: 2.3522,
        startDate: '2023-07-10',
        endDate: '2023-07-17',
        comment: '에펠탑, 루브르 박물관, 몽마르트 언덕. 크루아상이 정말 맛있었다.',
        images: ['https://picsum.photos/seed/paris1/400/300', 'https://picsum.photos/seed/paris2/400/300'],
        thumbnail: 'https://picsum.photos/seed/paris1/200/150',
        country: 'FR',
    },
    {
        id: '6',
        title: '파리 여행 2024',
        location: '파리, 프랑스',
        lat: 48.8566,
        lng: 2.3522,
        startDate: '2024-06-15',
        endDate: '2024-06-22',
        comment: '오르세 미술관과 마레 지구 탐방. 세느강 유람선이 인상적이었다.',
        images: ['https://picsum.photos/seed/paris3/400/300', 'https://picsum.photos/seed/paris4/400/300'],
        thumbnail: 'https://picsum.photos/seed/paris3/200/150',
        country: 'FR',
    },
    {
        id: '3',
        title: '뉴욕 여행',
        location: '뉴욕, 미국',
        lat: 40.7128,
        lng: -74.0060,
        startDate: '2023-12-20',
        endDate: '2023-12-28',
        comment: '타임스퀘어에서 연말을 보냈다. 센트럴파크 산책이 좋았다.',
        images: ['https://picsum.photos/seed/nyc1/400/300'],
        thumbnail: 'https://picsum.photos/seed/nyc1/200/150',
        country: 'US',
    },
    {
        id: '5',
        title: '오사카 여행',
        location: '오사카, 일본',
        lat: 34.6937,
        lng: 135.5023,
        startDate: '2024-03-23',
        endDate: '2024-03-26',
        comment: '도톤보리에서 타코야키, 오사카성 방문.',
        images: ['https://picsum.photos/seed/osaka1/400/300'],
        thumbnail: 'https://picsum.photos/seed/osaka1/200/150',
        country: 'JP',
    },
];

// Korea-only trips (shown on Korea map)
export const SAMPLE_KR_TRIPS = [
    {
        id: 'kr1',
        title: '제주도 여행',
        location: '제주, 대한민국',
        lat: 33.4996,
        lng: 126.5312,
        startDate: '2024-05-01',
        endDate: '2024-05-05',
        comment: '한라산 등반과 해안 드라이브. 흑돼지가 맛있었다.',
        images: ['https://picsum.photos/seed/jeju1/400/300', 'https://picsum.photos/seed/jeju2/400/300'],
        thumbnail: 'https://picsum.photos/seed/jeju1/200/150',
        country: 'KR',
    },
    {
        id: 'kr2',
        title: '서울 나들이',
        location: '서울, 대한민국',
        lat: 37.5665,
        lng: 126.9780,
        startDate: '2024-01-12',
        endDate: '2024-01-14',
        comment: '경복궁, 북촌 한옥마을, 광장시장 먹거리 투어.',
        images: ['https://picsum.photos/seed/seoul1/400/300', 'https://picsum.photos/seed/seoul2/400/300'],
        thumbnail: 'https://picsum.photos/seed/seoul1/200/150',
        country: 'KR',
    },
    {
        id: 'kr3',
        title: '부산 여행',
        location: '부산, 대한민국',
        lat: 35.1796,
        lng: 129.0756,
        startDate: '2023-08-10',
        endDate: '2023-08-13',
        comment: '해운대, 감천문화마을, 자갈치시장. 회가 신선했다.',
        images: ['https://picsum.photos/seed/busan1/400/300'],
        thumbnail: 'https://picsum.photos/seed/busan1/200/150',
        country: 'KR',
    },
    {
        id: 'kr4',
        title: '강릉 여행',
        location: '강릉, 대한민국',
        lat: 37.7519,
        lng: 128.8761,
        startDate: '2024-02-20',
        endDate: '2024-02-22',
        comment: '경포대 해변과 초당 순두부. 겨울 바다가 멋있었다.',
        images: ['https://picsum.photos/seed/gangneung1/400/300'],
        thumbnail: 'https://picsum.photos/seed/gangneung1/200/150',
        country: 'KR',
    },
];

// ========================================
// Diary - Sample Date Entries
// ========================================
export const SAMPLE_DATES = [
    { id: 'd01', date: '2025-09-14', description: '홍대에서 카페 투어. 딸기 케이크가 너무 맛있었다.', thumbnail: 'https://picsum.photos/seed/d01/300/300', images: ['https://picsum.photos/seed/d01a/400/300','https://picsum.photos/seed/d01b/400/300','https://picsum.photos/seed/d01c/400/300','https://picsum.photos/seed/d01d/400/300','https://picsum.photos/seed/d01e/400/300'] },
    { id: 'd02', date: '2025-09-21', description: '한강에서 치킨 먹으면서 석양 구경.', thumbnail: 'https://picsum.photos/seed/d02/300/300', images: ['https://picsum.photos/seed/d02a/400/300','https://picsum.photos/seed/d02b/400/300','https://picsum.photos/seed/d02c/400/300','https://picsum.photos/seed/d02d/400/300','https://picsum.photos/seed/d02e/400/300','https://picsum.photos/seed/d02f/400/300'] },
    { id: 'd03', date: '2025-09-28', description: '이태원 브런치 데이트. 팬케이크 맛집 발견!', thumbnail: 'https://picsum.photos/seed/d03/300/300', images: ['https://picsum.photos/seed/d03a/400/300','https://picsum.photos/seed/d03b/400/300','https://picsum.photos/seed/d03c/400/300','https://picsum.photos/seed/d03d/400/300','https://picsum.photos/seed/d03e/400/300'] },
    { id: 'd04', date: '2025-10-05', description: '북촌 한옥마을 산책. 한복 입고 사진 많이 찍었다.', thumbnail: 'https://picsum.photos/seed/d04/300/300', images: ['https://picsum.photos/seed/d04a/400/300','https://picsum.photos/seed/d04b/400/300','https://picsum.photos/seed/d04c/400/300','https://picsum.photos/seed/d04d/400/300','https://picsum.photos/seed/d04e/400/300','https://picsum.photos/seed/d04f/400/300','https://picsum.photos/seed/d04g/400/300'] },
    { id: 'd05', date: '2025-10-12', description: '잠실 롯데월드 데이트. 바이킹 같이 탔다!', thumbnail: 'https://picsum.photos/seed/d05/300/300', images: ['https://picsum.photos/seed/d05a/400/300','https://picsum.photos/seed/d05b/400/300','https://picsum.photos/seed/d05c/400/300','https://picsum.photos/seed/d05d/400/300','https://picsum.photos/seed/d05e/400/300'] },
    { id: 'd06', date: '2025-10-19', description: '성수동 갤러리 투어. 예쁜 카페도 많았다.', thumbnail: 'https://picsum.photos/seed/d06/300/300', images: ['https://picsum.photos/seed/d06a/400/300','https://picsum.photos/seed/d06b/400/300','https://picsum.photos/seed/d06c/400/300','https://picsum.photos/seed/d06d/400/300','https://picsum.photos/seed/d06e/400/300'] },
    { id: 'd07', date: '2025-10-26', description: '남산타워 야경 데이트. 자물쇠도 걸었다.', thumbnail: 'https://picsum.photos/seed/d07/300/300', images: ['https://picsum.photos/seed/d07a/400/300','https://picsum.photos/seed/d07b/400/300','https://picsum.photos/seed/d07c/400/300','https://picsum.photos/seed/d07d/400/300','https://picsum.photos/seed/d07e/400/300','https://picsum.photos/seed/d07f/400/300'] },
    { id: 'd08', date: '2025-11-02', description: '단풍 구경하러 남이섬. 날씨가 완벽했다.', thumbnail: 'https://picsum.photos/seed/d08/300/300', images: ['https://picsum.photos/seed/d08a/400/300','https://picsum.photos/seed/d08b/400/300','https://picsum.photos/seed/d08c/400/300','https://picsum.photos/seed/d08d/400/300','https://picsum.photos/seed/d08e/400/300'] },
    { id: 'd09', date: '2025-11-09', description: '합정 영화관에서 영화 보고 파스타 먹었다.', thumbnail: 'https://picsum.photos/seed/d09/300/300', images: ['https://picsum.photos/seed/d09a/400/300','https://picsum.photos/seed/d09b/400/300','https://picsum.photos/seed/d09c/400/300','https://picsum.photos/seed/d09d/400/300','https://picsum.photos/seed/d09e/400/300'] },
    { id: 'd10', date: '2025-11-15', description: '경복궁 야간개장. 한복 대여하고 야경 사진 많이 찍었다.', thumbnail: 'https://picsum.photos/seed/d10/300/300', images: ['https://picsum.photos/seed/d10a/400/300','https://picsum.photos/seed/d10b/400/300','https://picsum.photos/seed/d10c/400/300','https://picsum.photos/seed/d10d/400/300','https://picsum.photos/seed/d10e/400/300','https://picsum.photos/seed/d10f/400/300'] },
    { id: 'd11', date: '2025-11-23', description: '이케아에서 같이 장보고 집에서 요리해 먹었다.', thumbnail: 'https://picsum.photos/seed/d11/300/300', images: ['https://picsum.photos/seed/d11a/400/300','https://picsum.photos/seed/d11b/400/300','https://picsum.photos/seed/d11c/400/300','https://picsum.photos/seed/d11d/400/300','https://picsum.photos/seed/d11e/400/300'] },
    { id: 'd12', date: '2025-12-06', description: '크리스마스 마켓 구경. 핫초코랑 슈톨렌 먹었다.', thumbnail: 'https://picsum.photos/seed/d12/300/300', images: ['https://picsum.photos/seed/d12a/400/300','https://picsum.photos/seed/d12b/400/300','https://picsum.photos/seed/d12c/400/300','https://picsum.photos/seed/d12d/400/300','https://picsum.photos/seed/d12e/400/300','https://picsum.photos/seed/d12f/400/300'] },
    { id: 'd13', date: '2025-12-14', description: '광화문 일루미네이션 축제. 너무 예뻤다.', thumbnail: 'https://picsum.photos/seed/d13/300/300', images: ['https://picsum.photos/seed/d13a/400/300','https://picsum.photos/seed/d13b/400/300','https://picsum.photos/seed/d13c/400/300','https://picsum.photos/seed/d13d/400/300','https://picsum.photos/seed/d13e/400/300'] },
    { id: 'd14', date: '2025-12-24', description: '크리스마스 이브! 이태원에서 디너.', thumbnail: 'https://picsum.photos/seed/d14/300/300', images: ['https://picsum.photos/seed/d14a/400/300','https://picsum.photos/seed/d14b/400/300','https://picsum.photos/seed/d14c/400/300','https://picsum.photos/seed/d14d/400/300','https://picsum.photos/seed/d14e/400/300','https://picsum.photos/seed/d14f/400/300','https://picsum.photos/seed/d14g/400/300'] },
    { id: 'd15', date: '2025-12-31', description: '연말 카운트다운. 종각에서 보신각 타종 들었다.', thumbnail: 'https://picsum.photos/seed/d15/300/300', images: ['https://picsum.photos/seed/d15a/400/300','https://picsum.photos/seed/d15b/400/300','https://picsum.photos/seed/d15c/400/300','https://picsum.photos/seed/d15d/400/300','https://picsum.photos/seed/d15e/400/300'] },
    { id: 'd16', date: '2026-01-04', description: '새해 첫 데이트. 뚝섬 한강공원 산책.', thumbnail: 'https://picsum.photos/seed/d16/300/300', images: ['https://picsum.photos/seed/d16a/400/300','https://picsum.photos/seed/d16b/400/300','https://picsum.photos/seed/d16c/400/300','https://picsum.photos/seed/d16d/400/300','https://picsum.photos/seed/d16e/400/300'] },
    { id: 'd17', date: '2026-01-11', description: '연남동 빈티지 숍 투어. 귀여운 악세사리 샀다.', thumbnail: 'https://picsum.photos/seed/d17/300/300', images: ['https://picsum.photos/seed/d17a/400/300','https://picsum.photos/seed/d17b/400/300','https://picsum.photos/seed/d17c/400/300','https://picsum.photos/seed/d17d/400/300','https://picsum.photos/seed/d17e/400/300'] },
    { id: 'd18', date: '2026-01-25', description: '설날 연휴에 같이 떡국 끓여 먹었다.', thumbnail: 'https://picsum.photos/seed/d18/300/300', images: ['https://picsum.photos/seed/d18a/400/300','https://picsum.photos/seed/d18b/400/300','https://picsum.photos/seed/d18c/400/300','https://picsum.photos/seed/d18d/400/300','https://picsum.photos/seed/d18e/400/300','https://picsum.photos/seed/d18f/400/300'] },
];

// Diary animation/layout config
export const DIARY_ANIM = {
    bubbleSize: 110,
    bubbleSizeMobile: 85,
    spiralBaseRadius: 65,
    entranceStagger: 60,
    monthTransitionDuration: 500,
};

// Month accent colors — seasonal soft tones (keyed by calendar month 1-12)
export const MONTH_COLORS = {
    // Winter: cool & muted
    12: '#8FAABE',  // quiet slate blue
    1:  '#9DB8CC',  // frosty blue
    2:  '#B0C4D8',  // pale winter sky
    // Spring: soft pastels
    3:  '#A7C4A0',  // budding sage
    4:  '#C3B1D1',  // soft lavender
    5:  '#E0B6C1',  // cherry blossom
    // Summer: warm & bright (but muted)
    6:  '#D4C69A',  // warm wheat
    7:  '#D9A892',  // peach sand
    8:  '#C8B895',  // sun-bleached gold
    // Autumn: earthy & warm
    9:  '#C4A67D',  // amber
    10: '#C08B6E',  // terracotta
    11: '#A38A7B',  // warm walnut
};

// Month entrance animation presets (keyed by calendar month 1-12)
export const MONTH_ENTRANCE_PRESETS = {
    1:  'snowfall',
    2:  'heartbeat',
    3:  'bloom',
    4:  'raindrops',
    5:  'spiralIn',
    6:  'wave',
    7:  'fireworks',
    8:  'cascade',
    9:  'fadeSpiral',
    10: 'scatter',
    11: 'curtainDrop',
    12: 'twinkle',
};
