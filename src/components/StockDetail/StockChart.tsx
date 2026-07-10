import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api';
import { Candle } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import {
  LineChart as LineChartIcon,
  CandlestickChart,
  Activity,
  Maximize2,
  Minimize2,
  X,
  TrendingUp,
  TrendingDown,
  MoveHorizontal,
  RotateCcw,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface TimeframePerformance {
  timeframe: Timeframe;
  price: number;
  change: number;
  changePercent: number;
  label: string;
  isHovered: boolean;
}

interface StockChartProps {
  symbol: string;
  currency: string;
  onPerformanceChange?: (perf: TimeframePerformance) => void;
}

export type Timeframe = '1D' | '1W' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

export interface RangeMeasurement {
  startIdx: number;
  endIdx: number;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  diffPrice: number;
  diffPercent: number;
  barCount: number;
  dayCount: number;
  high: number;
  low: number;
  totalVolume: number;
  isPositive: boolean;
}

export const StockChart: React.FC<StockChartProps> = ({ symbol, currency, onPerformanceChange }) => {
  const { language, chartType, setChartType, indicators, toggleIndicator } = useApp();
  const { showSMA20, showSMA50, showSMA200, showBollinger, showVolume, showRSI } = indicators;
  
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const cleanSym = symbol.replace('.IS', '').toUpperCase().trim();
  const isFund = cleanSym.length === 3 && /^[A-Z0-9]{3}$/.test(cleanSym) && !['USD', 'EUR', 'GBP', 'TRY'].includes(cleanSym);

  const formatPriceVal = (val: number | undefined | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '-';
    if (isFund) return val.toFixed(6);
    if (val < 10) return val.toFixed(4);
    return val.toFixed(2);
  };

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [fullHoverIndex, setFullHoverIndex] = useState<number | null>(null);

  // Range Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStartIdx, setMeasureStartIdx] = useState<number | null>(null);
  const [measureEndIdx, setMeasureEndIdx] = useState<number | null>(null);
  const [isDraggingMeasure, setIsDraggingMeasure] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fullscreen Zoom & Pan State
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState<number | null>(null);
  const [panInitialRange, setPanInitialRange] = useState<{ start: number; end: number } | null>(null);

  // Reset measurement and zoom when timeframe or symbol changes
  useEffect(() => {
    setMeasureStartIdx(null);
    setMeasureEndIdx(null);
    setIsDraggingMeasure(false);
    setZoomRange(null);
    setIsPanning(false);
  }, [symbol, timeframe]);

  // ESC key to reset zoom, reset measurement, or close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (measureStartIdx !== null || isMeasuring) {
          setMeasureStartIdx(null);
          setMeasureEndIdx(null);
          setIsMeasuring(false);
        } else if (zoomRange !== null) {
          setZoomRange(null);
          setIsPanning(false);
        } else if (isFullScreen) {
          setIsFullScreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, measureStartIdx, isMeasuring, zoomRange]);

  // Fullscreen body scroll lock and chart zoom via mouse wheel
  useEffect(() => {
    if (!isFullScreen) return;

    // Lock background page scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleWheelEvent = (e: WheelEvent) => {
      // Prevent background webpage from scrolling up/down
      e.preventDefault();
      e.stopPropagation();

      if (!candles || candles.length < 6) return;

      const total = candles.length;
      const currentStart = zoomRange ? zoomRange.start : 0;
      const currentEnd = zoomRange ? zoomRange.end : total - 1;
      const currentCount = currentEnd - currentStart + 1;

      // Mouse anchor fraction across canvas width
      let anchorPct = 0.7;
      const canvas = fullCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const paddingLeft = 15;
        const paddingRight = 70;
        const chartWidth = rect.width - paddingLeft - paddingRight;
        const mouseX = e.clientX - rect.left - paddingLeft;
        if (chartWidth > 0) {
          anchorPct = Math.max(0, Math.min(1, mouseX / chartWidth));
        }
      }

      const zoomIn = e.deltaY < 0;
      const step = Math.max(2, Math.round(currentCount * 0.15));

      let newCount = zoomIn ? currentCount - step : currentCount + step;
      const minBars = 8;
      const maxBars = total;

      newCount = Math.max(minBars, Math.min(maxBars, newCount));

      if (newCount >= total) {
        setZoomRange(null);
        return;
      }

      const diff = currentCount - newCount;
      const leftShift = Math.round(diff * anchorPct);
      const rightShift = diff - leftShift;

      let newStart = currentStart + leftShift;
      let newEnd = currentEnd - rightShift;

      if (newStart < 0) {
        newEnd = Math.min(total - 1, newEnd - newStart);
        newStart = 0;
      }
      if (newEnd >= total) {
        newStart = Math.max(0, newStart - (newEnd - (total - 1)));
        newEnd = total - 1;
      }

      if (newEnd - newStart + 1 < minBars) return;

      setZoomRange({ start: newStart, end: newEnd });
    };

    window.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('wheel', handleWheelEvent);
    };
  }, [isFullScreen, candles, zoomRange]);

  // Global mouse up for chart panning release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        setPanStartX(null);
        setPanInitialRange(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning]);

  const [chartMeta, setChartMeta] = useState<any>(null);

  const fetchChart = async (sym: string, tf: Timeframe) => {
    setLoading(true);
    let range = '1mo';
    let interval = '1d';

    if (tf === '1D') { range = '1d'; interval = '5m'; }
    else if (tf === '1W' || tf === '5D') { range = '5d'; interval = '15m'; }
    else if (tf === '1M') { range = '1mo'; interval = '1d'; }
    else if (tf === '3M') { range = '3mo'; interval = '1d'; }
    else if (tf === '6M') { range = '6mo'; interval = '1d'; }
    else if (tf === 'YTD') { range = 'ytd'; interval = '1d'; }
    else if (tf === '1Y') { range = '1y'; interval = '1d'; }
    else if (tf === '5Y') { range = '5y'; interval = '1wk'; }
    else if (tf === 'ALL') { range = 'max'; interval = '1mo'; }

    try {
      const res = await api.getChartData(sym, range, interval);
      if (res && res.candles && res.candles.length > 0) {
        setCandles(res.candles);
        setChartMeta(res.meta || null);
      }
    } catch (err) {
      console.warn('Failed to load chart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart(symbol, timeframe);
    const interval = setInterval(() => fetchChart(symbol, timeframe), 30000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Compute and broadcast active timeframe performance & hover states
  useEffect(() => {
    if (!onPerformanceChange || candles.length === 0) return;

    let startPrice = candles[0].open || candles[0].close;
    const isHovered = hoverIndex !== null && !!candles[hoverIndex];

    // For 1D timeframe in default non-hovered state, align with official market previous close
    if (timeframe === '1D' && !isHovered && chartMeta) {
      const prevClose = chartMeta.chartPreviousClose || chartMeta.previousClose;
      if (prevClose && prevClose > 0) {
        startPrice = prevClose;
      }
    }

    const activeCandle = isHovered ? candles[hoverIndex!] : candles[candles.length - 1];
    const activePrice = activeCandle.close;

    let change = activePrice - startPrice;
    let changePercent = startPrice > 0 ? Number(((change / startPrice) * 100).toFixed(2)) : 0;
    let label = '';

    if (isHovered) {
      const dateObj = new Date(activeCandle.time * 1000);
      label = timeframe === '1D' 
        ? dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
      if (timeframe === '1D') label = language === 'tr' ? 'Bugün' : 'Today';
      else if (timeframe === '1W' || timeframe === '5D') label = language === 'tr' ? 'Son 1 Hafta' : 'Past 1W';
      else if (timeframe === '1M') label = language === 'tr' ? 'Son 1 Ay' : 'Past 1M';
      else if (timeframe === '3M') label = language === 'tr' ? 'Son 3 Ay' : 'Past 3M';
      else if (timeframe === '6M') label = language === 'tr' ? 'Son 6 Ay' : 'Past 6M';
      else if (timeframe === 'YTD') label = language === 'tr' ? 'Yılbaşından Bugüne (YTD)' : 'Year to Date (YTD)';
      else if (timeframe === '1Y') label = language === 'tr' ? 'Son 1 Yıl' : 'Past 1Y';
      else if (timeframe === '5Y') label = language === 'tr' ? 'Son 5 Yıl' : 'Past 5Y';
      else label = language === 'tr' ? 'Tüm Zamanlar' : 'All Time';
    }

    onPerformanceChange({
      timeframe,
      price: activePrice,
      change,
      changePercent,
      label,
      isHovered
    });
  }, [candles, timeframe, hoverIndex, chartMeta]);

  // Computed Indicators
  const closes = useMemo(() => candles.map(c => c.close), [candles]);

  const sma20 = useMemo(() => {
    const period = 20;
    return closes.map((_, idx, arr) => {
      if (idx < period - 1) return null;
      const slice = arr.slice(idx - period + 1, idx + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  }, [closes]);

  const sma50 = useMemo(() => {
    const period = 50;
    return closes.map((_, idx, arr) => {
      if (idx < period - 1) return null;
      const slice = arr.slice(idx - period + 1, idx + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  }, [closes]);

  const sma200 = useMemo(() => {
    const period = 200;
    return closes.map((_, idx, arr) => {
      if (idx < period - 1) return null;
      const slice = arr.slice(idx - period + 1, idx + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  }, [closes]);

  const bollingerBands = useMemo(() => {
    const period = 20;
    return closes.map((_, idx, arr) => {
      if (idx < period - 1) return null;
      const slice = arr.slice(idx - period + 1, idx + 1);
      const middle = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      return {
        upper: middle + 2 * stdDev,
        middle,
        lower: middle - 2 * stdDev
      };
    });
  }, [closes]);

  const rsiSeries = useMemo(() => {
    const period = 14;
    const result: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length <= period) return result;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    return result;
  }, [closes]);

  // Master Chart Rendering Helper
  const drawChartOnCanvas = (
    canvas: HTMLCanvasElement,
    activeHoverIdx: number | null,
    opts: {
      enableSMA20: boolean;
      enableSMA50: boolean;
      enableSMA200: boolean;
      enableBollinger: boolean;
      enableVolume: boolean;
      enableRSI: boolean;
      zoomRange?: { start: number; end: number } | null;
    }
  ) => {
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const padding = { top: 25, right: 70, bottom: 25, left: 15 };
    const rsiHeight = opts.enableRSI ? 85 : 0;
    const volumeHeight = opts.enableVolume ? 55 : 0;
    const subPanesHeight = rsiHeight + volumeHeight;
    const mainChartHeight = height - padding.top - padding.bottom - subPanesHeight;

    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, width, height);

    const startIdx = opts.zoomRange ? opts.zoomRange.start : 0;
    const endIdx = opts.zoomRange ? opts.zoomRange.end : candles.length - 1;
    const visibleCount = endIdx - startIdx + 1;
    const visibleCandles = candles.slice(startIdx, endIdx + 1);

    let minPrice = Math.min(...visibleCandles.map(c => c.low));
    let maxPrice = Math.max(...visibleCandles.map(c => c.high));
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.04;
    maxPrice += priceRange * 0.04;

    const getY = (val: number) => {
      return padding.top + (1 - (val - minPrice) / (maxPrice - minPrice)) * mainChartHeight;
    };

    const barWidth = Math.max(2, (width - padding.left - padding.right) / visibleCount);
    const getX = (idx: number) => padding.left + (idx - startIdx) * barWidth + barWidth / 2;

    // Price Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const priceVal = minPrice + (i / gridSteps) * (maxPrice - minPrice);
      const y = getY(priceVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal.toFixed(isFund ? 6 : (minPrice < 10 ? 4 : 2)), width - padding.right + 8, y + 4);
    }

    // Bollinger Bands
    if (opts.enableBollinger) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1.2;
      for (let i = startIdx; i <= endIdx; i++) {
        if (bollingerBands[i]) {
          const x = getX(i);
          const y = getY(bollingerBands[i]!.upper);
          if (i === startIdx || !bollingerBands[i - 1]) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = startIdx; i <= endIdx; i++) {
        if (bollingerBands[i]) {
          const x = getX(i);
          const y = getY(bollingerBands[i]!.lower);
          if (i === startIdx || !bollingerBands[i - 1]) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Moving Averages
    const drawMALine = (series: (number | null)[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      let started = false;
      for (let i = startIdx; i <= endIdx; i++) {
        if (series[i] !== null) {
          const x = getX(i);
          const y = getY(series[i]!);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (opts.enableSMA20) drawMALine(sma20, '#38bdf8');
    if (opts.enableSMA50) drawMALine(sma50, '#f59e0b');
    if (opts.enableSMA200) drawMALine(sma200, '#a855f7');

    // Candles / Area / Line
    if (chartType === 'candlestick') {
      for (let idx = startIdx; idx <= endIdx; idx++) {
        const c = candles[idx];
        const isUp = c.close >= c.open;
        const color = isUp ? '#10b981' : '#f43f5e';
        const x = getX(idx);
        const yOpen = getY(c.open);
        const yClose = getY(c.close);
        const yHigh = getY(c.high);
        const yLow = getY(c.low);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        ctx.fillStyle = color;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
        const candleWidth = Math.max(2, barWidth * 0.72);
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }
    } else if (chartType === 'area') {
      ctx.beginPath();
      const firstX = getX(startIdx);
      const firstY = getY(candles[startIdx].close);
      ctx.moveTo(firstX, firstY);

      for (let i = startIdx + 1; i <= endIdx; i++) {
        ctx.lineTo(getX(i), getY(candles[i].close));
      }

      const lastX = getX(endIdx);
      const bottomY = padding.top + mainChartHeight;
      ctx.lineTo(lastX, bottomY);
      ctx.lineTo(firstX, bottomY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, bottomY);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      for (let i = startIdx + 1; i <= endIdx; i++) {
        ctx.lineTo(getX(i), getY(candles[i].close));
      }
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    } else if (chartType === 'line') {
      ctx.beginPath();
      ctx.moveTo(getX(startIdx), getY(candles[startIdx].close));
      for (let i = startIdx + 1; i <= endIdx; i++) {
        ctx.lineTo(getX(i), getY(candles[i].close));
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Volume Subgraph
    if (opts.enableVolume) {
      const volTop = padding.top + mainChartHeight + 10;
      const volDrawHeight = volumeHeight - 15;
      const maxVolume = Math.max(...visibleCandles.map(c => c.volume || 0)) || 1;

      for (let idx = startIdx; idx <= endIdx; idx++) {
        const c = candles[idx];
        const isUp = c.close >= c.open;
        const color = isUp ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';
        const x = getX(idx);
        const barH = ((c.volume || 0) / maxVolume) * volDrawHeight;
        const y = volTop + volDrawHeight - barH;
        const candleWidth = Math.max(2, barWidth * 0.72);

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, barH);
      }
    }

    // RSI Subgraph
    if (opts.enableRSI) {
      const rsiTop = padding.top + mainChartHeight + (opts.enableVolume ? volumeHeight : 0) + 12;
      const rsiDrawHeight = rsiHeight - 20;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(padding.left, rsiTop - 5);
      ctx.lineTo(width - padding.right, rsiTop - 5);
      ctx.stroke();

      const y70 = rsiTop + (1 - 70 / 100) * rsiDrawHeight;
      const y30 = rsiTop + (1 - 30 / 100) * rsiDrawHeight;

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.beginPath();
      ctx.moveTo(padding.left, y70);
      ctx.lineTo(width - padding.right, y70);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.moveTo(padding.left, y30);
      ctx.lineTo(width - padding.right, y30);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('70', width - padding.right + 6, y70 + 4);
      ctx.fillText('30', width - padding.right + 6, y30 + 4);

      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      let started = false;
      for (let i = startIdx; i <= endIdx; i++) {
        if (rsiSeries[i] !== null) {
          const x = getX(i);
          const y = rsiTop + (1 - rsiSeries[i]! / 100) * rsiDrawHeight;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('RSI (14)', padding.left, rsiTop + 10);
    }

    // 6. Draw Measurement Range Overlay
    if (measureStartIdx !== null && candles[measureStartIdx]) {
      const activeEnd = measureEndIdx !== null ? measureEndIdx : activeHoverIdx;
      if (activeEnd !== null && candles[activeEnd]) {
        const minI = Math.min(measureStartIdx, activeEnd);
        const maxI = Math.max(measureStartIdx, activeEnd);

        // Only draw if within visible range bounds
        if (maxI >= startIdx && minI <= endIdx) {
          const renderMinI = Math.max(startIdx, minI);
          const renderMaxI = Math.min(endIdx, maxI);
          const x1 = getX(renderMinI);
          const x2 = getX(renderMaxI);
          const cStart = candles[minI]; // Strictly chronological start
          const cEnd = candles[maxI];   // Strictly chronological end
          const isUp = cEnd.close >= cStart.close;
          const color = isUp ? '#10b981' : '#f43f5e';
          const bgRgba = isUp ? 'rgba(16, 185, 129, ' : 'rgba(244, 63, 94, ';

          // Shaded range background overlay
          ctx.fillStyle = `${bgRgba}0.14)`;
          ctx.fillRect(x1 - barWidth / 2, padding.top, (x2 - x1) + barWidth, mainChartHeight);

          // Vertical boundary dashed guidelines
          ctx.strokeStyle = `${bgRgba}0.7)`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(x1 - barWidth / 2, padding.top);
          ctx.lineTo(x1 - barWidth / 2, padding.top + mainChartHeight);
          ctx.moveTo(x2 + barWidth / 2, padding.top);
          ctx.lineTo(x2 + barWidth / 2, padding.top + mainChartHeight);
          ctx.stroke();

          // Slope trajectory vector line (Always moves forward in time from left x1 to right x2)
          const yStart = getY(cStart.close);
          const yEnd = getY(cEnd.close);
          const xStartPoint = x1;
          const xEndPoint = x2;

          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.moveTo(xStartPoint, yStart);
          ctx.lineTo(xEndPoint, yEnd);
          ctx.stroke();

          // Start Point Marker (Circle)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(xStartPoint, yStart, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // End Point Marker (Circle)
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(xEndPoint, yEnd, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Floating On-Canvas Measurement Pill
          const diffP = cEnd.close - cStart.close;
          const diffPct = cStart.close > 0 ? (diffP / cStart.close) * 100 : 0;
          const isMicro = cStart.close < 10;
          const diffDecimals = isFund ? 6 : (isMicro ? 4 : 2);
          const pillText = `${isUp ? '+' : ''}${diffP.toFixed(diffDecimals)} (${isUp ? '+' : ''}${diffPct.toFixed(2)}%)`;
          
          ctx.font = 'bold 12px JetBrains Mono, monospace';
          const pillTextWidth = ctx.measureText(pillText).width;
          const pillPad = 10;
          const pillW = pillTextWidth + pillPad * 2;
          const pillH = 24;
          const midX = Math.max(padding.left + pillW / 2, Math.min(width - padding.right - pillW / 2, (xStartPoint + xEndPoint) / 2));
          const midY = Math.max(padding.top + pillH / 2, Math.min(padding.top + mainChartHeight - pillH / 2, (yStart + yEnd) / 2 - 18));

          ctx.fillStyle = isUp ? 'rgba(6, 78, 59, 0.95)' : 'rgba(136, 19, 55, 0.95)';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pillText, midX, midY);
        }
      }
    }

    // Crosshair & HUD
    if (activeHoverIdx !== null && activeHoverIdx >= startIdx && activeHoverIdx <= endIdx && candles[activeHoverIdx]) {
      const activeX = getX(activeHoverIdx);
      const activeCandle = candles[activeHoverIdx];
      const activeY = getY(activeCandle.close);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(activeX, padding.top);
      ctx.lineTo(activeX, height - padding.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, activeY);
      ctx.lineTo(width - padding.right, activeY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Range Measurement Computation (Strict Chronological Forward Progress: t1 <= t2)
  const rangeMeasurement = useMemo<RangeMeasurement | null>(() => {
    if (measureStartIdx === null || candles.length === 0) return null;
    const rawEnd = measureEndIdx !== null ? measureEndIdx : (hoverIndex ?? measureStartIdx);
    if (rawEnd === null || !candles[measureStartIdx] || !candles[rawEnd]) return null;

    // Normalize so start is strictly the earlier date in time and end is the later date
    const minIdx = Math.min(measureStartIdx, rawEnd);
    const maxIdx = Math.max(measureStartIdx, rawEnd);
    const startCandle = candles[minIdx];
    const endCandle = candles[maxIdx];
    const slice = candles.slice(minIdx, maxIdx + 1);

    const startPrice = startCandle.close;
    const endPrice = endCandle.close;
    const diffPrice = endPrice - startPrice;
    const diffPercent = startPrice > 0 ? (diffPrice / startPrice) * 100 : 0;
    const isPositive = diffPrice >= 0;

    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const totalVolume = slice.reduce((sum, c) => sum + (c.volume || 0), 0);
    const barCount = slice.length;

    const startDateObj = new Date(startCandle.time * 1000);
    const endDateObj = new Date(endCandle.time * 1000);
    const dayCount = Math.max(1, Math.round(Math.abs(endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));

    const formatDt = (d: Date) => timeframe === '1D'
      ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      startIdx: minIdx,
      endIdx: maxIdx,
      startDate: formatDt(startDateObj),
      endDate: formatDt(endDateObj),
      startPrice,
      endPrice,
      diffPrice,
      diffPercent,
      barCount,
      dayCount,
      high,
      low,
      totalVolume,
      isPositive,
    };
  }, [candles, measureStartIdx, measureEndIdx, hoverIndex, timeframe]);

  // Draw Inline Clean Chart
  useEffect(() => {
    if (canvasRef.current && candles.length > 0) {
      drawChartOnCanvas(canvasRef.current, hoverIndex, {
        enableSMA20: false,
        enableSMA50: false,
        enableSMA200: false,
        enableBollinger: false,
        enableVolume: true,
        enableRSI: false,
      });
    }
  }, [candles, chartType, hoverIndex, measureStartIdx, measureEndIdx]);

  // Draw Fullscreen Advanced Pro Chart
  useEffect(() => {
    if (isFullScreen && fullCanvasRef.current && candles.length > 0) {
      drawChartOnCanvas(fullCanvasRef.current, fullHoverIndex, {
        enableSMA20: showSMA20,
        enableSMA50: showSMA50,
        enableSMA200: showSMA200,
        enableBollinger: showBollinger,
        enableVolume: showVolume,
        enableRSI: showRSI,
        zoomRange,
      });
    }
  }, [isFullScreen, candles, chartType, showSMA20, showSMA50, showSMA200, showBollinger, showVolume, showRSI, fullHoverIndex, measureStartIdx, measureEndIdx, zoomRange]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, isFull = false) => {
    const canvas = isFull ? fullCanvasRef.current : canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 15;
    const startIdx = (isFull && zoomRange) ? zoomRange.start : 0;
    const endIdx = (isFull && zoomRange) ? zoomRange.end : candles.length - 1;
    const visibleCount = endIdx - startIdx + 1;
    const barWidth = (rect.width - 85) / visibleCount;
    const relativeIdx = Math.floor(x / barWidth);
    const idx = Math.max(startIdx, Math.min(endIdx, startIdx + relativeIdx));

    if (isMeasuring || e.shiftKey) {
      setIsMeasuring(true);
      setMeasureStartIdx(idx);
      setMeasureEndIdx(idx);
      setIsDraggingMeasure(true);
    } else if (isFull && zoomRange !== null) {
      setIsPanning(true);
      setPanStartX(e.clientX);
      setPanInitialRange({ ...zoomRange });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, isFull = false) => {
    const canvas = isFull ? fullCanvasRef.current : canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 15;
    const startIdx = (isFull && zoomRange) ? zoomRange.start : 0;
    const endIdx = (isFull && zoomRange) ? zoomRange.end : candles.length - 1;
    const visibleCount = endIdx - startIdx + 1;
    const barWidth = (rect.width - 85) / visibleCount;
    const relativeIdx = Math.floor(x / barWidth);
    const idx = Math.max(startIdx, Math.min(endIdx, startIdx + relativeIdx));

    if (isFull) setFullHoverIndex(idx);
    else setHoverIndex(idx);

    if (isDraggingMeasure && measureStartIdx !== null) {
      setMeasureEndIdx(idx);
    } else if (isFull && isPanning && panStartX !== null && panInitialRange !== null) {
      const deltaBars = Math.round((panStartX - e.clientX) / barWidth);

      if (deltaBars !== 0) {
        const total = candles.length;
        const count = panInitialRange.end - panInitialRange.start + 1;
        let newStart = panInitialRange.start + deltaBars;
        let newEnd = panInitialRange.end + deltaBars;

        if (newStart < 0) {
          newStart = 0;
          newEnd = count - 1;
        } else if (newEnd >= total) {
          newEnd = total - 1;
          newStart = total - count;
        }

        setZoomRange({ start: newStart, end: newEnd });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingMeasure) {
      setIsDraggingMeasure(false);
    }
    if (isPanning) {
      setIsPanning(false);
      setPanStartX(null);
      setPanInitialRange(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, isFull = false) => {
    if (!isMeasuring && !e.shiftKey) return;

    const canvas = isFull ? fullCanvasRef.current : canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 15;
    const startIdx = (isFull && zoomRange) ? zoomRange.start : 0;
    const endIdx = (isFull && zoomRange) ? zoomRange.end : candles.length - 1;
    const visibleCount = endIdx - startIdx + 1;
    const barWidth = (rect.width - 85) / visibleCount;
    const relativeIdx = Math.floor(x / barWidth);
    const idx = Math.max(startIdx, Math.min(endIdx, startIdx + relativeIdx));

    if (measureStartIdx === null) {
      setMeasureStartIdx(idx);
      setMeasureEndIdx(null);
    } else if (measureEndIdx === null) {
      setMeasureEndIdx(idx);
    } else {
      setMeasureStartIdx(idx);
      setMeasureEndIdx(null);
    }
  };

  const activeHoverCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];
  const activeFullCandle = fullHoverIndex !== null ? candles[fullHoverIndex] : (zoomRange ? candles[zoomRange.end] : candles[candles.length - 1]);

  return (
    <>
      {/* Inline Clean Chart Container */}
      <div className="flex flex-col bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        
        {/* Chart Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#131926]">
          
          {/* Timeframe Buttons */}
          <div className="h-10 flex items-center gap-1 bg-[#182030] p-1 rounded-xl text-xs sm:text-sm font-mono font-bold shrink-0 overflow-x-auto max-w-full">
            {(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`h-full px-2.5 sm:px-3 rounded-lg flex items-center justify-center transition whitespace-nowrap ${
                  timeframe === tf || (tf === '1W' && timeframe === '5D')
                    ? 'bg-[#222c3f] text-emerald-400 font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Style */}
            <div className="h-10 flex items-center gap-1 bg-[#182030] p-1 rounded-xl text-xs sm:text-sm font-bold shrink-0">
              <button
                onClick={() => setChartType('candlestick')}
                className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                  chartType === 'candlestick' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mum Grafiği"
              >
                <CandlestickChart className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mum</span>
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                  chartType === 'area' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Alan Grafiği"
              >
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Alan</span>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                  chartType === 'line' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Çizgi Grafiği"
              >
                <LineChartIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Çizgi</span>
              </button>
            </div>

            {/* Range Measurement Tool Toggle Button */}
            <button
              onClick={() => {
                if (isMeasuring && measureStartIdx !== null) {
                  setMeasureStartIdx(null);
                  setMeasureEndIdx(null);
                  setIsMeasuring(false);
                } else {
                  setIsMeasuring(!isMeasuring);
                }
              }}
              className={`h-10 flex items-center justify-center gap-2 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold transition shrink-0 ${
                isMeasuring
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                  : 'bg-[#182030] hover:bg-[#222c3f] text-slate-200 hover:text-white'
              }`}
              title="Grafik üzerinde 2 nokta seçerek aralık ve getiri ölçümü yapın"
            >
              <MoveHorizontal className={`w-4 h-4 stroke-[2.5] shrink-0 ${isMeasuring ? 'text-indigo-300' : 'text-indigo-400'}`} />
              <span>{isMeasuring ? 'Ölçüm Aktif' : 'Aralık Ölç'}</span>
            </button>

            {/* Gelişmiş Analiz Button */}
            <button
              onClick={() => setIsFullScreen(true)}
              className="h-10 flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[#182030] hover:bg-[#222c3f] text-white font-mono text-xs sm:text-sm font-bold transition shadow-sm shrink-0"
              title="Gelişmiş Analiz Terminalini Aç"
            >
              <Maximize2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Gelişmiş Analiz</span>
            </button>
          </div>
        </div>

        {/* Range Measurement HUD Banner (Single-Line, Pro Terminal Design, No Emojis) */}
        {rangeMeasurement && (
          <div className="mx-4 my-2 px-4 py-2.5 rounded-xl bg-[#141c2b] shadow-lg flex items-center justify-between gap-4 text-xs font-mono overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-3.5">
              {/* Range Interval */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${rangeMeasurement.isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="text-slate-400">Aralık:</span>
                <span className="text-white font-bold">{rangeMeasurement.startDate}</span>
                <span className="text-slate-600 font-sans">→</span>
                <span className="text-white font-bold">{rangeMeasurement.endDate}</span>
              </div>

              <div className="h-3.5 w-px bg-white/10" />

              {/* Price & % Difference */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Fark:</span>
                <span className={`font-black ${rangeMeasurement.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {rangeMeasurement.isPositive ? '+' : ''}{rangeMeasurement.diffPrice.toFixed(isFund ? 6 : (rangeMeasurement.startPrice < 10 ? 4 : 2))} {currency === 'TRY' ? '₺' : '$'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  rangeMeasurement.isPositive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                }`}>
                  {rangeMeasurement.isPositive ? '+' : ''}{rangeMeasurement.diffPercent.toFixed(2)}%
                </span>
              </div>

              <div className="h-3.5 w-px bg-white/10" />

              {/* Duration & Candles */}
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-400">Süre:</span>
                <b className="text-white font-bold">{rangeMeasurement.dayCount} Gün</b>
                <span className="text-slate-400 text-[11px]">({rangeMeasurement.barCount} Mum)</span>
              </div>

              <div className="h-3.5 w-px bg-white/10" />

              {/* High & Low */}
              <div className="flex items-center gap-2 text-slate-300">
                <span>Zirve: <b className="text-emerald-400 font-bold">{rangeMeasurement.high.toFixed(isFund ? 6 : (rangeMeasurement.high < 10 ? 4 : 2))}</b></span>
                <span className="text-slate-600">/</span>
                <span>Dip: <b className="text-rose-400 font-bold">{rangeMeasurement.low.toFixed(isFund ? 6 : (rangeMeasurement.low < 10 ? 4 : 2))}</b></span>
              </div>

              <div className="h-3.5 w-px bg-white/10" />

              {/* Volume */}
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-400">Hacim:</span>
                <b className="text-slate-200">{rangeMeasurement.totalVolume.toLocaleString()}</b>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setMeasureStartIdx(null);
                  setMeasureEndIdx(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-sans font-medium transition"
                title="Aralık ölçümünü temizle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>

              <button
                onClick={() => {
                  setMeasureStartIdx(null);
                  setMeasureEndIdx(null);
                  setIsMeasuring(false);
                }}
                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                title="Ölçüm modunu kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Measuring Guide Hint Banner (When mode active but 2nd point not selected) */}
        {isMeasuring && !rangeMeasurement && (
          <div className="mx-4 my-2 px-3.5 py-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>
                {measureStartIdx === null
                  ? 'Grafik üzerinde ölçüme başlayacağınız 1. noktaya tıklayın veya sürükleyin.'
                  : 'Şimdi karşılaştırmak istediğiniz 2. bitiş noktasına tıklayın.'}
              </span>
            </div>
            <button
              onClick={() => {
                setMeasureStartIdx(null);
                setMeasureEndIdx(null);
                setIsMeasuring(false);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* OHLCV HUD */}
        {activeHoverCandle && !rangeMeasurement && (
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0e131d] text-xs sm:text-sm font-mono">
            <div className="flex items-center gap-4 text-slate-300">
              <span>{new Date(activeHoverCandle.time * 1000).toLocaleDateString('tr-TR')}</span>
              <span>Açılış: <b className="text-white">{typeof activeHoverCandle.open === 'number' ? formatPriceVal(activeHoverCandle.open) : activeHoverCandle.open}</b></span>
              <span>Yüksek: <b className="text-emerald-400">{typeof activeHoverCandle.high === 'number' ? formatPriceVal(activeHoverCandle.high) : activeHoverCandle.high}</b></span>
              <span>Düşük: <b className="text-rose-400">{typeof activeHoverCandle.low === 'number' ? formatPriceVal(activeHoverCandle.low) : activeHoverCandle.low}</b></span>
              <span>Kapanış: <b className="text-cyan-300">{typeof activeHoverCandle.close === 'number' ? formatPriceVal(activeHoverCandle.close) : activeHoverCandle.close}</b></span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-300">Hacim: <b className="text-white">{activeHoverCandle.volume ? activeHoverCandle.volume.toLocaleString() : '-'}</b></span>
              <span className={`font-bold ${activeHoverCandle.close >= activeHoverCandle.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeHoverCandle.close >= activeHoverCandle.open ? '+' : ''}
                {(((activeHoverCandle.close - activeHoverCandle.open) / activeHoverCandle.open) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative w-full h-[540px] bg-[#0c1018]">
          {loading && candles.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Grafik yükleniyor...
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={(e) => handleCanvasMouseDown(e, false)}
              onMouseMove={(e) => handleCanvasMouseMove(e, false)}
              onMouseUp={handleCanvasMouseUp}
              onClick={(e) => handleCanvasClick(e, false)}
              onMouseLeave={() => {
                setHoverIndex(null);
                if (isDraggingMeasure) setIsDraggingMeasure(false);
              }}
              className={`w-full h-full block ${isMeasuring ? 'cursor-crosshair' : 'cursor-crosshair'}`}
            />
          )}
        </div>
      </div>

      {/* Advanced Full Screen Pro Analysis Terminal Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-[#090d16] flex flex-col p-4 sm:p-6 overflow-hidden">
          
          {/* Top Fullscreen Toolbar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            
            {/* Asset Details */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#222d42] flex items-center justify-center font-mono font-black text-sm text-slate-100">
                {symbol.replace('.IS', '').substring(0, 3)}
              </div>
              <div>
                <span className="font-mono font-black text-lg text-white block leading-tight">
                  {symbol.replace('.IS', '')}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  Gelişmiş Teknik Analiz & Göstergeler
                </span>
              </div>
            </div>

            {/* Middle: Timeframe & Chart Style */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Left: Timeframe Controls */}
              <div className="h-10 flex items-center gap-1 bg-[#141b27] p-1 rounded-xl text-xs sm:text-sm font-mono font-bold shrink-0 overflow-x-auto max-w-full">
                {(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`h-full px-2.5 sm:px-3 rounded-lg flex items-center justify-center transition whitespace-nowrap ${
                      timeframe === tf || (tf === '1W' && timeframe === '5D')
                        ? 'bg-[#222c3f] text-emerald-400 font-extrabold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart Style */}
              <div className="h-10 flex items-center gap-1 bg-[#141b27] p-1 rounded-xl text-xs sm:text-sm font-bold shrink-0">
                <button
                  onClick={() => setChartType('candlestick')}
                  className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                    chartType === 'candlestick' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CandlestickChart className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mum</span>
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                    chartType === 'area' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Alan</span>
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition ${
                    chartType === 'line' ? 'bg-[#222c3f] text-white shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LineChartIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Çizgi</span>
                </button>
              </div>

              {/* Fullscreen Measurement Tool Toggle */}
              <button
                onClick={() => {
                  if (isMeasuring && measureStartIdx !== null) {
                    setMeasureStartIdx(null);
                    setMeasureEndIdx(null);
                    setIsMeasuring(false);
                  } else {
                    setIsMeasuring(!isMeasuring);
                  }
                }}
                className={`h-10 flex items-center justify-center gap-2 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold transition shrink-0 ${
                  isMeasuring
                    ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                    : 'bg-[#141b27] hover:bg-[#222c3f] text-slate-200 hover:text-white'
                }`}
                title="Aralık Ölçüm Aracını Aç"
              >
                <MoveHorizontal className={`w-4 h-4 stroke-[2.5] shrink-0 ${isMeasuring ? 'text-indigo-300' : 'text-indigo-400'}`} />
                <span>{isMeasuring ? 'Ölçüm Aktif' : 'Aralık Ölç'}</span>
              </button>
            </div>

            {/* Right: Full Indicator Toggles & Minimize Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-10 flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold bg-[#141b27] p-1 rounded-xl shrink-0">
                <button
                  onClick={() => toggleIndicator('showSMA20')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showSMA20 ? 'bg-sky-500/20 text-sky-300 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  SMA 20
                </button>
                <button
                  onClick={() => toggleIndicator('showSMA50')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showSMA50 ? 'bg-amber-500/20 text-amber-300 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  SMA 50
                </button>
                <button
                  onClick={() => toggleIndicator('showSMA200')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showSMA200 ? 'bg-purple-500/20 text-purple-300 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  SMA 200
                </button>
                <button
                  onClick={() => toggleIndicator('showBollinger')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showBollinger ? 'bg-cyan-500/20 text-cyan-300 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Bollinger
                </button>
                <button
                  onClick={() => toggleIndicator('showRSI')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showRSI ? 'bg-pink-500/20 text-pink-400 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  RSI
                </button>
                <button
                  onClick={() => toggleIndicator('showVolume')}
                  className={`h-full px-3.5 rounded-lg flex items-center justify-center transition ${
                    showVolume ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  HACİM
                </button>
              </div>

              {/* Zoom Indicator & Reset Button */}
              {zoomRange && (
                <button
                  onClick={() => setZoomRange(null)}
                  className="h-10 flex items-center gap-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-xs sm:text-sm font-bold transition shadow-sm shrink-0"
                  title="Grafik Yakınlaştırmasını Sıfırla (Esc)"
                >
                  <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                  <span>%{Math.round((candles.length / (zoomRange.end - zoomRange.start + 1)) * 100)}</span>
                  <span className="text-[10px] opacity-75 font-normal ml-0.5 underline">Sıfırla</span>
                </button>
              )}

              {/* Close / Minimize Button */}
              <button
                onClick={() => {
                  setIsFullScreen(false);
                  setZoomRange(null);
                  setIsPanning(false);
                }}
                className="h-10 flex items-center justify-center gap-1.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-mono font-bold text-xs sm:text-sm transition shadow-sm shrink-0"
                title="Tam Ekrandan Çık (ESC)"
              >
                <Minimize2 className="w-4 h-4 shrink-0" />
                <span>Küçült (ESC)</span>
              </button>
            </div>

          </div>

          {/* Fullscreen Range Measurement HUD Banner (Single-Line, Pro Terminal Design, No Emojis) */}
          {rangeMeasurement && (
            <div className="px-4 py-2.5 rounded-xl bg-[#141c2b] shadow-lg flex items-center justify-between gap-4 text-xs font-mono my-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              <div className="flex items-center gap-3.5">
                {/* Range Interval */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${rangeMeasurement.isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-slate-400">Aralık:</span>
                  <span className="text-white font-bold">{rangeMeasurement.startDate}</span>
                  <span className="text-slate-600 font-sans">→</span>
                  <span className="text-white font-bold">{rangeMeasurement.endDate}</span>
                </div>

                <div className="h-3.5 w-px bg-white/10" />

                {/* Net Price & % Difference */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Net Getiri:</span>
                  <span className={`font-black ${rangeMeasurement.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {rangeMeasurement.isPositive ? '+' : ''}{rangeMeasurement.diffPrice.toFixed(isFund ? 6 : (rangeMeasurement.startPrice < 10 ? 4 : 2))} {currency === 'TRY' ? '₺' : '$'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    rangeMeasurement.isPositive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                  }`}>
                    {rangeMeasurement.isPositive ? '+' : ''}{rangeMeasurement.diffPercent.toFixed(2)}%
                  </span>
                </div>

                <div className="h-3.5 w-px bg-white/10" />

                {/* Duration */}
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-400">Süre:</span>
                  <b className="text-white font-bold">{rangeMeasurement.dayCount} Gün</b>
                  <span className="text-slate-400 text-[11px]">({rangeMeasurement.barCount} Mum)</span>
                </div>

                <div className="h-3.5 w-px bg-white/10" />

                {/* High & Low */}
                <div className="flex items-center gap-2 text-slate-300">
                  <span>Zirve: <b className="text-emerald-400 font-bold">{rangeMeasurement.high.toFixed(isFund ? 6 : (rangeMeasurement.high < 10 ? 4 : 2))}</b></span>
                  <span className="text-slate-600">/</span>
                  <span>Dip: <b className="text-rose-400 font-bold">{rangeMeasurement.low.toFixed(isFund ? 6 : (rangeMeasurement.low < 10 ? 4 : 2))}</b></span>
                </div>

                <div className="h-3.5 w-px bg-white/10" />

                {/* Volume */}
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-400">Hacim:</span>
                  <b className="text-slate-200">{rangeMeasurement.totalVolume.toLocaleString()}</b>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setMeasureStartIdx(null);
                    setMeasureEndIdx(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-sans font-medium transition"
                  title="Aralık ölçümünü temizle"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Sıfırla</span>
                </button>
              </div>
            </div>
          )}

          {/* Fullscreen Pro HUD */}
          {activeFullCandle && !rangeMeasurement && (
            <div className="flex flex-wrap items-center justify-between py-2 px-3 text-xs sm:text-sm font-mono text-slate-300 bg-[#0c1018] rounded-t-xl mt-2">
              <div className="flex items-center gap-4">
                <span>Tarih: <b className="text-white">{new Date(activeFullCandle.time * 1000).toLocaleDateString('tr-TR')}</b></span>
                <span>Açılış: <b className="text-white">{typeof activeFullCandle.open === 'number' ? formatPriceVal(activeFullCandle.open) : activeFullCandle.open}</b></span>
                <span>Yüksek: <b className="text-emerald-400">{typeof activeFullCandle.high === 'number' ? formatPriceVal(activeFullCandle.high) : activeFullCandle.high}</b></span>
                <span>Düşük: <b className="text-rose-400">{typeof activeFullCandle.low === 'number' ? formatPriceVal(activeFullCandle.low) : activeFullCandle.low}</b></span>
                <span>Kapanış: <b className="text-cyan-300">{typeof activeFullCandle.close === 'number' ? formatPriceVal(activeFullCandle.close) : activeFullCandle.close}</b></span>
              </div>
              <div className="flex items-center gap-4">
                <span>Hacim: <b className="text-white">{activeFullCandle.volume ? activeFullCandle.volume.toLocaleString() : '-'}</b></span>
                <span className={`font-black ${activeFullCandle.close >= activeFullCandle.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeFullCandle.close >= activeFullCandle.open ? '+' : ''}
                  {(((activeFullCandle.close - activeFullCandle.open) / activeFullCandle.open) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Large Pro Fullscreen Canvas */}
          <div className="flex-1 w-full bg-[#0c1018] rounded-b-xl overflow-hidden relative min-h-[450px]">
            <canvas
              ref={fullCanvasRef}
              onMouseDown={(e) => handleCanvasMouseDown(e, true)}
              onMouseMove={(e) => handleCanvasMouseMove(e, true)}
              onMouseUp={handleCanvasMouseUp}
              onClick={(e) => handleCanvasClick(e, true)}
              onMouseLeave={() => {
                setFullHoverIndex(null);
                if (isDraggingMeasure) setIsDraggingMeasure(false);
              }}
              className={`w-full h-full block select-none ${
                isMeasuring
                  ? 'cursor-crosshair'
                  : isPanning
                    ? 'cursor-grabbing'
                    : zoomRange !== null
                      ? 'cursor-grab'
                      : 'cursor-crosshair'
              }`}
            />
          </div>
        </div>
      )}
    </>
  );
};
