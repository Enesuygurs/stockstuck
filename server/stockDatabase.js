import { generateFullTefasDatabase } from './tefasMasterDatabase.js';

// Global ETFs (NASDAQ / NYSE / CBOE)
const GLOBAL_ETFS = [
  // Mega Index & Total Market
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', trName: 'SPDR S&P 500 Endeks Fonu', sector: 'Global Endeks ETF', subSector: 'Geniş Piyasa', marketCap: 560000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 5, category: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (NASDAQ 100)', trName: 'Invesco NASDAQ 100 Teknoloji ETF', sector: 'Global Endeks ETF', subSector: 'Teknoloji & Büyüme', marketCap: 290000000000, exchange: 'NASDAQ', manager: 'Invesco', fee: '0.20%', risk: 6, category: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', trName: 'Vanguard S&P 500 ETF', sector: 'Global Endeks ETF', subSector: 'Geniş Piyasa', marketCap: 480000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.03%', risk: 5, category: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', trName: 'Vanguard Tüm ABD Borsası ETF', sector: 'Global Endeks ETF', subSector: 'Tüm Piyasa', marketCap: 390000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.03%', risk: 5, category: 'ETF' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', trName: 'iShares S&P 500 Endeks Fonu', sector: 'Global Endeks ETF', subSector: 'Geniş Piyasa', marketCap: 470000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.03%', risk: 5, category: 'ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', trName: 'Dow Jones 30 Endeks ETF', sector: 'Global Endeks ETF', subSector: 'Sanayi & Değer', marketCap: 38000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.16%', risk: 5, category: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', trName: 'iShares Küçük Ölçekli Şirketler (Russell 2000)', sector: 'Global Endeks ETF', subSector: 'Küçük Ölçekli', marketCap: 65000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.19%', risk: 6, category: 'ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF', trName: 'Vanguard Tüm Dünya Borsası ETF', sector: 'Global Endeks ETF', subSector: 'Tüm Dünya', marketCap: 42000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.07%', risk: 5, category: 'ETF' },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', trName: 'Schwab ABD Temettü Hisseleri ETF', sector: 'Global Endeks ETF', subSector: 'Yüksek Temettü', marketCap: 58000000000, exchange: 'NYSE', manager: 'Charles Schwab', fee: '0.06%', risk: 4, category: 'ETF' },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income ETF', trName: 'JPMorgan Aylık Gelir & Temettü ETF', sector: 'Global Endeks ETF', subSector: 'Opsiyon Gelir Fonu', marketCap: 35000000000, exchange: 'NYSE', manager: 'JPMorgan', fee: '0.35%', risk: 4, category: 'ETF' },
  { symbol: 'JEPQ', name: 'JPMorgan Nasdaq Equity Premium Income', trName: 'JPMorgan NASDAQ Gelir & Opsiyon ETF', sector: 'Global Endeks ETF', subSector: 'NASDAQ Opsiyon Gelir', marketCap: 18000000000, exchange: 'NASDAQ', manager: 'JPMorgan', fee: '0.35%', risk: 5, category: 'ETF' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', trName: 'Vanguard Gelişmiş Ülkeler Piyasası ETF', sector: 'Global Endeks ETF', subSector: 'Gelişmiş Piyasalar', marketCap: 125000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.05%', risk: 5, category: 'ETF' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', trName: 'Vanguard Gelişmekte Olan Ülkeler ETF', sector: 'Global Endeks ETF', subSector: 'Gelişen Piyasalar', marketCap: 80000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.08%', risk: 6, category: 'ETF' },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', trName: 'iShares Gelişen Piyasalar ETF', sector: 'Global Endeks ETF', subSector: 'Gelişen Ülkeler', marketCap: 22000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.68%', risk: 6, category: 'ETF' },

  // Leveraged & High-Volume Trading ETFs
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ (3x)', trName: 'ProShares 3x Kaldıraçlı NASDAQ ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '3x Kaldıraçlı Teknoloji', marketCap: 25000000000, exchange: 'NASDAQ', manager: 'ProShares', fee: '0.86%', risk: 7, category: 'ETF' },
  { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ (-3x)', trName: 'ProShares -3x Ters NASDAQ ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '-3x Ters Teknoloji', marketCap: 4500000000, exchange: 'NASDAQ', manager: 'ProShares', fee: '0.95%', risk: 7, category: 'ETF' },
  { symbol: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3x', trName: 'Direxion 3x Kaldıraçlı Yarı İletken ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '3x Kaldıraçlı Çip', marketCap: 11000000000, exchange: 'NYSE', manager: 'Direxion', fee: '0.76%', risk: 7, category: 'ETF' },
  { symbol: 'SOXS', name: 'Direxion Daily Semiconductor Bear 3x', trName: 'Direxion -3x Ters Yarı İletken ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '-3x Ters Çip', marketCap: 1500000000, exchange: 'NYSE', manager: 'Direxion', fee: '0.95%', risk: 7, category: 'ETF' },
  { symbol: 'NVDL', name: 'GraniteShares 2x Long NVDA Daily ETF', trName: 'GraniteShares 2x Kaldıraçlı NVIDIA ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '2x Tek Hisse ETF', marketCap: 5200000000, exchange: 'NASDAQ', manager: 'GraniteShares', fee: '1.15%', risk: 7, category: 'ETF' },
  { symbol: 'TSLL', name: 'Direxion Daily TSLA Bull 2X Shares', trName: 'Direxion 2x Kaldıraçlı Tesla ETF', sector: 'Kaldıraçlı & Özel ETF', subSector: '2x Tek Hisse ETF', marketCap: 2100000000, exchange: 'NASDAQ', manager: 'Direxion', fee: '0.97%', risk: 7, category: 'ETF' },

  // Sector & Thematic & Tech ETFs
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF', trName: 'VanEck Yarı İletken & Çip ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Yarı İletkenler & Çip', marketCap: 24000000000, exchange: 'NASDAQ', manager: 'VanEck', fee: '0.35%', risk: 7, category: 'ETF' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', trName: 'iShares Yarı İletken ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Yarı İletkenler', marketCap: 15000000000, exchange: 'NASDAQ', manager: 'BlackRock', fee: '0.35%', risk: 7, category: 'ETF' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', trName: 'SPDR Teknoloji Sektör ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Yazılım & Donanım', marketCap: 72000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 6, category: 'ETF' },
  { symbol: 'VGT', name: 'Vanguard Information Technology ETF', trName: 'Vanguard Bilişim Teknolojileri ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Bilişim Teknolojileri', marketCap: 68000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.10%', risk: 6, category: 'ETF' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', trName: 'SPDR Finans & Bankacılık ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Finansal Hizmetler', marketCap: 45000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 5, category: 'ETF' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', trName: 'SPDR Küresel Enerji & Petrol ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Petrol & Gaz', marketCap: 38000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 6, category: 'ETF' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', trName: 'SPDR Sağlık & Biyofarma ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Sağlık & İlaç', marketCap: 42000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 4, category: 'ETF' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR Fund', trName: 'SPDR Sanayi & Savunma Sektör ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Sanayi & Ağır Makine', marketCap: 21000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 5, category: 'ETF' },
  { symbol: 'XLU', name: 'Utilities Select Sector SPDR Fund', trName: 'SPDR Altyapı & Kamu Hizmetleri ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Elektrik & Altyapı', marketCap: 16000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.09%', risk: 4, category: 'ETF' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', trName: 'ARK İnovasyon & Gelecek Teknolojileri ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Yıkıcı İnovasyon', marketCap: 6500000000, exchange: 'NYSE', manager: 'ARK Invest', fee: '0.75%', risk: 7, category: 'ETF' },
  { symbol: 'BOTZ', name: 'Global X Robotics & AI ETF', trName: 'Global X Robotik & Yapay Zeka ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Robotik & Yapay Zeka', marketCap: 2800000000, exchange: 'NASDAQ', manager: 'Global X', fee: '0.68%', risk: 7, category: 'ETF' },
  { symbol: 'AIQ', name: 'Global X Artificial Intelligence & Tech', trName: 'Global X Yapay Zeka ve Büyük Veri ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Yapay Zeka & Büyük Veri', marketCap: 2100000000, exchange: 'NASDAQ', manager: 'Global X', fee: '0.68%', risk: 7, category: 'ETF' },
  { symbol: 'KWEB', name: 'KraneShares CSI China Internet ETF', trName: 'KraneShares Çin İnternet & Teknoloji ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Çin İnternet Devleri', marketCap: 5800000000, exchange: 'NYSE', manager: 'KraneShares', fee: '0.69%', risk: 7, category: 'ETF' },
  { symbol: 'URNM', name: 'Sprott Uranium Miners ETF', trName: 'Sprott Uranyum & Nükleer Madencilik ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Uranyum & Temiz Nükleer', marketCap: 1800000000, exchange: 'NYSE', manager: 'Sprott', fee: '0.75%', risk: 7, category: 'ETF' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', trName: 'Vanguard Gayrimenkul & REIT ETF', sector: 'Teknoloji & Sektör ETF', subSector: 'Gayrimenkul Yatırım', marketCap: 34000000000, exchange: 'NYSE', manager: 'Vanguard', fee: '0.12%', risk: 5, category: 'ETF' },

  // Crypto & Commodity ETFs
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', trName: 'BlackRock Spot Bitcoin ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Kripto Varlık', marketCap: 38000000000, exchange: 'NASDAQ', manager: 'BlackRock', fee: '0.25%', risk: 7, category: 'CRYPTO' },
  { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', trName: 'Fidelity Spot Bitcoin ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Kripto Varlık', marketCap: 14000000000, exchange: 'NYSE', manager: 'Fidelity', fee: '0.25%', risk: 7, category: 'CRYPTO' },
  { symbol: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', trName: 'Cathie Wood Spot Bitcoin ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Kripto Varlık', marketCap: 3200000000, exchange: 'CBOE', manager: 'ARK Invest', fee: '0.21%', risk: 7, category: 'CRYPTO' },
  { symbol: 'BITO', name: 'ProShares Bitcoin Strategy ETF', trName: 'ProShares Bitcoin Vadeli ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Bitcoin Vadeli', marketCap: 2100000000, exchange: 'NYSE', manager: 'ProShares', fee: '0.95%', risk: 7, category: 'CRYPTO' },
  { symbol: 'ETHA', name: 'iShares Ethereum Trust ETF', trName: 'BlackRock Spot Ethereum ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Kripto Varlık', marketCap: 1800000000, exchange: 'NASDAQ', manager: 'BlackRock', fee: '0.25%', risk: 7, category: 'CRYPTO' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', trName: 'SPDR Fiziki Altın Fonu', sector: 'Kripto & Emtia Fonları', subSector: 'Değerli Maden', marketCap: 75000000000, exchange: 'NYSE', manager: 'State Street', fee: '0.40%', risk: 4, category: 'COMMODITY' },
  { symbol: 'IAU', name: 'iShares Gold Trust', trName: 'iShares Fiziki Altın Fonu', sector: 'Kripto & Emtia Fonları', subSector: 'Değerli Maden', marketCap: 32000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.25%', risk: 4, category: 'COMMODITY' },
  { symbol: 'SLV', name: 'iShares Silver Trust', trName: 'iShares Fiziki Gümüş Fonu', sector: 'Kripto & Emtia Fonları', subSector: 'Değerli Maden', marketCap: 16000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.50%', risk: 5, category: 'COMMODITY' },
  { symbol: 'GDX', name: 'VanEck Gold Miners ETF', trName: 'VanEck Altın Madenciliği Şirketleri ETF', sector: 'Kripto & Emtia Fonları', subSector: 'Maden Şirketleri', marketCap: 14500000000, exchange: 'NYSE', manager: 'VanEck', fee: '0.51%', risk: 6, category: 'COMMODITY' },
  { symbol: 'USO', name: 'United States Oil Fund', trName: 'ABD Ham Petrol Emtia Fonu', sector: 'Kripto & Emtia Fonları', subSector: 'Ham Petrol', marketCap: 1400000000, exchange: 'NYSE', manager: 'USCF', fee: '0.60%', risk: 7, category: 'COMMODITY' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', trName: 'iShares 20+ Yıl ABD Hazine Tahvil ETF', sector: 'Tahvil & Bono ETF', subSector: 'Devlet Tahvili', marketCap: 52000000000, exchange: 'NASDAQ', manager: 'BlackRock', fee: '0.15%', risk: 4, category: 'ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', trName: 'Vanguard Tüm ABD Tahvil Piyasası ETF', sector: 'Tahvil & Bono ETF', subSector: 'Toplam Tahvil', marketCap: 110000000000, exchange: 'NASDAQ', manager: 'Vanguard', fee: '0.03%', risk: 3, category: 'ETF' },
  { symbol: 'HYG', name: 'iShares iBoxx High Yield Corporate Bond', trName: 'iShares Yüksek Getirili Şirket Tahvili ETF', sector: 'Tahvil & Bono ETF', subSector: 'Yüksek Getirili Tahvil', marketCap: 18000000000, exchange: 'NYSE', manager: 'BlackRock', fee: '0.49%', risk: 5, category: 'ETF' },
];

export const STOCKS_DATABASE = {
  US: [
    // Mega Cap Tech & Growth
    { symbol: 'NVDA', name: 'NVIDIA Corporation', trName: 'NVIDIA', sector: 'Teknoloji', subSector: 'Yarı İletkenler', marketCap: 3100000000000, exchange: 'NASDAQ' },
    { symbol: 'AAPL', name: 'Apple Inc.', trName: 'Apple', sector: 'Teknoloji', subSector: 'Tüketici Elektroniği', marketCap: 3450000000000, exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', trName: 'Microsoft', sector: 'Teknoloji', subSector: 'Yazılım & Bulut', marketCap: 3200000000000, exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', trName: 'Amazon.com Inc.', sector: 'Tüketici Hizmetleri', subSector: 'E-Ticaret & Bulut', marketCap: 2100000000000, exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', trName: 'Alphabet Inc.', sector: 'İletişim & Medya', subSector: 'İnternet & AI', marketCap: 2050000000000, exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms Inc.', trName: 'Meta Platforms Inc.', sector: 'İletişim & Medya', subSector: 'Sosyal Medya & AI', marketCap: 1550000000000, exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', trName: 'Tesla', sector: 'Otomotiv & Enerji', subSector: 'Elektrikli Araçlar & AI', marketCap: 780000000000, exchange: 'NASDAQ' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', trName: 'Broadcom', sector: 'Teknoloji', subSector: 'Yarı İletkenler', marketCap: 790000000000, exchange: 'NASDAQ' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', trName: 'AMD', sector: 'Teknoloji', subSector: 'Yarı İletkenler', marketCap: 240000000000, exchange: 'NASDAQ' },
    { symbol: 'PLTR', name: 'Palantir Technologies', trName: 'Palantir AI', sector: 'Teknoloji', subSector: 'Yapay Zeka & Yazılım', marketCap: 145000000000, exchange: 'NYSE' },
    { symbol: 'NFLX', name: 'Netflix Inc.', trName: 'Netflix', sector: 'İletişim & Medya', subSector: 'Dijital Yayıncılık', marketCap: 380000000000, exchange: 'NASDAQ' },
    { symbol: 'COIN', name: 'Coinbase Global', trName: 'Coinbase', sector: 'Finans', subSector: 'Kripto Finans', marketCap: 75000000000, exchange: 'NASDAQ' },
    { symbol: 'MSTR', name: 'MicroStrategy Inc.', trName: 'MicroStrategy', sector: 'Teknoloji', subSector: 'Bitcoin & Kurumsal Yazılım', marketCap: 85000000000, exchange: 'NASDAQ' },
    { symbol: 'CRM', name: 'Salesforce Inc.', trName: 'Salesforce', sector: 'Teknoloji', subSector: 'Bulut & CRM', marketCap: 310000000000, exchange: 'NYSE' },
    { symbol: 'ORCL', name: 'Oracle Corporation', trName: 'Oracle', sector: 'Teknoloji', subSector: 'Veritabanı & Bulut', marketCap: 520000000000, exchange: 'NYSE' },
    { symbol: 'INTC', name: 'Intel Corporation', trName: 'Intel', sector: 'Teknoloji', subSector: 'Yarı İletkenler', marketCap: 105000000000, exchange: 'NASDAQ' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', trName: 'Qualcomm', sector: 'Teknoloji', subSector: 'Mobil Çipler & 5G', marketCap: 185000000000, exchange: 'NASDAQ' },
    { symbol: 'ARM', name: 'Arm Holdings plc', trName: 'Arm Holdings', sector: 'Teknoloji', subSector: 'Çip Mimarisi', marketCap: 155000000000, exchange: 'NASDAQ' },
    { symbol: 'MU', name: 'Micron Technology', trName: 'Micron', sector: 'Teknoloji', subSector: 'Bellek & Depolama', marketCap: 110000000000, exchange: 'NASDAQ' },
    { symbol: 'ASML', name: 'ASML Holding NV', trName: 'ASML', sector: 'Teknoloji', subSector: 'Litografi Ekipmanları', marketCap: 280000000000, exchange: 'NASDAQ' },
    { symbol: 'SMCI', name: 'Super Micro Computer', trName: 'Supermicro', sector: 'Teknoloji', subSector: 'AI Sunucuları', marketCap: 32000000000, exchange: 'NASDAQ' },
    
    // US Financials
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', trName: 'JPMorgan Chase', sector: 'Finans', subSector: 'Bankacılık', marketCap: 680000000000, exchange: 'NYSE' },
    { symbol: 'BAC', name: 'Bank of America', trName: 'Bank of America', sector: 'Finans', subSector: 'Bankacılık', marketCap: 340000000000, exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', trName: 'Visa', sector: 'Finans', subSector: 'Ödeme Sistemleri', marketCap: 610000000000, exchange: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard Inc.', trName: 'Mastercard', sector: 'Finans', subSector: 'Ödeme Sistemleri', marketCap: 480000000000, exchange: 'NYSE' },
    { symbol: 'GS', name: 'Goldman Sachs Group', trName: 'Goldman Sachs', sector: 'Finans', subSector: 'Yatırım Bankacılığı', marketCap: 180000000000, exchange: 'NYSE' },
    { symbol: 'MS', name: 'Morgan Stanley', trName: 'Morgan Stanley', sector: 'Finans', subSector: 'Varlık Yönetimi', marketCap: 195000000000, exchange: 'NYSE' },
    
    // Healthcare & Biotech
    { symbol: 'LLY', name: 'Eli Lilly and Company', trName: 'Eli Lilly', sector: 'Sağlık & İlaç', subSector: 'Biyoteknoloji & İlaç', marketCap: 760000000000, exchange: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth Group', trName: 'UnitedHealth', sector: 'Sağlık & İlaç', subSector: 'Sağlık Sigortası', marketCap: 540000000000, exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', trName: 'Johnson & Johnson', sector: 'Sağlık & İlaç', subSector: 'Medikal & İlaç', marketCap: 380000000000, exchange: 'NYSE' },
    { symbol: 'PFE', name: 'Pfizer Inc.', trName: 'Pfizer', sector: 'Sağlık & İlaç', subSector: 'İlaç', marketCap: 150000000000, exchange: 'NYSE' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', trName: 'AbbVie', sector: 'Sağlık & İlaç', subSector: 'Biyofarma', marketCap: 330000000000, exchange: 'NYSE' },
    
    // Energy & Industrial
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', trName: 'ExxonMobil', sector: 'Enerji', subSector: 'Petrol & Gaz', marketCap: 470000000000, exchange: 'NYSE' },
    { symbol: 'CVX', name: 'Chevron Corporation', trName: 'Chevron', sector: 'Enerji', subSector: 'Petrol & Gaz', marketCap: 280000000000, exchange: 'NYSE' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', trName: 'Caterpillar', sector: 'Sanayi', subSector: 'Ağır Makine', marketCap: 190000000000, exchange: 'NYSE' },
    { symbol: 'GE', name: 'GE Aerospace', trName: 'GE Aerospace', sector: 'Sanayi', subSector: 'Havacılık & Savunma', marketCap: 205000000000, exchange: 'NYSE' },
    { symbol: 'BA', name: 'Boeing Company', trName: 'Boeing', sector: 'Sanayi', subSector: 'Havacılık & Savunma', marketCap: 110000000000, exchange: 'NYSE' },
    
    // Consumer & Retail
    { symbol: 'WMT', name: 'Walmart Inc.', trName: 'Walmart', sector: 'Perakende', subSector: 'Süpermarket Zinciri', marketCap: 740000000000, exchange: 'NYSE' },
    { symbol: 'COST', name: 'Costco Wholesale', trName: 'Costco', sector: 'Perakende', subSector: 'Toptan & Perakende', marketCap: 430000000000, exchange: 'NASDAQ' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', trName: 'Procter & Gamble', sector: 'Tüketici Ürünleri', subSector: 'Kişisel Bakım', marketCap: 400000000000, exchange: 'NYSE' },
    { symbol: 'KO', name: 'Coca-Cola Company', trName: 'Coca-Cola', sector: 'Tüketici Ürünleri', subSector: 'İçecek', marketCap: 280000000000, exchange: 'NYSE' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', trName: 'PepsiCo', sector: 'Tüketici Ürünleri', subSector: 'İçecek & Atıştırmalık', marketCap: 220000000000, exchange: 'NASDAQ' },
    { symbol: 'MCD', name: 'McDonald\'s Corp.', trName: 'McDonald\'s', sector: 'Tüketici Hizmetleri', subSector: 'Restoran', marketCap: 215000000000, exchange: 'NYSE' },
    { symbol: 'NKE', name: 'Nike Inc.', trName: 'Nike', sector: 'Tüketici Ürünleri', subSector: 'Spor Giyim', marketCap: 115000000000, exchange: 'NYSE' },
    { symbol: 'DIS', name: 'Walt Disney Co.', trName: 'Disney', sector: 'İletişim & Medya', subSector: 'Eğlence & Tema Parkları', marketCap: 210000000000, exchange: 'NYSE' },
    { symbol: 'UBER', name: 'Uber Technologies', trName: 'Uber', sector: 'Teknoloji', subSector: 'Ulaşım & Teslimat', marketCap: 155000000000, exchange: 'NYSE' },
    { symbol: 'CRWD', name: 'CrowdStrike Holdings', trName: 'CrowdStrike', sector: 'Teknoloji', subSector: 'Siber Güvenlik', marketCap: 85000000000, exchange: 'NASDAQ' },
    { symbol: 'PANW', name: 'Palo Alto Networks', trName: 'Palo Alto', sector: 'Teknoloji', subSector: 'Siber Güvenlik', marketCap: 125000000000, exchange: 'NASDAQ' }
  ],
  BIST: [
    // Havacılık & Ulaştırma
    { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', trName: 'Türk Hava Yolları', sector: 'Ulaştırma & Havacılık', subSector: 'Havayolu Taşımacılığı', marketCap: 420000000000, exchange: 'BIST' },
    { symbol: 'PGSUS.IS', name: 'Pegasus Hava Taşımacılığı', trName: 'Pegasus', sector: 'Ulaştırma & Havacılık', subSector: 'Havayolu Taşımacılığı', marketCap: 115000000000, exchange: 'BIST' },
    { symbol: 'TAVHL.IS', name: 'TAV Havalimanları', trName: 'TAV Havalimanları', sector: 'Ulaştırma & Havacılık', subSector: 'Havalimanı İşletmeciliği', marketCap: 95000000000, exchange: 'BIST' },
    
    // Bankacılık & Finans
    { symbol: 'GARAN.IS', name: 'Garanti BBVA', trName: 'Garanti Bankası', sector: 'Bankacılık & Finans', subSector: 'Özel Bankacılık', marketCap: 490000000000, exchange: 'BIST' },
    { symbol: 'AKBNK.IS', name: 'Akbank T.A.Ş.', trName: 'Akbank', sector: 'Bankacılık & Finans', subSector: 'Özel Bankacılık', marketCap: 310000000000, exchange: 'BIST' },
    { symbol: 'ISCTR.IS', name: 'Türkiye İş Bankası (C)', trName: 'İş Bankası', sector: 'Bankacılık & Finans', subSector: 'Özel Bankacılık', marketCap: 340000000000, exchange: 'BIST' },
    { symbol: 'YKBNK.IS', name: 'Yapı ve Kredi Bankası', trName: 'Yapı Kredi', sector: 'Bankacılık & Finans', subSector: 'Özel Bankacılık', marketCap: 250000000000, exchange: 'BIST' },
    { symbol: 'VAKBN.IS', name: 'VakıfBank', trName: 'Vakıfbank', sector: 'Bankacılık & Finans', subSector: 'Kamu Bankacılığı', marketCap: 210000000000, exchange: 'BIST' },
    { symbol: 'HALKB.IS', name: 'Türkiye Halk Bankası', trName: 'Halkbank', sector: 'Bankacılık & Finans', subSector: 'Kamu Bankacılığı', marketCap: 160000000000, exchange: 'BIST' },
    { symbol: 'TSKB.IS', name: 'T.S.K.B.', trName: 'TSKB Kalkınma Bankası', sector: 'Bankacılık & Finans', subSector: 'Kalkınma Bankacılığı', marketCap: 38000000000, exchange: 'BIST' },
    
    // Savunma & Teknoloji
    { symbol: 'ASELS.IS', name: 'ASELSAN Elektronik Sanayi', trName: 'ASELSAN', sector: 'Savunma & Teknoloji', subSector: 'Savunma Elektroniği', marketCap: 315000000000, exchange: 'BIST' },
    { symbol: 'SDTTR.IS', name: 'SDT Uzay ve Savunma', trName: 'SDT Savunma', sector: 'Savunma & Teknoloji', subSector: 'Uzay & Savunma Yazılım', marketCap: 22000000000, exchange: 'BIST' },
    { symbol: 'MIATK.IS', name: 'Mia Teknoloji', trName: 'MİA Teknoloji', sector: 'Savunma & Teknoloji', subSector: 'Bilişim & Yazılım', marketCap: 35000000000, exchange: 'BIST' },
    { symbol: 'REEDR.IS', name: 'Reeder Teknoloji', trName: 'Reeder Teknoloji', sector: 'Savunma & Teknoloji', subSector: 'Tüketici Teknolojisi', marketCap: 28000000000, exchange: 'BIST' },
    
    // Sanayi & Metal & Madencilik
    { symbol: 'EREGL.IS', name: 'Ereğli Demir ve Çelik', trName: 'Erdemir', sector: 'Sanayi & Maden', subSector: 'Demir & Çelik Üretimi', marketCap: 195000000000, exchange: 'BIST' },
    { symbol: 'KRDMD.IS', name: 'Kardemir (D)', trName: 'Kardemir', sector: 'Sanayi & Maden', subSector: 'Demir & Çelik Üretimi', marketCap: 32000000000, exchange: 'BIST' },
    { symbol: 'KCAER.IS', name: 'Kocaer Çelik', trName: 'Kocaer Çelik', sector: 'Sanayi & Maden', subSector: 'Çelik Profil', marketCap: 21000000000, exchange: 'BIST' },
    { symbol: 'SISE.IS', name: 'Türkiye Şişe ve Cam Fabrikaları', trName: 'Şişecam', sector: 'Sanayi & Maden', subSector: 'Cam & Kimya', marketCap: 160000000000, exchange: 'BIST' },
    { symbol: 'KOZAL.IS', name: 'Koza Altın İşletmeleri', trName: 'Koza Altın', sector: 'Sanayi & Maden', subSector: 'Altın Madenciliği', marketCap: 65000000000, exchange: 'BIST' },
    { symbol: 'KOZAA.IS', name: 'Koza Anadolu Metal', trName: 'Koza Anadolu', sector: 'Sanayi & Maden', subSector: 'Maden & Metal', marketCap: 26000000000, exchange: 'BIST' },
    
    // Petrol & Kimya & Rafineri
    { symbol: 'TUPRS.IS', name: 'Tüpraş Türkiye Petrol Rafinerileri', trName: 'Tüpraş', sector: 'Enerji & Petrol', subSector: 'Petrol Rafinerisi', marketCap: 310000000000, exchange: 'BIST' },
    { symbol: 'PETKM.IS', name: 'Petkim Petrokimya Holding', trName: 'Petkim', sector: 'Enerji & Petrol', subSector: 'Petrokimya', marketCap: 52000000000, exchange: 'BIST' },
    { symbol: 'SASA.IS', name: 'SASA Polyester Sanayi', trName: 'SASA Polyester', sector: 'Kimya & Sanayi', subSector: 'Polyester & Kimya', marketCap: 140000000000, exchange: 'BIST' },
    { symbol: 'HEKTS.IS', name: 'Hektaş Ticaret', trName: 'Hektaş', sector: 'Kimya & Sanayi', subSector: 'Tarım İlaçları & Gübre', marketCap: 24000000000, exchange: 'BIST' },
    { symbol: 'GUBRF.IS', name: 'Gübre Fabrikaları', trName: 'Gübretaş', sector: 'Kimya & Sanayi', subSector: 'Gübre Üretimi', marketCap: 62000000000, exchange: 'BIST' },
    
    // Elektrik & Yenilenebilir Enerji
    { symbol: 'ASTOR.IS', name: 'Astor Enerji', trName: 'Astor Enerji', sector: 'Enerji & Elektrik', subSector: 'Transformatör & Dağıtım', marketCap: 110000000000, exchange: 'BIST' },
    { symbol: 'ENJSA.IS', name: 'Enerjisa Enerji', trName: 'Enerjisa', sector: 'Enerji & Elektrik', subSector: 'Elektrik Dağıtım & Perakende', marketCap: 75000000000, exchange: 'BIST' },
    { symbol: 'EUPWR.IS', name: 'Europower Enerji', trName: 'Europower Enerji', sector: 'Enerji & Elektrik', subSector: 'Elektrik Ekipmanları', marketCap: 29000000000, exchange: 'BIST' },
    { symbol: 'KONTR.IS', name: 'Kontrolmatik Teknoloji Enerji', trName: 'Kontrolmatik', sector: 'Enerji & Elektrik', subSector: 'Enerji Depolama & Otomasyon', marketCap: 45000000000, exchange: 'BIST' },
    { symbol: 'GESAN.IS', name: 'Girişim Elektrik Sanayi', trName: 'Girişim Elektrik', sector: 'Enerji & Elektrik', subSector: 'Elektrik Taahhüt', marketCap: 33000000000, exchange: 'BIST' },
    { symbol: 'CWENE.IS', name: 'CW Enerji Mühendislik', trName: 'CW Enerji', sector: 'Enerji & Elektrik', subSector: 'Güneş Paneli Üretimi', marketCap: 23000000000, exchange: 'BIST' },
    
    // Holdingler
    { symbol: 'KCHOL.IS', name: 'Koç Holding', trName: 'Koç Holding', sector: 'Holding & Yatırım', subSector: 'Çok Sektörlü Holding', marketCap: 520000000000, exchange: 'BIST' },
    { symbol: 'SAHOL.IS', name: 'Sabancı Holding', trName: 'Sabancı Holding', sector: 'Holding & Yatırım', subSector: 'Çok Sektörlü Holding', marketCap: 215000000000, exchange: 'BIST' },
    { symbol: 'ALARK.IS', name: 'Alarko Holding', trName: 'Alarko Holding', sector: 'Holding & Yatırım', subSector: 'Enerji & Turizm Holding', marketCap: 48000000000, exchange: 'BIST' },
    { symbol: 'ENKAI.IS', name: 'Enka İnşaat ve Sanayi', trName: 'Enka İnşaat', sector: 'Holding & Yatırım', subSector: 'İnşaat, Enerji & Gayrimenkul', marketCap: 285000000000, exchange: 'BIST' },
    { symbol: 'DOHOL.IS', name: 'Doğan Şirketler Grubu Holding', trName: 'Doğan Holding', sector: 'Holding & Yatırım', subSector: 'Yatırım Holdingi', marketCap: 42000000000, exchange: 'BIST' },
    { symbol: 'AGHOL.IS', name: 'AG Anadolu Grubu Holding', trName: 'Anadolu Grubu Holding', sector: 'Holding & Yatırım', subSector: 'İçecek & Perakende Holding', marketCap: 80000000000, exchange: 'BIST' },
    
    // Perakende & Tüketici & Gıda
    { symbol: 'BIMAS.IS', name: 'BİM Birleşik Mağazalar', trName: 'BİM Mağazaları', sector: 'Perakende & Tüketici', subSector: 'Gıda Perakendeciliği', marketCap: 320000000000, exchange: 'BIST' },
    { symbol: 'MGROS.IS', name: 'Migros Ticaret', trName: 'Migros', sector: 'Perakende & Tüketici', subSector: 'Süpermarket Perakende', marketCap: 95000000000, exchange: 'BIST' },
    { symbol: 'SOKM.IS', name: 'Şok Marketler Ticaret', trName: 'ŞOK Marketler', sector: 'Perakende & Tüketici', subSector: 'İndirim Marketçiliği', marketCap: 38000000000, exchange: 'BIST' },
    { symbol: 'TABGD.IS', name: 'TAB Gıda Sanayi ve Ticaret', trName: 'TAB Gıda', sector: 'Perakende & Tüketici', subSector: 'Hızlı Servis Restoran', marketCap: 42000000000, exchange: 'BIST' },
    { symbol: 'MAVI.IS', name: 'Mavi Giyim Sanayi', trName: 'Mavi Jeans', sector: 'Perakende & Tüketici', subSector: 'Hazır Giyim', marketCap: 26000000000, exchange: 'BIST' },
    { symbol: 'ARCLK.IS', name: 'Arçelik A.Ş.', trName: 'Arçelik', sector: 'Perakende & Tüketici', subSector: 'Dayanıklı Tüketim Malları', marketCap: 110000000000, exchange: 'BIST' },
    { symbol: 'VESTL.IS', name: 'Vestel Elektronik', trName: 'Vestel', sector: 'Perakende & Tüketici', subSector: 'Tüketici Elektroniği', marketCap: 32000000000, exchange: 'BIST' },
    
    // Otomotiv
    { symbol: 'FROTO.IS', name: 'Ford Otomotiv Sanayi', trName: 'Ford Otosan', sector: 'Otomotiv', subSector: 'Ticari & Binek Araç', marketCap: 380000000000, exchange: 'BIST' },
    { symbol: 'TOASO.IS', name: 'Tofaş Türk Otomobil Fabrikası', trName: 'Tofaş', sector: 'Otomotiv', subSector: 'Otomobil Üretimi', marketCap: 135000000000, exchange: 'BIST' },
    { symbol: 'DOAS.IS', name: 'Doğuş Otomotiv Servis ve Ticaret', trName: 'Doğuş Otomotiv', sector: 'Otomotiv', subSector: 'Otomotiv Distribütörlük', marketCap: 65000000000, exchange: 'BIST' },
    { symbol: 'BRISA.IS', name: 'Brisa Bridgestone Sabancı Lastik', trName: 'Brisa Lastik', sector: 'Otomotiv', subSector: 'Lastik Sanayi', marketCap: 28000000000, exchange: 'BIST' },
    
    // Telekomünikasyon
    { symbol: 'TCELL.IS', name: 'Turkcell İletişim Hizmetleri', trName: 'Turkcell', sector: 'Telekomünikasyon', subSector: 'Mobil & Veri İletişimi', marketCap: 220000000000, exchange: 'BIST' },
    { symbol: 'TTKOM.IS', name: 'Türk Telekomünikasyon', trName: 'Türk Telekom', sector: 'Telekomünikasyon', subSector: 'Sabit & Genişbant İletişim', marketCap: 175000000000, exchange: 'BIST' },
    
    // Gayrimenkul & Çimento
    { symbol: 'EKGYO.IS', name: 'Emlak Konut Gayrimenkul Yatırım', trName: 'Emlak Konut GYO', sector: 'Gayrimenkul & Yapı', subSector: 'Konut & Proje Geliştirme', marketCap: 52000000000, exchange: 'BIST' },
    { symbol: 'ISGYO.IS', name: 'İş Gayrimenkul Yatırım Ortaklığı', trName: 'İş GYO', sector: 'Gayrimenkul & Yapı', subSector: 'Ticari & Konut Gayrimenkul', marketCap: 24000000000, exchange: 'BIST' },
    { symbol: 'OYAKC.IS', name: 'OYAK Çimento Fabrikaları', trName: 'OYAK Çimento', sector: 'Gayrimenkul & Yapı', subSector: 'Çimento & Beton', marketCap: 64000000000, exchange: 'BIST' },
    { symbol: 'CIMSA.IS', name: 'Çimsa Çimento Sanayi', trName: 'Çimsa', sector: 'Gayrimenkul & Yapı', subSector: 'Beyaz Çimento & Yapı Malzemeleri', marketCap: 38000000000, exchange: 'BIST' }
  ],
  FUNDS: [
    ...GLOBAL_ETFS,
    ...generateFullTefasDatabase()
  ]
};

export const MARKET_INDICES = [
  { symbol: '^IXIC', name: 'NASDAQ Composite', shortName: 'NASDAQ', market: 'US' },
  { symbol: '^GSPC', name: 'S&P 500', shortName: 'S&P 500', market: 'US' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', shortName: 'Dow Jones', market: 'US' },
  { symbol: 'XU100.IS', name: 'Borsa İstanbul 100 Endeksi', shortName: 'BIST 100', market: 'TR' },
  { symbol: 'XU030.IS', name: 'Borsa İstanbul 30 Endeksi', shortName: 'BIST 30', market: 'TR' },
  { symbol: 'USDTRY=X', name: 'Amerikan Doları / Türk Lirası', shortName: 'USD / TRY', market: 'FX' },
  { symbol: 'EURTRY=X', name: 'Euro / Türk Lirası', shortName: 'EUR / TRY', market: 'FX' },
  { symbol: 'BTC-USD', name: 'Bitcoin / US Dollar', shortName: 'BTC / USD', market: 'CRYPTO' },
  { symbol: 'GC=F', name: 'Gold Futures', shortName: 'Altın (Ons)', market: 'COMMODITY' },
];

export const MACRO_ASSETS = [
  // 1. Döviz & Kurlar (Forex)
  {
    symbol: 'USDTRY=X',
    name: 'Amerikan Doları / Türk Lirası',
    shortName: 'USD / TRY',
    category: 'FOREX',
    unit: '₺',
    currency: 'TRY',
    basePrice: 38.65,
    isHero: true,
    descriptionTr: 'ABD Doları serbest piyasa ve TCMB efektif kuru.'
  },
  {
    symbol: 'EURTRY=X',
    name: 'Euro / Türk Lirası',
    shortName: 'EUR / TRY',
    category: 'FOREX',
    unit: '₺',
    currency: 'TRY',
    basePrice: 41.85,
    isHero: true,
    descriptionTr: 'Avrupa Para Birimi Euro / Türk Lirası çapraz kuru.'
  },
  {
    symbol: 'EURUSD=X',
    name: 'Euro / Amerikan Doları',
    shortName: 'EUR / USD',
    category: 'FOREX',
    unit: '$',
    currency: 'USD',
    basePrice: 1.0825,
    isHero: false,
    descriptionTr: 'Küresel finans piyasalarının en yüksek hacimli döviz paritesi.'
  },
  {
    symbol: 'GBPTRY=X',
    name: 'İngiliz Sterlini / Türk Lirası',
    shortName: 'GBP / TRY',
    category: 'FOREX',
    unit: '₺',
    currency: 'TRY',
    basePrice: 49.20,
    isHero: false,
    descriptionTr: 'İngiltere Merkez Bankası (BoE) para birimi çapraz kuru.'
  },
  {
    symbol: 'DX-Y.NYB',
    name: 'Dolar Endeksi (DXY)',
    shortName: 'DXY Endeksi',
    category: 'FOREX',
    unit: 'puan',
    currency: 'USD',
    basePrice: 104.20,
    isHero: false,
    descriptionTr: 'ABD Dolarının 6 majör küresel para birimi sepetine karşı gücü.'
  },

  // 2. Emtia & Değerli Madenler (Commodities)
  {
    symbol: 'GRAM_ALTIN',
    name: 'Gram Altın (TL)',
    shortName: 'Gram Altın',
    category: 'COMMODITY',
    unit: '₺',
    currency: 'TRY',
    basePrice: 3540.00,
    isHero: true,
    isDerived: true,
    descriptionTr: '24 Ayar Has Gram Altın spot serbest piyasa fiyatı.'
  },
  {
    symbol: 'GC=F',
    name: 'Ons Altın (Gold Futures)',
    shortName: 'Ons Altın',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 2855.00,
    isHero: true,
    descriptionTr: 'Uluslararası piyasalarda 1 Troy Ons (31.1035 gr) altın fiyatı.'
  },
  {
    symbol: 'GRAM_GUMUS',
    name: 'Gram Gümüş (TL)',
    shortName: 'Gram Gümüş',
    category: 'COMMODITY',
    unit: '₺',
    currency: 'TRY',
    basePrice: 39.80,
    isHero: false,
    isDerived: true,
    descriptionTr: 'Serbest piyasa fiziki gram gümüş Türk Lirası fiyatı.'
  },
  {
    symbol: 'SI=F',
    name: 'Ons Gümüş (Silver Futures)',
    shortName: 'Ons Gümüş',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 32.10,
    isHero: false,
    descriptionTr: 'Global vadeli emtia piyasalarında 1 Ons gümüş fiyatı.'
  },
  {
    symbol: 'BZ=F',
    name: 'Brent Ham Petrol',
    shortName: 'Brent Petrol',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 74.20,
    isHero: true,
    descriptionTr: 'Kuzey Denizi kaynaklı küresel referans ham petrol varil fiyatı.'
  },
  {
    symbol: 'CL=F',
    name: 'WTI Ham Petrol (Crude Oil)',
    shortName: 'WTI Petrol',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 70.80,
    isHero: false,
    descriptionTr: 'Batı Teksas tipi ABD referans ham petrol varil fiyatı.'
  },
  {
    symbol: 'NG=F',
    name: 'Doğalgaz (Natural Gas)',
    shortName: 'Doğalgaz',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 2.85,
    isHero: false,
    descriptionTr: 'Henry Hub vadeli doğalgaz birim kontrat fiyatı.'
  },
  {
    symbol: 'HG=F',
    name: 'Bakır (Copper Futures)',
    shortName: 'Bakır',
    category: 'COMMODITY',
    unit: '$',
    currency: 'USD',
    basePrice: 4.35,
    isHero: false,
    descriptionTr: 'Küresel sanayi ve elektrik üretiminin öncü emtia göstergesi.'
  },

  // 3. Kripto Varlıklar (Crypto)
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin (BTC)',
    shortName: 'Bitcoin',
    category: 'CRYPTO',
    unit: '$',
    currency: 'USD',
    basePrice: 94800.00,
    isHero: true,
    descriptionTr: 'Dünyanın en büyük piyasa değerine sahip merkeziyetsiz dijital varlığı.'
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum (ETH)',
    shortName: 'Ethereum',
    category: 'CRYPTO',
    unit: '$',
    currency: 'USD',
    basePrice: 2840.00,
    isHero: false,
    descriptionTr: 'Akıllı sözleşme ve DeFi ekosisteminin lider blokzincir varlığı.'
  },
  {
    symbol: 'SOL-USD',
    name: 'Solana (SOL)',
    shortName: 'Solana',
    category: 'CRYPTO',
    unit: '$',
    currency: 'USD',
    basePrice: 198.50,
    isHero: false,
    descriptionTr: 'Yüksek işlem hızı ve düşük transfer maliyetli akıllı sözleşme ağı.'
  },
  {
    symbol: 'XRP-USD',
    name: 'XRP (Ripple)',
    shortName: 'XRP',
    category: 'CRYPTO',
    unit: '$',
    currency: 'USD',
    basePrice: 2.38,
    isHero: false,
    descriptionTr: 'Bankalararası sınır ötesi ödemeler için geliştirilen ödeme ağı.'
  },
  {
    symbol: 'BNB-USD',
    name: 'BNB (Build and Build)',
    shortName: 'BNB',
    category: 'CRYPTO',
    unit: '$',
    currency: 'USD',
    basePrice: 658.00,
    isHero: false,
    descriptionTr: 'BNB Chain ekosistemi ve borsasının ana kripto varlığı.'
  },

  // 4. Tahvil & Makro Göstergeler (Bonds & Yields)
  {
    symbol: '^TNX',
    name: 'ABD 10 Yıllık Hazine Tahvil Faizi',
    shortName: 'ABD 10Y Tahvil',
    category: 'BONDS',
    unit: '%',
    currency: 'USD',
    basePrice: 4.32,
    isHero: false,
    descriptionTr: 'Küresel borçlanma maliyetleri ve faiz beklentilerinin ana kıstası.'
  },
  {
    symbol: '^VIX',
    name: 'CBOE Volatilite Endeksi (VIX)',
    shortName: 'VIX Korku Endeksi',
    category: 'BONDS',
    unit: 'puan',
    currency: 'USD',
    basePrice: 15.60,
    isHero: false,
    descriptionTr: 'S&P 500 opsiyonlarından türetilen 30 günlük piyasa risk ve korku beklentisi.'
  },
  {
    symbol: '^IRX',
    name: 'ABD 13 Haftalık Hazine Bonosu Faizi',
    shortName: 'ABD 3M Bono Faizi',
    category: 'BONDS',
    unit: '%',
    currency: 'USD',
    basePrice: 4.85,
    isHero: false,
    descriptionTr: 'FED kısa vadeli politika faizine en duyarlı para piyasası göstergesi.'
  }
];

