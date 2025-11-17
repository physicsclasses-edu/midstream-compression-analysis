'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Maximize2, Minimize2, ChevronDown, Settings, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';

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
  availableCompressors: string[];
  dateRange: { from: string; to: string };
  onIncidentsGenerated?: (incidents: Incident[]) => void;
}

// Define which variables use right axis
const RIGHT_AXIS_VARIABLES = ['Discharge Pressure (psi)', 'Gas Temperature (F)'];

// All available variables
const ALL_VARIABLES = [
  'Discharge Pressure (psi)',
  'Suction Pressure (psi)',
  'Gas Flow Rate (MCFD)',
  'Gas Temperature (F)',
];

// Base colors for compressors (matching Time-Series Analysis palette)
const COMPRESSOR_BASE_COLORS: string[] = [
  "#4E79A7", // Blue for first compressor
  "#F28E2B", // Orange for second compressor
  "#E15759", // Red for third compressor
  "#76B7B2", // Teal for fourth compressor
  "#59A14F", // Green for fifth compressor
  "#EDC949", // Yellow for sixth compressor
];

// Generate color for compressor-variable combination
const getCompressorVariableColor = (compressorIndex: number, variableIndex: number): string => {
  const baseColor = COMPRESSOR_BASE_COLORS[compressorIndex % COMPRESSOR_BASE_COLORS.length];

  // For each variable, adjust the color slightly
  // Variable 0: base color
  // Variable 1: lighter shade
  // Variable 2: darker shade
  // Variable 3: even lighter shade

  const adjustments = [0, 0.2, -0.15, 0.35]; // brightness adjustments
  const adjustment = adjustments[variableIndex % adjustments.length];

  return adjustBrightness(baseColor, adjustment);
};

// Adjust brightness of a color
const adjustBrightness = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (channel: number) => {
    const adjusted = Math.round(channel * (1 + amount));
    return Math.min(255, Math.max(0, adjusted));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Utility function to adjust color brightness for theme
const adjustColorBrightness = (color: string, isDark: boolean): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const factor = isDark ? 1.10 : 1.0; // Lighten by 10% in dark mode

  const adjustChannel = (channel: number) => {
    const adjusted = Math.round(channel * factor);
    return Math.min(255, Math.max(0, adjusted));
  };

  const newR = adjustChannel(r);
  const newG = adjustChannel(g);
  const newB = adjustChannel(b);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Utility function to increase saturation
const increaseSaturation = (color: string, percent: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return color;

  const lightness = (max + min) / 2;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const newSaturation = Math.min(1, saturation * (1 + percent / 100));

  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    hue = ((b - r) / delta + 2) / 6;
  } else {
    hue = ((r - g) / delta + 4) / 6;
  }

  const hslToRgb = (h: number, s: number, l: number) => {
    let rNew, gNew, bNew;
    if (s === 0) {
      rNew = gNew = bNew = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      rNew = hue2rgb(p, q, h + 1/3);
      gNew = hue2rgb(p, q, h);
      bNew = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(rNew * 255),
      g: Math.round(gNew * 255),
      b: Math.round(bNew * 255)
    };
  };

  const rgb = hslToRgb(hue, newSaturation, lightness);
  return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
};

// Deterministic random function for SSR compatibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate random offline periods for compressors across 21 days
const generateOfflinePeriods = (compressors: string[]) => {
  const offlinePeriods: { [key: string]: { day: number; start: number; end: number }[] } = {};

  compressors.forEach((compressor, index) => {
    const periods: { day: number; start: number; end: number }[] = [];
    const seed = index * 1000;

    // Generate 2-4 random offline periods per compressor across 21 days
    const numPeriods = Math.floor(seededRandom(seed) * 3) + 2;

    for (let i = 0; i < numPeriods; i++) {
      const day = Math.floor(seededRandom(seed + i * 10) * 21);
      const startHour = Math.floor(seededRandom(seed + i * 10 + 2) * 20);
      const duration = Math.floor(seededRandom(seed + i * 10 + 5) * 3) + 1;
      const endHour = Math.min(startHour + duration, 23);

      const overlaps = periods.some(p =>
        p.day === day && (
          (startHour >= p.start && startHour <= p.end) ||
          (endHour >= p.start && endHour <= p.end)
        )
      );

      if (!overlaps) {
        periods.push({ day, start: startHour, end: endHour });
      }
    }

    offlinePeriods[compressor] = periods;
  });

  return offlinePeriods;
};

// Generate incident timeline
const generateIncidentTimeline = (compressors: string[], offlinePeriods: { [key: string]: { day: number; start: number; end: number }[] }): Incident[] => {
  const incidents: Incident[] = [];
  const startDate = new Date(2024, 0, 1);

  compressors.forEach((compressor) => {
    const periods = offlinePeriods[compressor] || [];
    periods.forEach((period) => {
      const duration = period.end - period.start;
      const incidentDate = new Date(startDate);
      incidentDate.setDate(incidentDate.getDate() + period.day);
      const dateString = `${incidentDate.getMonth() + 1}/${incidentDate.getDate()}`;

      incidents.push({
        startTime: `${dateString} ${period.start.toString().padStart(2, '0')}:00`,
        endTime: `${dateString} ${period.end.toString().padStart(2, '0')}:00`,
        type: 'offline',
        compressor,
        description: `${compressor} - Compressor Offline`,
        duration
      });
    });
  });

  incidents.sort((a, b) => {
    const [aDate, aTime] = a.startTime.split(' ');
    const [bDate, bTime] = b.startTime.split(' ');
    const [aMonth, aDay] = aDate.split('/').map(Number);
    const [bMonth, bDay] = bDate.split('/').map(Number);

    if (aDay !== bDay) return aDay - bDay;

    const aHour = parseInt(aTime.split(':')[0]);
    const bHour = parseInt(bTime.split(':')[0]);
    return aHour - bHour;
  });

  return incidents;
};

// Generate 21 days of hourly time series data
const generateHourlyData = (compressors: string[], variables: string[], dateRange: { from: string; to: string }, offlinePeriods: { [key: string]: { day: number; start: number; end: number }[] }) => {
  const data = [];

  const startDate = dateRange.from ? new Date(dateRange.from) : new Date(2024, 0, 1);
  const endDate = dateRange.to ? new Date(dateRange.to) : new Date(2024, 0, 22);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const variableBases: { [key: string]: { base: number, variance: number } } = {
    'Discharge Pressure (psi)': { base: 1050, variance: 80 },
    'Suction Pressure (psi)': { base: 170, variance: 25 },
    'Gas Flow Rate (MCFD)': { base: 850, variance: 120 },
    'Gas Temperature (F)': { base: 185, variance: 15 },
  };

  for (let day = 0; day <= totalDays; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      currentDate.setHours(hour);
      const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
      const timeString = `${hour.toString().padStart(2, '0')}:00`;

      const dataPoint: any = {
        day,
        hour,
        date: dateString,
        time: timeString,
        dateTime: `${dateString} ${timeString}`,
        timestamp: new Date(2024, 0, 1 + day, hour).toISOString(),
        index: day * 24 + hour,
      };

      compressors.forEach((compressor, compressorIndex) => {
        const isOffline = offlinePeriods[compressor]?.some(
          period => day === period.day && hour >= period.start && hour <= period.end
        );

        variables.forEach((variable, variableIndex) => {
          const config = variableBases[variable] || { base: 100, variance: 10 };
          const seed = (day * 24 + hour) * 1000 + compressorIndex * 100 + variableIndex * 10;
          const variance = (seededRandom(seed) - 0.5) * config.variance;

          let value = 0;

          if (isOffline) {
            value = 0;
          } else {
            let hourlyFactor = 1.0;
            if (hour >= 6 && hour <= 18) {
              hourlyFactor = 1.05 + seededRandom(seed + 1) * 0.1;
            } else {
              hourlyFactor = 0.95 - seededRandom(seed + 2) * 0.05;
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

export default function CompressorTimeSeriesChart({ availableCompressors, dateRange, onIncidentsGenerated }: CompressorTimeSeriesChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fullscreen state and ref
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Compressor selection (multi-select)
  const [selectedCompressors, setSelectedCompressors] = useState<string[]>(
    availableCompressors[0] ? [availableCompressors[0]] : []
  );
  const [isCompressorDropdownOpen, setIsCompressorDropdownOpen] = useState(false);
  const compressorDropdownRef = useRef<HTMLDivElement>(null);

  // Variable visibility state - only Suction and Discharge Pressure visible by default
  const [visibleVariables, setVisibleVariables] = useState<{[key: string]: boolean}>(() =>
    ALL_VARIABLES.reduce((acc, variable) => ({
      ...acc,
      [variable]: variable === 'Suction Pressure (psi)' || variable === 'Discharge Pressure (psi)'
    }), {})
  );

  // Hover state
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);

  // Mouse zoom/pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<number | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Chart style customization state
  const defaultChartStyles = {
    axisTitleSize: 11,
    tickTextSize: 11,
    axisLineWidth: 1,
    gridOpacity: 0.2,
    chartLineWidth: 2,
    legendSize: 14,
    legendPosition: 'center' as 'left' | 'center' | 'right',
  };

  const [chartStyles, setChartStyles] = useState(defaultChartStyles);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);
  const stylePanelRef = useRef<HTMLDivElement>(null);

  // Log scale state for Y axes
  const [leftLogScale, setLeftLogScale] = useState(false);
  const [rightLogScale, setRightLogScale] = useState(false);

  // Reset chart styles to default
  const resetChartStyles = () => {
    setChartStyles(defaultChartStyles);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compressorDropdownRef.current && !compressorDropdownRef.current.contains(event.target as Node)) {
        setIsCompressorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close style panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stylePanelRef.current && !stylePanelRef.current.contains(event.target as Node)) {
        setIsStylePanelOpen(false);
      }
    };
    if (isStylePanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStylePanelOpen]);

  // Toggle compressor selection
  const toggleCompressor = (compressor: string) => {
    setSelectedCompressors(prev =>
      prev.includes(compressor)
        ? prev.filter(c => c !== compressor)
        : [...prev, compressor]
    );
  };

  // Toggle variable visibility
  const toggleVariable = (variable: string) => {
    setVisibleVariables(prev => ({ ...prev, [variable]: !prev[variable] }));
  };

  // Get color for a specific series (compressor-variable combination)
  const getSeriesColor = (compressor: string, variable: string, isHovered: boolean = false): string => {
    const compressorIndex = availableCompressors.indexOf(compressor);
    const variableIndex = ALL_VARIABLES.indexOf(variable);
    const baseColor = getCompressorVariableColor(compressorIndex, variableIndex);

    if (!mounted) return baseColor;

    const isDark = resolvedTheme === 'dark' || theme === 'dark';
    let adjustedColor = adjustColorBrightness(baseColor, isDark);

    if (isHovered) {
      adjustedColor = increaseSaturation(adjustedColor, 10);
    }

    return adjustedColor;
  };

  // Calculate total days
  const calculateTotalDays = () => {
    if (!dateRange.from || !dateRange.to) return 21;
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalDays = calculateTotalDays();

  // Get visible variables - memoized to prevent infinite loops
  const visibleVariablesList = useMemo(
    () => ALL_VARIABLES.filter(v => visibleVariables[v]),
    [JSON.stringify(visibleVariables)]
  );

  // Generate data - memoized to prevent infinite loops
  const { data, incidents } = useMemo(() => {
    const offlinePeriods = generateOfflinePeriods(selectedCompressors);
    const generatedData = generateHourlyData(selectedCompressors, visibleVariablesList, dateRange, offlinePeriods);
    const generatedIncidents = generateIncidentTimeline(selectedCompressors, offlinePeriods);
    return { data: generatedData, incidents: generatedIncidents };
  }, [selectedCompressors.join(','), visibleVariablesList.join(','), dateRange.from, dateRange.to]);

  // Time range slider state
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalDays);

  const startHourIndex = rangeStart * 24;
  const endHourIndex = (rangeEnd + 1) * 24;
  const visibleData = data.slice(startHourIndex, endHourIndex);

  useEffect(() => {
    setRangeStart(0);
    setRangeEnd(totalDays);
  }, [totalDays]);

  useEffect(() => {
    if (onIncidentsGenerated && incidents.length > 0) {
      onIncidentsGenerated(incidents);
    }
  }, [incidents, onIncidentsGenerated]);

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.shiftKey) return;

    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = 0.1;
    const currentRange = rangeEnd - rangeStart;
    const zoomAmount = Math.max(1, Math.round(currentRange * zoomFactor));

    if (e.deltaY < 0) {
      if (currentRange > 2) {
        const newStart = rangeStart + zoomAmount;
        const newEnd = rangeEnd - zoomAmount;
        if (newEnd > newStart) {
          setRangeStart(newStart);
          setRangeEnd(newEnd);
        }
      }
    } else {
      const newStart = Math.max(0, rangeStart - zoomAmount);
      const newEnd = Math.min(totalDays, rangeEnd + zoomAmount);
      setRangeStart(newStart);
      setRangeEnd(newEnd);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || panStart === null || !chartAreaRef.current) return;

    const rect = chartAreaRef.current.getBoundingClientRect();
    const chartWidth = rect.width;
    const deltaX = e.clientX - panStart;
    const currentRange = rangeEnd - rangeStart;

    const panAmount = Math.round((deltaX / chartWidth) * currentRange);

    if (panAmount !== 0) {
      const newStart = Math.max(0, rangeStart - panAmount);
      const newEnd = Math.min(totalDays, rangeEnd - panAmount);

      if (newEnd - newStart === currentRange) {
        setRangeStart(newStart);
        setRangeEnd(newEnd);
        setPanStart(e.clientX);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning]);

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

  const hasLeftAxisVariables = visibleVariablesList.some(v => !RIGHT_AXIS_VARIABLES.includes(v));
  const hasRightAxisVariables = visibleVariablesList.some(v => RIGHT_AXIS_VARIABLES.includes(v));

  const showSuctionPressureThreshold = visibleVariablesList.includes('Suction Pressure (psi)');
  const showDischargePressureThreshold = visibleVariablesList.includes('Discharge Pressure (psi)');

  const formatDateRange = () => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const abbreviateCompressor = (compressor: string): string => {
    if (compressor === 'Rock Creek 1') return 'RC 1';
    if (compressor === 'Rock Creek 2') return 'RC 2';
    return compressor;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const displayLabel = dataPoint.dateTime || label;

      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[400px]">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{displayLabel}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{formatDateRange()}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const [compressor, variable] = entry.name.split('-');
              const abbreviatedCompressor = abbreviateCompressor(compressor);
              return (
                <p key={index} className="text-sm whitespace-nowrap" style={{ color: entry.color }}>
                  {abbreviatedCompressor}, {variable}: <span className="font-semibold">{entry.value}</span>
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
    <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 pb-2 focus:outline-none overflow-auto" style={{ outline: 'none' }} tabIndex={-1}>
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Compressor Performance:
            </h3>
            {/* Multi-select Compressor Dropdown */}
            <div className="relative" ref={compressorDropdownRef}>
              <button
                onClick={() => setIsCompressorDropdownOpen(!isCompressorDropdownOpen)}
                className="px-4 py-2 text-base font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                {selectedCompressors.length > 0
                  ? selectedCompressors.map(c => abbreviateCompressor(c)).join(', ')
                  : 'Select compressors'}
                <ChevronDown className={`w-4 h-4 transition-transform ${isCompressorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCompressorDropdownOpen && (
                <div className="absolute z-30 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto min-w-[200px]">
                  {availableCompressors.map((compressor, index) => (
                    <button
                      key={compressor}
                      onClick={() => toggleCompressor(compressor)}
                      className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-2 ${
                        index === 0 ? 'rounded-t-lg' : ''
                      } ${
                        index === availableCompressors.length - 1 ? 'rounded-b-lg' : ''
                      } ${
                        selectedCompressors.includes(compressor)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompressors.includes(compressor)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      {compressor}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {selectedCompressors.length} compressor{selectedCompressors.length > 1 ? 's' : ''} with {visibleVariablesList.length} variable{visibleVariablesList.length > 1 ? 's' : ''} over {totalDays} days • <span className="italic">(Shift+Scroll to zoom • Drag to pan)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chart Settings Button */}
          <div className="relative" ref={stylePanelRef}>
            <button
              onClick={() => setIsStylePanelOpen(!isStylePanelOpen)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title="Chart Style Settings"
            >
              <Settings className="w-4 h-4" />
              Chart Style
            </button>

            {/* Settings Panel Dropdown */}
            {isStylePanelOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[320px] z-50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Chart Style Settings</h4>
                    <button
                      onClick={resetChartStyles}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                      title="Reset to Default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  {/* Axis Title Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Axis Title Size: {chartStyles.axisTitleSize}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="20"
                      value={chartStyles.axisTitleSize}
                      onChange={(e) => setChartStyles({ ...chartStyles, axisTitleSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Tick Text Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tick Text Size: {chartStyles.tickTextSize}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="16"
                      value={chartStyles.tickTextSize}
                      onChange={(e) => setChartStyles({ ...chartStyles, tickTextSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Axis Line Width */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Axis Line Width: {chartStyles.axisLineWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={chartStyles.axisLineWidth}
                      onChange={(e) => setChartStyles({ ...chartStyles, axisLineWidth: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Grid Opacity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Grid Opacity: {Math.round(chartStyles.gridOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={chartStyles.gridOpacity}
                      onChange={(e) => setChartStyles({ ...chartStyles, gridOpacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Chart Line Width */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chart Line Width: {chartStyles.chartLineWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={chartStyles.chartLineWidth}
                      onChange={(e) => setChartStyles({ ...chartStyles, chartLineWidth: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Legend Font Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Legend Font Size: {chartStyles.legendSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      value={chartStyles.legendSize}
                      onChange={(e) => setChartStyles({ ...chartStyles, legendSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Legend Position */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Legend Position
                    </label>
                    <select
                      value={chartStyles.legendPosition}
                      onChange={(e) => setChartStyles({ ...chartStyles, legendPosition: e.target.value as 'left' | 'center' | 'right' })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

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
      <div
        ref={chartAreaRef}
        className="w-full outline-none relative"
        style={{
          height: '500px',
          cursor: isPanning ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Log Scale Toggle - Left Y-Axis */}
        {hasLeftAxisVariables && (
          <button
            onClick={() => setLeftLogScale(!leftLogScale)}
            className={`absolute z-10 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              leftLogScale ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            style={{ left: '0px', top: '8px' }}
            title="Toggle logarithmic scale for left Y-axis"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                leftLogScale ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}

        {/* Log Scale Toggle - Right Y-Axis */}
        {hasRightAxisVariables && (
          <button
            onClick={() => setRightLogScale(!rightLogScale)}
            className={`absolute z-10 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              rightLogScale ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            style={{ right: '0px', top: '8px' }}
            title="Toggle logarithmic scale for right Y-axis"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                rightLogScale ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleData}
            margin={{ top: 20, right: 5, left: 5, bottom: 0 }}
          >
            <defs>
              <filter id="whiteGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feFlood floodColor="#FFFFFF" floodOpacity="0.5" result="glowColor" />
                <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={chartStyles.gridOpacity} />

            {/* Threshold Lines */}
            {showSuctionPressureThreshold && (
              <ReferenceLine
                y={150}
                stroke="#c026d3"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="left"
                label={{
                  value: 'Suction Pressure Threshold (150)',
                  position: 'insideTopLeft',
                  fill: '#c026d3',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            {showDischargePressureThreshold && (
              <ReferenceLine
                y={1000}
                stroke="#06b6d4"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="right"
                label={{
                  value: 'Discharge Pressure Threshold (1000)',
                  position: 'insideRight',
                  dy: -15,
                  dx: -10,
                  fill: '#06b6d4',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            <XAxis
              dataKey="index"
              stroke="#6b7280"
              strokeWidth={chartStyles.axisLineWidth}
              tick={{ fill: '#6b7280', fontSize: chartStyles.tickTextSize }}
              angle={-45}
              textAnchor="end"
              height={80}
              ticks={visibleData.filter(d => d.hour === 0 && d.day % 3 === 0).map(d => d.index)}
              tickFormatter={(value) => {
                const dataPoint = visibleData.find(d => d.index === value);
                return dataPoint?.date || '';
              }}
            />

            {hasLeftAxisVariables && (
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                strokeWidth={chartStyles.axisLineWidth}
                tick={{ fill: '#6b7280', fontSize: chartStyles.tickTextSize }}
                width={65}
                scale={leftLogScale ? 'log' : 'auto'}
                domain={leftLogScale ? [1, 'auto'] : [0, 'auto']}
                allowDataOverflow={leftLogScale}
                label={{ value: '(Suction Pressure, Gas Flow)', angle: -90, position: 'center', dx: -20, style: { fill: '#6b7280', fontSize: chartStyles.axisTitleSize, textAnchor: 'middle' } }}
              />
            )}

            {hasRightAxisVariables && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                strokeWidth={chartStyles.axisLineWidth}
                tick={{ fill: '#6b7280', fontSize: chartStyles.tickTextSize }}
                width={65}
                scale={rightLogScale ? 'log' : 'auto'}
                domain={rightLogScale ? [1, 'auto'] : [0, 'auto']}
                allowDataOverflow={rightLogScale}
                label={{ value: '(Discharge Pressure, Temperature)', angle: 90, position: 'center', dx: 20, style: { fill: '#6b7280', fontSize: chartStyles.axisTitleSize, textAnchor: 'middle' } }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for each visible compressor-variable combination */}
            {selectedCompressors.map((compressor) =>
              visibleVariablesList.map((variable) => {
                const isRightAxis = RIGHT_AXIS_VARIABLES.includes(variable);
                const key = `${compressor}-${variable}`;
                const isHovered = hoveredVariable === variable;
                const baseOpacity = 0.85;
                const opacity = hoveredVariable === null ? baseOpacity : isHovered ? 1 : 0.2;
                const strokeWidth = isHovered ? chartStyles.chartLineWidth + 1 : chartStyles.chartLineWidth;
                const strokeColor = getSeriesColor(compressor, variable, isHovered);

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    dot={false}
                    activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2, fill: strokeColor }}
                    name={key}
                    yAxisId={isRightAxis ? 'right' : 'left'}
                    filter={isHovered ? 'url(#whiteGlow)' : undefined}
                  />
                );
              })
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time Range Slider */}
      <div className="mt-6" style={{ marginLeft: '70px', marginRight: '70px' }}>
        <div className="relative" style={{ paddingTop: '0px', paddingBottom: '20px' }}>
          <div className="absolute top-0 w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

          <div
            className="absolute top-0 h-1 bg-blue-500 dark:bg-blue-400 rounded-full pointer-events-none"
            style={{
              left: `${(rangeStart / totalDays) * 100}%`,
              width: `${((rangeEnd - rangeStart) / totalDays) * 100}%`,
            }}
          />

          <input
            type="range"
            min="0"
            max={totalDays}
            value={rangeStart}
            onChange={(e) => {
              const newStart = parseInt(e.target.value);
              if (newStart < rangeEnd) {
                setRangeStart(newStart);
              }
            }}
            className="range-slider range-slider-start absolute w-full"
            style={{ zIndex: rangeStart > rangeEnd - 2 ? 5 : 3, top: 0 }}
          />

          <input
            type="range"
            min="0"
            max={totalDays}
            value={rangeEnd}
            onChange={(e) => {
              const newEnd = parseInt(e.target.value);
              if (newEnd > rangeStart) {
                setRangeEnd(newEnd);
              }
            }}
            className="range-slider range-slider-end absolute w-full"
            style={{ zIndex: 4, top: 0 }}
          />

          <span
            className="absolute text-xs font-medium text-gray-700 dark:text-gray-300"
            style={{
              left: `${(rangeStart / totalDays) * 100}%`,
              top: '24px',
              transform: 'translateX(-50%)'
            }}
          >
            {data[rangeStart * 24]?.date || ''}
          </span>
          <span
            className="absolute text-xs font-medium text-gray-700 dark:text-gray-300"
            style={{
              left: `${(rangeEnd / totalDays) * 100}%`,
              top: '24px',
              transform: 'translateX(-50%)'
            }}
          >
            {data[rangeEnd * 24]?.date || ''}
          </span>
        </div>
      </div>

      {/* Custom Interactive Legend - Variables Only */}
      <div className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-6 ${
        chartStyles.legendPosition === 'left' ? 'justify-start' :
        chartStyles.legendPosition === 'right' ? 'justify-end' :
        'justify-center'
      }`}>
        {ALL_VARIABLES.map((variable) => {
          const isVisible = visibleVariables[variable];
          const isHovered = hoveredVariable === variable;
          const isRightAxis = RIGHT_AXIS_VARIABLES.includes(variable);

          // Show first compressor's color as representative
          const representativeColor = getSeriesColor(selectedCompressors[0] || availableCompressors[0], variable, isHovered);

          return (
            <button
              key={variable}
              onClick={() => toggleVariable(variable)}
              onMouseEnter={() => setHoveredVariable(variable)}
              onMouseLeave={() => setHoveredVariable(null)}
              className="flex items-center gap-2 cursor-pointer transition-all"
              style={{
                filter: isHovered && isVisible ? 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' : 'none'
              }}
            >
              <svg width="18" height="10" className="flex-shrink-0">
                <line
                  x1="0"
                  y1="5"
                  x2="5"
                  y2="5"
                  stroke={representativeColor}
                  strokeWidth={isHovered && isVisible ? "2.5" : "2"}
                  opacity={isVisible ? 0.85 : 0.3}
                />
                <circle
                  cx="9"
                  cy="5"
                  r="3"
                  fill="none"
                  stroke={representativeColor}
                  strokeWidth={isHovered && isVisible ? "2.5" : "2"}
                  opacity={isVisible ? 0.85 : 0.3}
                />
                <line
                  x1="13"
                  y1="5"
                  x2="18"
                  y2="5"
                  stroke={representativeColor}
                  strokeWidth={isHovered && isVisible ? "2.5" : "2"}
                  opacity={isVisible ? 0.85 : 0.3}
                />
              </svg>
              <span
                style={{
                  color: isVisible ? representativeColor : representativeColor,
                  opacity: isVisible ? 1 : 0.4,
                  textDecoration: isVisible ? 'none' : 'line-through',
                  fontSize: `${chartStyles.legendSize}px`
                }}
              >
                {variable}<sup>{isRightAxis ? 'R' : 'L'}</sup>
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

        /* Range Slider Styles */
        .range-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          pointer-events: none;
          height: 20px;
        }

        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          margin-top: -9px;
          background: #3b82f6;
        }

        .range-slider::-moz-range-thumb {
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          background: #3b82f6;
        }

        .range-slider-start::-webkit-slider-thumb {
          background: #3b82f6;
        }

        .range-slider-start::-moz-range-thumb {
          background: #3b82f6;
        }

        .range-slider-end::-webkit-slider-thumb {
          background: #3b82f6;
        }

        .range-slider-end::-moz-range-thumb {
          background: #3b82f6;
        }

        .range-slider::-webkit-slider-runnable-track {
          height: 0;
          background: transparent;
        }

        .range-slider::-moz-range-track {
          height: 0;
          background: transparent;
        }

        :global(.dark) .range-slider::-webkit-slider-thumb {
          background: #60a5fa;
        }

        :global(.dark) .range-slider::-moz-range-thumb {
          background: #60a5fa;
        }
      `}</style>
    </div>
  );
}
