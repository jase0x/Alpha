'use client';

import { useEffect, useRef } from 'react';
import { OHLCVData } from '@/types/token';

interface PriceChartProps {
  data: OHLCVData[];
}

export default function PriceChart({ data }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    let disposed = false;

    async function initChart() {
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');

      if (disposed || !containerRef.current) return;

      // Remove old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#8899aa',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(30, 42, 58, 0.5)' },
          horzLines: { color: 'rgba(30, 42, 58, 0.5)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(0, 212, 170, 0.3)',
            labelBackgroundColor: '#0d1117',
          },
          horzLine: {
            color: 'rgba(0, 212, 170, 0.3)',
            labelBackgroundColor: '#0d1117',
          },
        },
        rightPriceScale: {
          borderColor: '#1e2a3a',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#1e2a3a',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      const formattedData = data.map((d) => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candleSeries.setData(formattedData);

      // Volume series
      const volumeSeries = chart.addHistogramSeries({
        color: 'rgba(0, 212, 170, 0.2)',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      const volumeData = data.map((d) => ({
        time: d.time as any,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
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
  }, [data]);

  return <div ref={containerRef} className="w-full h-full" />;
}
