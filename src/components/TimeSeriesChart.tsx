'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface TimeSeriesChartProps {
  well: string;
  metrics: string[];
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

// Generate realistic time-series data
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
  const oilProductionValues: { [key: number]: number } = {};

  // First pass: calculate Oil Production Rate
  for (let day = 0; day <= totalDays; day++) {
    const config = metricBases['Oil Production Rate'];
    let value = config.base;

    if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
      // Shut-in periods (day 3-4: 2-day shut-in, day 7-9: 3-day shut-in)
      value = 0;
    } else {
      if (day < 7) {
        // Natural phase
        const declineRate = 0.02;
        value = config.base * (1 - declineRate * day);
      } else if (day >= 9) {
        // Continuous phase
        const daysInContinuous = day - 9;
        const improvementFactor = 1.15;
        value = config.base * improvementFactor * (1 - 0.007 * daysInContinuous);
        value *= 1.12; // boost factor
      }
      const variance = (seededRandom(day * 100) - 0.5) * config.variance;
      value += variance;
    }
    oilProductionValues[day] = Math.max(0, Number(value.toFixed(2)));
  }

  // Second pass: generate all data
  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

    const dataPoint: any = {
      day,
      date: dateString,
      time: `Day ${day}`,
      timestamp: new Date(2024, 0, 1 + day).toISOString(),
    };

    metrics.forEach((metric) => {
      const config = metricBases[metric] || { base: 100, unit: '', variance: 10 };
      let value = config.base;

      // Special handling for Predicted Oil Production Rate
      if (metric === 'Predicted Oil Production Rate') {
        const actualValue = oilProductionValues[day];
        // Make prediction close to actual in natural and continuous phases
        if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
          value = 0;
        } else if (day < 3 || day >= 10) {
          // Close match in early natural phase and stable continuous phase
          value = actualValue + (seededRandom(day * 200 + 50) - 0.5) * 8; // Very close
        } else {
          // Moderate variance in transition regions
          value = actualValue + (seededRandom(day * 200 + 100) - 0.5) * 20;
        }
      } else {
        // Check if we're in a shut-in period
        if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
          value = 0;
        } else {
          // Natural phase - gradual decline
          if (day < 7) {
            const declineRate = 0.02;
            value = config.base * (1 - declineRate * day);
          }
          // Continuous phase - improved and more stable
          else if (day >= 9) {
            const daysInContinuous = day - 9;
            const improvementFactor = 1.15; // 15% improvement
            value = config.base * improvementFactor * (1 - 0.007 * daysInContinuous);
          }

          // Add some realistic variance
          const metricIndex = Object.keys(metricBases).indexOf(metric);
          const variance = (seededRandom(day * 1000 + metricIndex * 100) - 0.5) * config.variance;
          value += variance;

          // Special handling for production rates - they respond to compression
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

  return data;
};

export default function TimeSeriesChart({ well, metrics }: TimeSeriesChartProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Generate data immediately on render (deterministic, so SSR-safe)
  const data = generateTimeSeriesData(metrics, well);

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
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
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
    <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
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

      {/* Phase Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-200 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 rounded"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Natural Phase</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-200 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Shut-In Period</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-200 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600 rounded"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Continuous (Compression)</span>
        </div>
        {(showLinePressureThreshold || showGasInjectionPressureThreshold) && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            {showLinePressureThreshold && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Pressure Threshold</span>
              </div>
            )}
            {showGasInjectionPressureThreshold && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-amber-500" style={{ borderTop: '2px dashed #f59e0b' }}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gas Injection Threshold</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '600px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 50, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />

            {/* Background phases - Using date strings for x-axis matching */}
            {data.length > 0 && (
              <>
                {/* Natural Phase: Days 0-7 */}
                <ReferenceArea
                  x1={data[0]?.date}
                  x2={data[7]?.date}
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.2}
                  ifOverflow="extendDomain"
                />

                {/* First Shut-In: Days 3-4 (overlays on Natural) */}
                <ReferenceArea
                  x1={data[3]?.date}
                  x2={data[4]?.date}
                  stroke="none"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  ifOverflow="extendDomain"
                />

                {/* Second Shut-In: Days 7-9 (transition period) */}
                <ReferenceArea
                  x1={data[7]?.date}
                  x2={data[9]?.date}
                  stroke="none"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  ifOverflow="extendDomain"
                />

                {/* Continuous Phase: Days 9-21 */}
                <ReferenceArea
                  x1={data[9]?.date}
                  x2={data[21]?.date}
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  ifOverflow="extendDomain"
                />
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
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            <XAxis
              dataKey="date"
              label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
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
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {/* Render lines for each metric */}
            {metrics.map((metric) => {
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

      {/* Phase Details */}
      <div className="-mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-1">Natural Phase</h4>
          <p className="text-sm text-green-600 dark:text-green-300">
            {data[0]?.date} to {data[7]?.date}: Well producing naturally with gradual decline
          </p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-400 mb-1">Shut-In Periods</h4>
          <p className="text-sm text-red-600 dark:text-red-300">
            {data[3]?.date} to {data[4]?.date}: 2-day maintenance | {data[7]?.date} to {data[9]?.date}: 3-day transition
          </p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">Continuous Phase</h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            {data[9]?.date} to {data[21]?.date}: Compression active, improved production
          </p>
        </div>
      </div>
    </div>
  );
}
