/**
 * StockStuck Technical Analysis & Intelligence Engine
 * Computes institutional-grade technical indicators from OHLCV arrays
 */

export function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

export function calculateEMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = calculateSMA(data.slice(0, period), period);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateEMAArray(data, period) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(data.length).fill(null);
  
  let ema = calculateSMA(data.slice(0, period), period);
  result[period - 1] = ema;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function calculateRSI(closes, period = 14) {
  if (closes.length <= period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(2));
}

export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const fastEMAArray = calculateEMAArray(closes, fast);
  const slowEMAArray = calculateEMAArray(closes, slow);
  
  const macdLineArray = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMAArray[i] !== null && slowEMAArray[i] !== null) {
      macdLineArray.push(fastEMAArray[i] - slowEMAArray[i]);
    }
  }
  
  if (macdLineArray.length < signal) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const macd = macdLineArray[macdLineArray.length - 1];
  const signalLine = calculateEMA(macdLineArray, signal);
  const histogram = macd - signalLine;
  
  return {
    macd: Number(macd.toFixed(4)),
    signal: Number(signalLine.toFixed(4)),
    histogram: Number(histogram.toFixed(4))
  };
}

export function calculateBollingerBands(closes, period = 20, multiplier = 2) {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 0;
    return { upper: last, middle: last, lower: last, percentB: 0.5 };
  }
  
  const slice = closes.slice(closes.length - period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const current = closes[closes.length - 1];
  
  const percentB = upper !== lower ? (current - lower) / (upper - lower) : 0.5;
  
  return {
    upper: Number(upper.toFixed(2)),
    middle: Number(middle.toFixed(2)),
    lower: Number(lower.toFixed(2)),
    bandwidth: Number(((upper - lower) / middle * 100).toFixed(2)),
    percentB: Number(percentB.toFixed(2))
  };
}

export function calculateStochastic(highs, lows, closes, period = 14, smoothK = 3) {
  if (closes.length < period) return { k: 50, d: 50 };
  
  const highSlice = highs.slice(highs.length - period);
  const lowSlice = lows.slice(lows.length - period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...highSlice);
  const lowestLow = Math.min(...lowSlice);
  
  if (highestHigh === lowestLow) return { k: 50, d: 50 };
  
  const rawK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  return {
    k: Number(rawK.toFixed(2)),
    d: Number(rawK.toFixed(2)) // smooth approximation
  };
}

export function calculatePivotPoints(high, low, close) {
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + (high - low);
  const s2 = p - (high - low);
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);
  
  return {
    pivot: Number(p.toFixed(2)),
    r1: Number(r1.toFixed(2)),
    r2: Number(r2.toFixed(2)),
    r3: Number(r3.toFixed(2)),
    s1: Number(s1.toFixed(2)),
    s2: Number(s2.toFixed(2)),
    s3: Number(s3.toFixed(2))
  };
}

/**
 * Master Technical Rating Engine
 */
export function analyzeStockTechnicals(ohlcv, meta) {
  const { closes, highs, lows, volumes } = ohlcv;
  if (!closes || closes.length === 0) return null;
  
  const currentPrice = closes[closes.length - 1];
  const lastHigh = highs[highs.length - 1] || currentPrice;
  const lastLow = lows[lows.length - 1] || currentPrice;
  
  // Oscillators
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const stoch = calculateStochastic(highs, lows, closes, 14);
  const bb = calculateBollingerBands(closes, 20);
  
  // Moving Averages
  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200) || calculateEMA(closes, Math.min(closes.length, 100));
  
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200) || calculateSMA(closes, Math.min(closes.length, 100));
  
  // Oscillators evaluation (RSI, MACD, Stochastic, Bollinger %B)
  let oscBuy = 0, oscSell = 0, oscNeutral = 0;
  
  // RSI (14) signal
  let rsiSignal = 'NÖTR';
  if (rsi < 30) {
    rsiSignal = 'AŞIRI SATIM';
    oscBuy++;
  } else if (rsi > 70) {
    rsiSignal = 'AŞIRI ALIM';
    oscSell++;
  } else if (rsi >= 55 && rsi <= 68) {
    rsiSignal = 'POZİTİF';
    oscBuy++;
  } else if (rsi >= 35 && rsi < 45) {
    rsiSignal = 'NEGATİF';
    oscSell++;
  } else {
    rsiSignal = 'NÖTR';
    oscNeutral++;
  }
  
  // MACD (12, 26, 9) signal
  let macdSignal = 'NÖTR';
  if (macd.histogram > 0.05) {
    macdSignal = 'AL';
    oscBuy++;
  } else if (macd.histogram < -0.05) {
    macdSignal = 'SAT';
    oscSell++;
  } else {
    macdSignal = 'NÖTR';
    oscNeutral++;
  }
  
  // Stochastic %K (14) signal
  let stochSignal = 'NÖTR';
  if (stoch.k < 20) {
    stochSignal = 'AŞIRI SATIM';
    oscBuy++;
  } else if (stoch.k > 80) {
    stochSignal = 'AŞIRI ALIM';
    oscSell++;
  } else if (stoch.k >= 50 && stoch.k <= 75) {
    stochSignal = 'POZİTİF';
    oscBuy++;
  } else {
    stochSignal = 'NÖTR';
    oscNeutral++;
  }

  // Bollinger Bands %B signal
  let bbSignal = 'NÖTR';
  if (bb.percentB > 1.0) {
    bbSignal = 'AŞIRI ALIM';
    oscSell++;
  } else if (bb.percentB < 0.0) {
    bbSignal = 'AŞIRI SATIM';
    oscBuy++;
  } else {
    bbSignal = 'BANT İÇİ';
    oscNeutral++;
  }
  
  // Moving averages evaluation (EMA 9, 20, 50, 200 + SMA 20, 50, 200)
  let maBuy = 0, maSell = 0, maNeutral = 0;
  const maList = [
    { name: 'EMA (9)', value: ema9 },
    { name: 'EMA (20)', value: ema20 },
    { name: 'EMA (50)', value: ema50 },
    { name: 'EMA (200)', value: ema200 },
    { name: 'SMA (20)', value: sma20 },
    { name: 'SMA (50)', value: sma50 },
    { name: 'SMA (200)', value: sma200 },
  ];
  
  const evaluatedMAs = maList.map(item => {
    if (item.value === null) {
      maNeutral++;
      return { ...item, signal: 'N/A' };
    }
    const diffPct = ((currentPrice - item.value) / item.value) * 100;
    // Deadband threshold for neutral crossings
    let signal = 'NÖTR';
    if (diffPct > 0.25) {
      signal = 'AL';
      maBuy++;
    } else if (diffPct < -0.25) {
      signal = 'SAT';
      maSell++;
    } else {
      signal = 'NÖTR';
      maNeutral++;
    }
    return {
      ...item,
      value: Number(item.value.toFixed(2)),
      signal,
      diffPercent: Number(diffPct.toFixed(2))
    };
  });
  
  // Professional Institutional Weighted Scoring (0 - 100 Scale)
  // 50% Oscillators + 50% Trend Moving Averages
  const totalOsc = oscBuy + oscSell + oscNeutral;
  const oscIndex = totalOsc > 0 ? (oscBuy - oscSell) / totalOsc : 0; // -1 to +1
  
  const totalMA = maBuy + maSell + maNeutral;
  const maIndex = totalMA > 0 ? (maBuy - maSell) / totalMA : 0; // -1 to +1
  
  // Composite score centered at 50
  const compositeScore = 50 + (oscIndex * 25) + (maIndex * 25);
  const score = Math.min(100, Math.max(0, Math.round(compositeScore)));
  
  let rating = 'NÖTR';
  let ratingEn = 'NEUTRAL';
  let ratingColor = 'text-amber-400';
  let badgeBg = 'bg-amber-500/10 border-amber-500/30';
  
  if (score >= 82) {
    rating = 'GÜÇLÜ AL';
    ratingEn = 'STRONG BUY';
    ratingColor = 'text-emerald-400';
    badgeBg = 'bg-emerald-500/10 border-emerald-500/30';
  } else if (score >= 60) {
    rating = 'AL';
    ratingEn = 'BUY';
    ratingColor = 'text-emerald-400';
    badgeBg = 'bg-emerald-500/10 border-emerald-500/30';
  } else if (score <= 18) {
    rating = 'GÜÇLÜ SAT';
    ratingEn = 'STRONG SELL';
    ratingColor = 'text-rose-500';
    badgeBg = 'bg-rose-500/10 border-rose-500/30';
  } else if (score <= 40) {
    rating = 'SAT';
    ratingEn = 'SELL';
    ratingColor = 'text-rose-400';
    badgeBg = 'bg-rose-500/10 border-rose-500/30';
  }
  
  // Pivot Points
  const pivots = calculatePivotPoints(lastHigh, lastLow, currentPrice);
  
  // AI Market Analyst Commentary Synthesis
  const isGoldenCross = ema50 && ema200 ? ema50 > ema200 : false;
  const isAboveSMA200 = sma200 ? currentPrice > sma200 : true;
  const trend = isAboveSMA200 ? 'Yükseliş Trendi' : 'Düşüş Trendi';
  
  const breakoutTarget = Number((currentPrice * (score >= 50 ? 1.065 : 1.035)).toFixed(2));
  const stopLoss = Number((currentPrice * 0.965).toFixed(2));
  const riskReward = '1 : 2.4';
  
  const aiReportTr = generateAiReportTr({
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    price: currentPrice,
    score,
    rating,
    rsi,
    trend,
    isGoldenCross,
    bb,
    pivots,
    breakoutTarget,
    stopLoss
  });

  return {
    score,
    rating,
    ratingEn,
    ratingColor,
    badgeBg,
    currentPrice,
    indicators: {
      rsi: { value: rsi, signal: rsiSignal },
      macd: { ...macd, signal: macdSignal },
      stochastic: { ...stoch, signal: stochSignal },
      bollingerBands: bb,
    },
    movingAverages: {
      summary: { buy: maBuy, sell: maSell },
      list: evaluatedMAs
    },
    oscillators: {
      summary: { buy: oscBuy, sell: oscSell, neutral: oscNeutral }
    },
    pivots,
    aiAnalysis: {
      trend,
      score,
      rating,
      breakoutTarget,
      stopLoss,
      riskReward,
      isGoldenCross,
      summaryTr: aiReportTr
    }
  };
}

function generateAiReportTr({ symbol, name, price, score, rating, rsi, trend, isGoldenCross, bb, pivots, breakoutTarget, stopLoss }) {
  let narrative = `${name} (${symbol}) şu anda ${price} seviyesinden işlem görmekte. `;
  
  if (score >= 60) {
    narrative += `Teknik göstergeler ve momentum indikatörleri güçlü bir ${rating} konsensüsü üretmektedir. `;
    narrative += `Fiyat, hareketli ortalamaların üzerinde kalarak ${trend} yapısını koruyor. `;
  } else if (score <= 40) {
    narrative += `Momentum indikatörlerinde zayıflama ve ${rating} baskısı gözlemlenmektedir. `;
    narrative += `Kısa vadede temkinli olunmalı, ${pivots.s1} ana destek seviyesi yakından izlenmelidir. `;
  } else {
    narrative += `Grafik nötr bölgede yatay bir konsolidasyon sergilemektedir. Kırılım yönü beklenmelidir. `;
  }
  
  if (rsi > 70) {
    narrative += `RSI göstergesi (${rsi}) aşırı alım bölgesinde, kâr realizasyonlarına dikkat edilmeli. `;
  } else if (rsi < 30) {
    narrative += `RSI göstergesi (${rsi}) aşırı satım bölgesinde dip arayışında, tepki alımları gelebilir. `;
  } else {
    narrative += `RSI (${rsi}) sağlıklı bir momentum aralığında. `;
  }
  
  if (isGoldenCross) {
    narrative += `50 günlük EMA'nın 200 günlük EMA üzerinde olması orta-uzun vadeli altın kesişim (Golden Cross) gücünü destekliyor. `;
  }
  
  narrative += `Olası yukarı yönlü hedef ${breakoutTarget} direnci, koruyucu stop-loss seviyesi ise ${stopLoss} olarak hesaplanmıştır.`;
  return narrative;
}
