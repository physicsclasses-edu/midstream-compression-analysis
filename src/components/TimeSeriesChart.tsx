'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeSeriesChartProps {
  well: string;
  metrics: string[];
  dateRange: { from: string; to: string };
}

// Define phases with timestamps (in hours from start)
const PHASES = {
  natural: { start: 0, end: 168 }, // 0-7 days (168 hours)
  shutIn1: { start: 72, end: 78 }, // Small shut-in during natural (6 hours at day 3)
  shutIn2: { start: 168, end: 216 }, // Large shut-in during transition (2 days/48 hours)
  continuous: { start: 216, end: 504 }, // 216 hours (day 9) to 504 hours (day 21)
};

// Define which metrics use left vs right Y-axis
const RIGHT_AXIS_METRICS = ['Gas Injection Pressure', 'Gas Injection Rate', 'Casing Pressure', 'Tubing Pressure'];

// Color palette for different metrics
const METRIC_COLORS: { [key: string]: string } = {
  'Line Pressure': '#3b82f6', // blue
  'Gas Injection Pressure': '#10b981', // green
  'Gas Injection Rate': '#f59e0b', // amber
  'Choke': '#8b5cf6', // purple
  'Casing Pressure': '#ec4899', // pink
  'Tubing Pressure': '#06b6d4', // cyan
  'Oil Production Rate': '#ef4444', // red
  'Water Production Rate': '#f97316', // orange
  'Gas Production Rate': '#84cc16', // lime
  'Predicted Oil Production Rate': '#dc2626', // dark red (close to actual)
};

// Deterministic random function for SSR compatibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate realistic time-series data with hourly granularity
const generateTimeSeriesData = (metrics: string[], well: string) => {
  const data = [];
  const totalDays = 21; // 21 days
  const startDate = new Date(2024, 0, 1); // January 1, 2024

  // Base values for different metrics
  const metricBases: { [key: string]: { base: number, unit: string, variance: number } } = {
    'Line Pressure': { base: 850, unit: 'psi', variance: 50 },
    'Gas Injection Pressure': { base: 1200, unit: 'psi', variance: 100 },
    'Gas Injection Rate': { base: 2.5, unit: 'MMscf/d', variance: 0.5 },
    'Choke': { base: 45, unit: '%', variance: 10 },
    'Casing Pressure': { base: 950, unit: 'psi', variance: 60 },
    'Tubing Pressure': { base: 780, unit: 'psi', variance: 40 },
    'Oil Production Rate': { base: 145, unit: 'BBL/day', variance: 20 },
    'Water Production Rate': { base: 85, unit: 'BBL/day', variance: 15 },
    'Gas Production Rate': { base: 3.2, unit: 'MMscf/d', variance: 0.4 },
    'Predicted Oil Production Rate': { base: 145, unit: 'BBL/day', variance: 12 },
  };

  // Store oil production values for prediction matching
  const oilProductionValues: { [key: string]: number } = {};

  // First pass: calculate Oil Production Rate for each hour
  for (let day = 0; day <= totalDays; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${day}-${hour}`;
      const config = metricBases['Oil Production Rate'];
      let value = config.base;

      if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
        // Shut-in periods
        value = 0;
      } else {
        if (day < 7) {
          // Natural phase
          const declineRate = 0.02;
          value = config.base * (1 - declineRate * (day + hour / 24));
        } else if (day >= 9) {
          // Continuous phase
          const daysInContinuous = day - 9 + hour / 24;
          const improvementFactor = 1.15;
          value = config.base * improvementFactor * (1 - 0.007 * daysInContinuous);
          value *= 1.12; // boost factor
        }
        const variance = (seededRandom((day * 24 + hour) * 100) - 0.5) * config.variance;
        value += variance;
      }
      oilProductionValues[hourKey] = Math.max(0, Number(value.toFixed(2)));
    }
  }

  // Second pass: generate hourly data
  for (let day = 0; day <= totalDays; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      currentDate.setHours(hour);
      const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const hourKey = `${day}-${hour}`;

      const dataPoint: any = {
        day,
        hour,
        date: dateString,
        time: timeString,
        dateTime: `${dateString} ${timeString}`,
        timestamp: new Date(2024, 0, 1 + day, hour).toISOString(),
        index: day * 24 + hour,
      };

      metrics.forEach((metric) => {
        const config = metricBases[metric] || { base: 100, unit: '', variance: 10 };
        let value = config.base;

        // Special handling for Predicted Oil Production Rate
        if (metric === 'Predicted Oil Production Rate') {
          const actualValue = oilProductionValues[hourKey];
          if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
            value = 0;
          } else if (day < 3 || day >= 10) {
            value = actualValue + (seededRandom((day * 24 + hour) * 200 + 50) - 0.5) * 8;
          } else {
            value = actualValue + (seededRandom((day * 24 + hour) * 200 + 100) - 0.5) * 20;
          }
        } else {
          if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
            value = 0;
          } else {
            if (day < 7) {
              const declineRate = 0.02;
              value = config.base * (1 - declineRate * (day + hour / 24));
            } else if (day >= 9) {
              const daysInContinuous = day - 9 + hour / 24;
              const improvementFactor = 1.15;
              value = config.base * improvementFactor * (1 - 0.007 * daysInContinuous);
            }

            const metricIndex = Object.keys(metricBases).indexOf(metric);
            const variance = (seededRandom((day * 24 + hour) * 1000 + metricIndex * 100) - 0.5) * config.variance;
            value += variance;

            if (metric.includes('Production Rate') && metric !== 'Predicted Oil Production Rate' && day >= 9) {
              const boostFactor = metric.includes('Oil') ? 1.12 : 1.08;
              value *= boostFactor;
            }
          }
        }

        dataPoint[metric] = Math.max(0, Number(value.toFixed(2)));
      });

      data.push(dataPoint);
    }
  }

  return data;
};

export default function TimeSeriesChart({ well, metrics, dateRange }: TimeSeriesChartProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(21);

  // Legend toggle state - track which metrics are visible
  const [visibleMetrics, setVisibleMetrics] = useState<{[key: string]: boolean}>(() =>
    metrics.reduce((acc, metric) => ({ ...acc, [metric]: true }), {})
  );

  // Generate data immediately on render (deterministic, so SSR-safe)
  const data = generateTimeSeriesData(metrics, well);

  // Update visible metrics when metrics prop changes
  useEffect(() => {
    setVisibleMetrics(metrics.reduce((acc, metric) => ({ ...acc, [metric]: true }), {}));
  }, [metrics.join(',')]);

  // Toggle metric visibility
  const toggleMetric = (metric: string) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  // Update range when dateRange changes
  useEffect(() => {
    if (dateRange.from && dateRange.to && data.length > 0) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const startDate = new Date(data[0].timestamp);

      // Calculate day indices based on date range
      const startIndex = Math.max(0, Math.floor((fromDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
      const endIndex = Math.min(data.length - 1, Math.floor((toDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));

      if (startIndex < data.length && endIndex >= 0) {
        setRangeStart(Math.max(0, startIndex));
        setRangeEnd(Math.min(data.length - 1, endIndex));
      }
    }
  }, [dateRange, data.length]);

  // Get visible data based on range (convert day indices to hour indices)
  const startHourIndex = rangeStart * 24;
  const endHourIndex = (rangeEnd + 1) * 24;
  const visibleData = data.slice(startHourIndex, endHourIndex);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Determine if we need dual axes
  const hasLeftAxisMetrics = metrics.some(m => !RIGHT_AXIS_METRICS.includes(m));
  const hasRightAxisMetrics = metrics.some(m => RIGHT_AXIS_METRICS.includes(m));

  // Check if we need to show thresholds
  const showLinePressureThreshold = metrics.includes('Line Pressure');
  const showGasInjectionPressureThreshold = metrics.includes('Gas Injection Pressure');

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Extract full date and time from the data point
      const dataPoint = payload[0].payload;
      const displayLabel = dataPoint.dateTime || label;

      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{displayLabel}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none" style={{ outline: 'none' }} tabIndex={-1}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Time-Series Analysis: {well}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {metrics.length} metric{metrics.length > 1 ? 's' : ''} over 21 days with phase transitions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Exit
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Full Screen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full outline-none" style={{ height: '500px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleData}
            margin={{ top: 20, right: 50, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />

            {/* Background phases - Using index for x-axis matching */}
            {visibleData.length > 0 && (
              <>
                {/* Natural Phase: Days 0-7 - Green background */}
                {rangeStart <= 7 && rangeEnd >= 0 && (
                  <ReferenceArea
                    x1={visibleData[Math.max(0, (0 - rangeStart) * 24)]?.index}
                    x2={visibleData[Math.min(visibleData.length - 1, (Math.min(7, rangeEnd) - rangeStart) * 24 + 23)]?.index}
                    stroke="none"
                    fill="#10b981"
                    fillOpacity={0.15}
                  />
                )}

                {/* First Shut-In: Days 3-4 (overlays on Natural) - Red background */}
                {rangeStart <= 4 && rangeEnd >= 3 && (
                  <ReferenceArea
                    x1={visibleData[Math.max(0, (3 - rangeStart) * 24)]?.index}
                    x2={visibleData[Math.min(visibleData.length - 1, (Math.min(4, rangeEnd) - rangeStart) * 24 + 23)]?.index}
                    stroke="none"
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                )}

                {/* Second Shut-In: Days 7-9 (transition period) - Red background */}
                {rangeStart <= 9 && rangeEnd >= 7 && (
                  <ReferenceArea
                    x1={visibleData[Math.max(0, (7 - rangeStart) * 24)]?.index}
                    x2={visibleData[Math.min(visibleData.length - 1, (Math.min(9, rangeEnd) - rangeStart) * 24 + 23)]?.index}
                    stroke="none"
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                )}

                {/* Continuous Phase: Days 9-21 - Blue background */}
                {rangeEnd >= 9 && rangeStart <= 21 && (
                  <ReferenceArea
                    x1={visibleData[Math.max(0, (9 - rangeStart) * 24)]?.index}
                    x2={visibleData[Math.min(visibleData.length - 1, (Math.min(21, rangeEnd) - rangeStart) * 24 + 23)]?.index}
                    stroke="none"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                  />
                )}
              </>
            )}

            {/* Threshold Lines */}
            {showLinePressureThreshold && (
              <ReferenceLine
                y={150}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="left"
                label={{
                  value: 'Line Pressure Threshold (150)',
                  position: 'insideTopLeft',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            {showGasInjectionPressureThreshold && (
              <ReferenceLine
                y={1000}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="right"
                label={{
                  value: 'Gas Injection Threshold (1000)',
                  position: 'insideRight',
                  dy: -15,
                  dx: -10,
                  fill: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            <XAxis
              dataKey="index"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={80}
              ticks={visibleData.filter(d => d.hour === 0).map(d => d.index)}
              tickFormatter={(value) => {
                const dataPoint = visibleData.find(d => d.index === value);
                return dataPoint?.date || '';
              }}
            />

            {/* Left Y-Axis */}
            {hasLeftAxisMetrics && (
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{
                  value: 'Left Axis (Pressure, Production, etc.)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' }
                }}
                width={65}
                domain={[0, 'auto']}
              />
            )}

            {/* Right Y-Axis */}
            {hasRightAxisMetrics && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{
                  value: 'Right Axis (Gas Injection, Casing, etc.)',
                  angle: 90,
                  position: 'insideRight',
                  style: { fill: '#10b981', fontSize: 11, textAnchor: 'middle' }
                }}
                width={65}
                domain={[0, 'auto']}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for each visible metric */}
            {metrics.filter(metric => visibleMetrics[metric]).map((metric) => {
              const isRightAxis = RIGHT_AXIS_METRICS.includes(metric);
              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={METRIC_COLORS[metric] || '#6b7280'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={metric}
                  yAxisId={isRightAxis ? 'right' : 'left'}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time Range Slider */}
      <div className="px-16 flex justify-center items-center gap-4 -mt-8">
        {/* Left Arrow Button */}
        <button
          onClick={() => {
            if (rangeStart > 0) {
              setRangeStart(rangeStart - 1);
            }
          }}
          disabled={rangeStart === 0}
          className="flex-shrink-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white transition-colors disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          title="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative pt-1 pb-1 w-full max-w-2xl mt-3">
          {/* Track background */}
          <div className="absolute top-2 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>

          {/* Selected range highlight */}
          <div
            className="absolute top-2 h-2 bg-blue-500 dark:bg-blue-600 rounded-lg pointer-events-none z-10"
            style={{
              left: `${(rangeStart / 21) * 100}%`,
              right: `${100 - (rangeEnd / 21) * 100}%`
            }}
          ></div>

          {/* Start slider */}
          <input
            type="range"
            min="0"
            max={21}
            value={rangeStart}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value < rangeEnd) {
                setRangeStart(value);
              }
            }}
            className="absolute w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-30 range-slider-start"
            style={{
              top: '0.5rem',
              pointerEvents: 'auto'
            }}
          />

          {/* End slider */}
          <input
            type="range"
            min="0"
            max={21}
            value={rangeEnd}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value > rangeStart) {
                setRangeEnd(value);
              }
            }}
            className="absolute w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-40 range-slider-end"
            style={{
              top: '0.5rem',
              pointerEvents: 'auto'
            }}
          />

          {/* Labels below slider */}
          <div className="flex justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>{data[startHourIndex]?.date}</span>
            <span>{data[Math.min(endHourIndex - 1, data.length - 1)]?.date}</span>
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => {
            if (rangeEnd < 21) {
              setRangeEnd(rangeEnd + 1);
            }
          }}
          disabled={rangeEnd === 21}
          className="flex-shrink-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white transition-colors disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Custom Interactive Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {metrics.map((metric) => {
          const isVisible = visibleMetrics[metric];
          const color = METRIC_COLORS[metric] || '#6b7280';

          return (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
            >
              <svg width="18" height="10" className="flex-shrink-0">
                {/* Left line */}
                <line
                  x1="0"
                  y1="5"
                  x2="5"
                  y2="5"
                  stroke={color}
                  strokeWidth="2"
                  opacity={isVisible ? 1 : 0.3}
                />
                {/* Center hollow circle */}
                <circle
                  cx="9"
                  cy="5"
                  r="3"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  opacity={isVisible ? 1 : 0.3}
                />
                {/* Right line */}
                <line
                  x1="13"
                  y1="5"
                  x2="18"
                  y2="5"
                  stroke={color}
                  strokeWidth="2"
                  opacity={isVisible ? 1 : 0.3}
                />
              </svg>
              <span
                className="text-sm"
                style={{
                  color: isVisible ? color : color,
                  opacity: isVisible ? 1 : 0.4,
                  textDecoration: isVisible ? 'none' : 'line-through'
                }}
              >
                {metric}
              </span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        div * {
          outline: none !important;
        }

        div:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        svg {
          outline: none !important;
        }

        svg:focus {
          outline: none !important;
        }

        .recharts-wrapper {
          outline: none !important;
        }

        .recharts-surface {
          outline: none !important;
        }

        * {
          outline: none !important;
        }

        *:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: none;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          background: transparent;
          height: 8px;
        }

        input[type="range"]::-moz-range-track {
          background: transparent;
          height: 8px;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: grab;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: relative;
          pointer-events: auto;
          margin-top: -6px;
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: grab;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          pointer-events: auto;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        }

        input[type="range"]::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        }

        input[type="range"]::-webkit-slider-thumb:active {
          cursor: grabbing;
          background: #1d4ed8;
        }

        input[type="range"]::-moz-range-thumb:active {
          cursor: grabbing;
          background: #1d4ed8;
        }
      `}</style>
      </div>

      {/* Phase Details - Outside fullscreen container */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-1">Natural Phase</h4>
          <p className="text-sm text-green-600 dark:text-green-300">
            {data[0]?.date} to {data[7 * 24]?.date}: Well producing naturally with gradual decline
          </p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-400 mb-1">Shut-In Periods</h4>
          <p className="text-sm text-red-600 dark:text-red-300">
            {data[3 * 24]?.date} to {data[4 * 24]?.date}: 2-day maintenance | {data[7 * 24]?.date} to {data[9 * 24]?.date}: 3-day transition
          </p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">Continuous Phase</h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            {data[9 * 24]?.date} to {data[data.length - 1]?.date}: Compression active, improved production
          </p>
        </div>
      </div>
    </>
  );
}
