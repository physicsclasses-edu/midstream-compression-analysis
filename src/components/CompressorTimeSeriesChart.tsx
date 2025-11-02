'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';

// Incident interface - exported for use in parent component
export interface Incident {
  startTime: string;
  endTime: string;
  type: 'offline' | 'capacity' | 'maintenance';
  compressor?: string;
  description: string;
  duration: number;
}

interface CompressorTimeSeriesChartProps {
  compressors: string[];
  variables: string[];
  dateRange: { from: string; to: string };
  onIncidentsGenerated?: (incidents: Incident[]) => void;
}

// Define which variables use right axis
const RIGHT_AXIS_VARIABLES = ['Discharge Pressure (psi)', 'Gas Temperature (F)'];

// Color palette for different compressors and variables
const COLORS: { [key: string]: string } = {
  'Rock Creek 1-Discharge Pressure (psi)': '#3b82f6', // blue
  'Rock Creek 1-Suction Pressure (psi)': '#10b981', // green
  'Rock Creek 1-Gas Flow Rate (MCFD)': '#f59e0b', // amber
  'Rock Creek 1-Gas Temperature (F)': '#8b5cf6', // purple
  'Rock Creek 2-Discharge Pressure (psi)': '#ec4899', // pink
  'Rock Creek 2-Suction Pressure (psi)': '#06b6d4', // cyan
  'Rock Creek 2-Gas Flow Rate (MCFD)': '#ef4444', // red
  'Rock Creek 2-Gas Temperature (F)': '#f97316', // orange
  'Wyatt-Discharge Pressure (psi)': '#84cc16', // lime
  'Wyatt-Suction Pressure (psi)': '#14b8a6', // teal
  'Wyatt-Gas Flow Rate (MCFD)': '#a855f7', // violet
  'Wyatt-Gas Temperature (F)': '#f43f5e', // rose
};

// Deterministic random function for SSR compatibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate random offline periods for compressors
const generateOfflinePeriods = (compressors: string[]) => {
  const offlinePeriods: { [key: string]: { start: number; end: number }[] } = {};

  compressors.forEach((compressor, index) => {
    const periods: { start: number; end: number }[] = [];
    const seed = index * 1000;

    // Generate 1-3 random offline periods per compressor
    const numPeriods = Math.floor(seededRandom(seed) * 3) + 1;

    for (let i = 0; i < numPeriods; i++) {
      const startHour = Math.floor(seededRandom(seed + i * 10) * 20); // Start between 0-19
      const duration = Math.floor(seededRandom(seed + i * 10 + 5) * 3) + 1; // Duration 1-3 hours
      const endHour = Math.min(startHour + duration, 23);

      // Avoid overlapping periods
      const overlaps = periods.some(p =>
        (startHour >= p.start && startHour <= p.end) ||
        (endHour >= p.start && endHour <= p.end)
      );

      if (!overlaps) {
        periods.push({ start: startHour, end: endHour });
      }
    }

    offlinePeriods[compressor] = periods;
  });

  return offlinePeriods;
};

// Generate incident timeline
const generateIncidentTimeline = (compressors: string[], offlinePeriods: { [key: string]: { start: number; end: number }[] }): Incident[] => {
  const incidents: Incident[] = [];

  // Add compressor offline incidents
  compressors.forEach((compressor) => {
    const periods = offlinePeriods[compressor] || [];
    periods.forEach((period) => {
      const duration = period.end - period.start;
      incidents.push({
        startTime: `${period.start.toString().padStart(2, '0')}:00`,
        endTime: `${period.end.toString().padStart(2, '0')}:00`,
        type: 'offline',
        compressor,
        description: `${compressor} - Compressor Offline`,
        duration
      });
    });
  });

  // Add random capacity exceeded incidents
  const numCapacityIncidents = Math.floor(seededRandom(999) * 2) + 1; // 1-2 incidents
  for (let i = 0; i < numCapacityIncidents; i++) {
    const startHour = Math.floor(seededRandom(888 + i * 50) * 18) + 2; // Start between 2-19
    const duration = Math.floor(seededRandom(888 + i * 50 + 20) * 3) + 2; // Duration 2-4 hours
    const endHour = Math.min(startHour + duration, 23);

    incidents.push({
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
      type: 'capacity',
      description: 'System Capacity Exceeded',
      duration: endHour - startHour
    });
  }

  // Sort by start time
  incidents.sort((a, b) => {
    const aHour = parseInt(a.startTime.split(':')[0]);
    const bHour = parseInt(b.startTime.split(':')[0]);
    return aHour - bHour;
  });

  return incidents;
};

// Calculate days between two dates
const calculateDaysBetween = (from: string, to: string): number => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end days
};

// Generate daily data for multi-day ranges (more than 2 days)
const generateDailyData = (compressors: string[], variables: string[], dateRange: { from: string; to: string }, offlinePeriods: { [key: string]: { start: number; end: number }[] }) => {
  const data = [];
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);

  // Base values for different variables
  const variableBases: { [key: string]: { base: number, variance: number } } = {
    'Discharge Pressure (psi)': { base: 1050, variance: 80 },
    'Suction Pressure (psi)': { base: 170, variance: 25 },
    'Gas Flow Rate (MCFD)': { base: 850, variance: 120 },
    'Gas Temperature (F)': { base: 185, variance: 15 },
  };

  // Generate data for each day
  let currentDate = new Date(fromDate);
  let dayIndex = 0;

  while (currentDate <= toDate) {
    const dateString = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dataPoint: any = {
      date: dateString,
      dayIndex: dayIndex,
      timestamp: currentDate.toISOString().split('T')[0],
    };

    // Generate data for each compressor and variable combination
    compressors.forEach((compressor, compressorIndex) => {
      variables.forEach((variable, variableIndex) => {
        const config = variableBases[variable] || { base: 100, variance: 10 };
        const seed = dayIndex * 1000 + compressorIndex * 100 + variableIndex * 10;
        const variance = (seededRandom(seed) - 0.5) * config.variance;

        // Add some daily variation
        const dailyFactor = 0.95 + seededRandom(seed + 1) * 0.1;
        const value = config.base * dailyFactor + variance;

        const key = `${compressor}-${variable}`;
        dataPoint[key] = Math.max(0, Number(value.toFixed(2)));
      });
    });

    data.push(dataPoint);
    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

// Generate 24-hour time series data for single day or 2-day ranges
const generateHourlyData = (compressors: string[], variables: string[], dateRange: { from: string; to: string }, offlinePeriods: { [key: string]: { start: number; end: number }[] }) => {
  const data = [];
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  const numDays = calculateDaysBetween(dateRange.from, dateRange.to);

  // Base values for different variables
  const variableBases: { [key: string]: { base: number, variance: number } } = {
    'Discharge Pressure (psi)': { base: 1050, variance: 80 },
    'Suction Pressure (psi)': { base: 170, variance: 25 },
    'Gas Flow Rate (MCFD)': { base: 850, variance: 120 },
    'Gas Temperature (F)': { base: 185, variance: 15 },
  };

  // Generate hourly data for each day in the range (up to 2 days)
  for (let dayOffset = 0; dayOffset < numDays; dayOffset++) {
    const currentDate = new Date(fromDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateString = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Generate data for each hour (00:00 to 23:00)
    for (let hour = 0; hour < 24; hour++) {
      const timeString = `${dateString} ${hour.toString().padStart(2, '0')}:00`;
      const hourIndex = dayOffset * 24 + hour;

      const dataPoint: any = {
        time: timeString,
        hour: hourIndex,
        displayHour: `${hour.toString().padStart(2, '0')}:00`,
        date: dateString,
      };

      // Generate data for each compressor and variable combination
      compressors.forEach((compressor, compressorIndex) => {
        // Check if compressor is offline during this hour (only on day 0 for simplicity)
        const isOffline = dayOffset === 0 && offlinePeriods[compressor]?.some(
          period => hour >= period.start && hour <= period.end
        );

        variables.forEach((variable, variableIndex) => {
          const config = variableBases[variable] || { base: 100, variance: 10 };
          const seed = hourIndex * 1000 + compressorIndex * 100 + variableIndex * 10;
          const variance = (seededRandom(seed) - 0.5) * config.variance;

          let value = 0;

          if (isOffline) {
            // Compressor offline - value is 0 or null
            value = 0;
          } else {
            // Add some hourly patterns (lower at night, higher during day)
            let hourlyFactor = 1.0;
            if (hour >= 6 && hour <= 18) {
              hourlyFactor = 1.05 + seededRandom(seed + 1) * 0.1; // Higher during day
            } else {
              hourlyFactor = 0.95 - seededRandom(seed + 2) * 0.05; // Lower at night
            }

            value = config.base * hourlyFactor + variance;
          }

          const key = `${compressor}-${variable}`;
          dataPoint[key] = Math.max(0, Number(value.toFixed(2)));
        });
      });

      data.push(dataPoint);
    }
  }

  return data;
};

export default function CompressorTimeSeriesChart({ compressors, variables, dateRange, onIncidentsGenerated }: CompressorTimeSeriesChartProps) {
  // Fullscreen state and ref
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Legend toggle state - track which series are visible
  const allSeries = compressors.flatMap(compressor =>
    variables.map(variable => `${compressor}-${variable}`)
  );
  const [visibleSeries, setVisibleSeries] = useState<{[key: string]: boolean}>(() =>
    allSeries.reduce((acc, series) => ({ ...acc, [series]: true }), {})
  );

  // Update visible series when compressors or variables change
  useEffect(() => {
    setVisibleSeries(allSeries.reduce((acc, series) => ({ ...acc, [series]: true }), {}));
  }, [compressors.join(','), variables.join(',')]);

  // Toggle series visibility
  const toggleSeries = (series: string) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  // Calculate number of days in the date range
  const numDays = calculateDaysBetween(dateRange.from, dateRange.to);
  const showHourly = numDays <= 2;

  // Generate data immediately on render (deterministic, so SSR-safe)
  const offlinePeriods = generateOfflinePeriods(compressors);
  const data = showHourly
    ? generateHourlyData(compressors, variables, dateRange, offlinePeriods)
    : generateDailyData(compressors, variables, dateRange, offlinePeriods);
  const incidents = generateIncidentTimeline(compressors, offlinePeriods);

  // Time range slider state
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(data.length - 1);

  // Sync slider with dateRange changes
  useEffect(() => {
    if (data.length > 0) {
      setRangeStart(0);
      setRangeEnd(data.length - 1);
    }
  }, [data.length, dateRange.from, dateRange.to]);

  // Calculate visible data based on slider range
  const visibleData = data.slice(rangeStart, rangeEnd + 1);

  // Notify parent of incidents on mount/update
  useEffect(() => {
    if (onIncidentsGenerated) {
      onIncidentsGenerated(incidents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compressors, variables, dateRange.from, dateRange.to]);

  // Fullscreen toggle function
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Determine if we need dual axes
  const hasLeftAxisVariables = variables.some(v => !RIGHT_AXIS_VARIABLES.includes(v));
  const hasRightAxisVariables = variables.some(v => RIGHT_AXIS_VARIABLES.includes(v));

  // Check if we need to show thresholds
  const showSuctionPressureThreshold = variables.includes('Suction Pressure (psi)');
  const showDischargePressureThreshold = variables.includes('Discharge Pressure (psi)');

  // Format date range for display
  const formatDateRange = () => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[400px]">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{showHourly ? 'Time' : 'Date'}: {label}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{formatDateRange()}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const [compressor, variable] = entry.name.split('-');
              return (
                <p key={index} className="text-sm whitespace-nowrap" style={{ color: entry.color }}>
                  {compressor}, {variable}: <span className="font-semibold">{entry.value}</span>
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 pb-2 focus:outline-none" style={{ outline: 'none' }} tabIndex={-1}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Compressor Performance: {formatDateRange()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {compressors.length} compressor{compressors.length > 1 ? 's' : ''} with {variables.length} variable{variables.length > 1 ? 's' : ''} {showHourly ? `over ${numDays} day${numDays > 1 ? 's' : ''} (hourly data)` : `over ${numDays} days (daily data)`}
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

            {/* Offline Period Background Colors */}
            {compressors.map((compressor) => {
              const periods = offlinePeriods[compressor] || [];
              return periods.map((period, idx) => {
                return (
                  <ReferenceArea
                    key={`${compressor}-offline-${idx}`}
                    x1={period.start}
                    x2={period.end}
                    stroke="none"
                    fill="#ef4444"
                    fillOpacity={0.2}
                    ifOverflow="extendDomain"
                  />
                );
              });
            })}

            {/* Threshold Lines */}
            {showSuctionPressureThreshold && (
              <ReferenceLine
                y={150}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="left"
                label={{
                  value: 'Suction Pressure Threshold (150)',
                  position: 'insideTopLeft',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            {showDischargePressureThreshold && (
              <ReferenceLine
                y={1000}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="right"
                label={{
                  value: 'Discharge Pressure Threshold (1000)',
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
              dataKey={showHourly ? "time" : "date"}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={showHourly ? (numDays === 1 ? 1 : 2) : 0}
            />

            {/* Left Y-Axis */}
            {hasLeftAxisVariables && (
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{
                  value: 'Left Axis (Suction Pressure, Gas Flow)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' }
                }}
                width={65}
              />
            )}

            {/* Right Y-Axis */}
            {hasRightAxisVariables && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{
                  value: 'Right Axis (Discharge Pressure, Temperature)',
                  angle: 90,
                  position: 'insideRight',
                  style: { fill: '#10b981', fontSize: 11, textAnchor: 'middle' }
                }}
                width={65}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for each visible compressor-variable combination */}
            {compressors.map((compressor) =>
              variables.map((variable) => {
                const isRightAxis = RIGHT_AXIS_VARIABLES.includes(variable);
                const key = `${compressor}-${variable}`;
                const color = COLORS[key] || '#6b7280';

                // Only render if visible
                if (!visibleSeries[key]) return null;

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={key}
                    yAxisId={isRightAxis ? 'right' : 'left'}
                  />
                );
              })
            )}
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
              left: `${(rangeStart / (data.length - 1)) * 100}%`,
              right: `${100 - (rangeEnd / (data.length - 1)) * 100}%`
            }}
          ></div>

          {/* Start slider */}
          <input
            type="range"
            min="0"
            max={data.length - 1}
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
            max={data.length - 1}
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
            <span>{showHourly ? data[rangeStart]?.time : data[rangeStart]?.date}</span>
            <span>{showHourly ? data[rangeEnd]?.time : data[rangeEnd]?.date}</span>
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => {
            if (rangeEnd < data.length - 1) {
              setRangeEnd(rangeEnd + 1);
            }
          }}
          disabled={rangeEnd === data.length - 1}
          className="flex-shrink-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white transition-colors disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Custom Interactive Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {allSeries.map((series) => {
          const isVisible = visibleSeries[series];
          const color = COLORS[series] || '#6b7280';

          return (
            <button
              key={series}
              onClick={() => toggleSeries(series)}
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
                {series}
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

        input[type="range"]:active::-webkit-slider-thumb {
          cursor: grabbing;
        }

        input[type="range"]:active::-moz-range-thumb {
          cursor: grabbing;
        }
      `}</style>

    </div>
  );
}
