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
            labelBackgroundColor: '#000000',
          },
          horzLine: {
            color: 'rgba(5, 102, 234, 0.3)',
            labelBackgroundColor: '#000000',
          },
        },
        rightPriceScale: {
          borderColor: '#222222',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#222222',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ff1744',
        borderUpColor: '#22c55e',
        borderDownColor: '#ff1744',
        wickUpColor: '#22c55e',
        wickDownColor: '#ff1744',
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
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 23, 68, 0.25)',
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
