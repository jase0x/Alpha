'use client';

import { useEffect, useRef } from 'react';
import { OHLCVData } from '@/types/token';

export type ChartType = 'candles' | 'line' | 'area';

interface PriceChartProps {
  data: OHLCVData[];
  chartType?: ChartType;
}

export default function PriceChart({ data, chartType = 'candles' }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    let disposed = false;

    async function initChart() {
      const { createChart, ColorType, CrosshairMode, LineStyle } = await import('lightweight-charts');

      if (disposed || !containerRef.current) return;

      // Remove old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#555555',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(5, 102, 234, 0.3)',
            labelBackgroundColor: '#111',
          },
          horzLine: {
            color: 'rgba(5, 102, 234, 0.3)',
            labelBackgroundColor: '#111',
          },
        },
        rightPriceScale: {
          borderColor: '#1a3a5c',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#1a3a5c',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      const formattedCandles = data.map((d) => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const lineData = data.map((d) => ({
        time: d.time as any,
        value: d.close,
      }));

      if (chartType === 'candles') {
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#00e676',
          downColor: '#ff1744',
          borderUpColor: '#00e676',
          borderDownColor: '#ff1744',
          wickUpColor: '#00e676',
          wickDownColor: '#ff1744',
        });
        candleSeries.setData(formattedCandles);
      } else if (chartType === 'line') {
        const lineSeries = chart.addLineSeries({
          color: '#0566ea',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: '#0566ea',
        });
        lineSeries.setData(lineData);
      } else if (chartType === 'area') {
        const areaSeries = chart.addAreaSeries({
          topColor: 'rgba(5, 102, 234, 0.4)',
          bottomColor: 'rgba(5, 102, 234, 0.02)',
          lineColor: '#0566ea',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: '#0566ea',
        });
        areaSeries.setData(lineData);
      }

      // Volume series
      const volumeSeries = chart.addHistogramSeries({
        color: 'rgba(5, 102, 234, 0.15)',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      const volumeData = data.map((d) => ({
        time: d.time as any,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)',
      }));

      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
      chartRef.current = chart;

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0] && !disposed) {
          const { width, height } = entries[0].contentRect;
          chart.applyOptions({ width, height });
        }
      });

      resizeObserver.observe(containerRef.current!);

      return () => {
        resizeObserver.disconnect();
      };
    }

    initChart();

    return () => {
      disposed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, chartType]);

  return <div ref={containerRef} className="w-full h-full" />;
}
