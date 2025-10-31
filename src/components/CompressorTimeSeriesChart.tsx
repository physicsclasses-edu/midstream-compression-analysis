'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

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
  selectedDay: string;
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

// Generate 24-hour time series data
const generateHourlyData = (compressors: string[], variables: string[], selectedDay: string, offlinePeriods: { [key: string]: { start: number; end: number }[] }) => {
  const data = [];

  // Base values for different variables
  const variableBases: { [key: string]: { base: number, variance: number } } = {
    'Discharge Pressure (psi)': { base: 1050, variance: 80 },
    'Suction Pressure (psi)': { base: 170, variance: 25 },
    'Gas Flow Rate (MCFD)': { base: 850, variance: 120 },
    'Gas Temperature (F)': { base: 185, variance: 15 },
  };

  // Generate data for each hour (00:00 to 23:00)
  for (let hour = 0; hour < 24; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;

    const dataPoint: any = {
      time: timeString,
      hour: hour,
    };

    // Generate data for each compressor and variable combination
    compressors.forEach((compressor, compressorIndex) => {
      // Check if compressor is offline during this hour
      const isOffline = offlinePeriods[compressor]?.some(
        period => hour >= period.start && hour <= period.end
      );

      variables.forEach((variable, variableIndex) => {
        const config = variableBases[variable] || { base: 100, variance: 10 };
        const seed = hour * 1000 + compressorIndex * 100 + variableIndex * 10;
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

  return data;
};

export default function CompressorTimeSeriesChart({ compressors, variables, selectedDay, onIncidentsGenerated }: CompressorTimeSeriesChartProps) {
  // Fullscreen state and ref
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Generate data immediately on render (deterministic, so SSR-safe)
  const offlinePeriods = generateOfflinePeriods(compressors);
  const data = generateHourlyData(compressors, variables, selectedDay, offlinePeriods);
  const incidents = generateIncidentTimeline(compressors, offlinePeriods);

  // Notify parent of incidents on mount/update
  useEffect(() => {
    if (onIncidentsGenerated) {
      onIncidentsGenerated(incidents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compressors, variables, selectedDay]);

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[400px]">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Time: {label}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{selectedDay}</p>
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
    <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 pb-2">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Compressor Performance: {selectedDay}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {compressors.length} compressor{compressors.length > 1 ? 's' : ''} with {variables.length} variable{variables.length > 1 ? 's' : ''} over 24 hours
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        {compressors.map((compressor) => {
          const periods = offlinePeriods[compressor] || [];
          return (
            <div key={compressor} className="flex items-center gap-2">
              <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">{compressor}</div>
              {periods.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  (Offline: {periods.map(p => `${p.start}:00-${p.end}:00`).join(', ')})
                </div>
              )}
            </div>
          );
        })}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-200 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offline Period</span>
        </div>
        {(showSuctionPressureThreshold || showDischargePressureThreshold) && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            {showSuctionPressureThreshold && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suction Pressure Threshold (150)</span>
              </div>
            )}
            {showDischargePressureThreshold && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-amber-500" style={{ borderTop: '2px dashed #f59e0b' }}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Discharge Pressure Threshold (1000)</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <div className="w-full mb-0" style={{ height: '600px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 50, left: 20, bottom: 40 }}
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
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            <XAxis
              dataKey="hour"
              label={{ value: 'Time (24-hour format)', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={1}
              tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
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
            <Legend
              wrapperStyle={{ paddingTop: '5px', paddingBottom: '0px', marginBottom: '0px' }}
              iconType="line"
            />

            {/* Render lines for each compressor-variable combination */}
            {compressors.map((compressor) =>
              variables.map((variable) => {
                const isRightAxis = RIGHT_AXIS_VARIABLES.includes(variable);
                const key = `${compressor}-${variable}`;
                const color = COLORS[key] || '#6b7280';

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

    </div>
  );
}
