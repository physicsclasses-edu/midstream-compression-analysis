'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, ChevronDown, Settings, RotateCcw, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';

interface TimeSeriesChartProps {
  well: string;
  wells?: string[];
  onWellChange?: (well: string) => void;
  metrics: string[];
  dateRange: { from: string; to: string };
  // Multi-select props
  mode?: 'single' | 'multi';
  selectedWells?: string[];
  availableWells?: string[];
  onModeChange?: (mode: 'single' | 'multi') => void;
  onSelectedWellsChange?: (wells: string[]) => void;
  // Multi-well analysis props
  onBackToMap?: () => void;
  isMultiWellAnalysis?: boolean;
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

// Base color palette for different metrics
const BASE_METRIC_COLORS: string[] = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC949", "#AF7AA1", "#FF9DA7", "#9C755F", "#BAB0AC", "#64748B"
];

// Mapping of metrics to colors
const METRIC_COLOR_MAP: { [key: string]: number } = {
  'Line Pressure': 0,
  'Gas Injection Pressure': 1,
  'Gas Injection Rate': 2,
  'Choke': 3,
  'Casing Pressure': 4,
  'Tubing Pressure': 5,
  'Oil Production Rate': 6,
  'Water Production Rate': 7,
  'Gas Production Rate': 8,
  'Predicted Oil Production Rate': 9,
  'Predicted Oil Production Rate (BTE)': 10,
};

// Utility function to adjust color brightness and vibrancy
const adjustColorBrightness = (color: string, isDark: boolean): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const factor = isDark ? 1.15 : 1.05; // More vibrant in both modes

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

  if (delta === 0) return color; // Gray color, no saturation to increase

  const lightness = (max + min) / 2;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  // Increase saturation
  const newSaturation = Math.min(1, saturation * (1 + percent / 100));

  // Convert back to RGB
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

// Generate realistic time-series data with hourly granularity
const generateTimeSeriesData = (metrics: string[], well: string, dateRange: { from: string; to: string }) => {
  const data = [];

  // Use actual date range from calendar
  const startDate = dateRange.from ? new Date(dateRange.from) : new Date(2024, 0, 1);
  const endDate = dateRange.to ? new Date(dateRange.to) : new Date(2024, 0, 22);

  // Calculate total days from date range
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Base values for different metrics
  const metricBases: { [key: string]: { base: number, unit: string, variance: number } } = {
    'Line Pressure': { base: 155, unit: 'psi', variance: 30 },
    'Gas Injection Pressure': { base: 950, unit: 'psi', variance: 150 },
    'Gas Injection Rate': { base: 2.5, unit: 'MMscf/d', variance: 0.5 },
    'Choke': { base: 45, unit: '%', variance: 10 },
    'Casing Pressure': { base: 950, unit: 'psi', variance: 60 },
    'Tubing Pressure': { base: 780, unit: 'psi', variance: 40 },
    'Oil Production Rate': { base: 145, unit: 'BBL/day', variance: 20 },
    'Water Production Rate': { base: 85, unit: 'BBL/day', variance: 15 },
    'Gas Production Rate': { base: 3.2, unit: 'MMscf/d', variance: 0.4 },
    'Predicted Oil Production Rate': { base: 145, unit: 'BBL/day', variance: 12 },
    'Predicted Oil Production Rate (BTE)': { base: 145, unit: 'BBL/day', variance: 12 },
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

        // Special handling for Predicted Oil Production Rate metrics
        if (metric === 'Predicted Oil Production Rate' || metric === 'Predicted Oil Production Rate (BTE)') {
          const actualValue = oilProductionValues[hourKey];
          if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
            value = 0;
          } else {
            // BTE is the baseline prediction
            if (metric === 'Predicted Oil Production Rate (BTE)') {
              if (day < 3 || day >= 10) {
                value = actualValue + (seededRandom((day * 24 + hour) * 200 + 50) - 0.5) * 8;
              } else {
                value = actualValue + (seededRandom((day * 24 + hour) * 200 + 100) - 0.5) * 20;
              }
            } else {
              // Predicted Oil Production Rate is consistently 10-12% better than BTE
              if (day < 3 || day >= 10) {
                const baseValue = actualValue + (seededRandom((day * 24 + hour) * 200 + 50) - 0.5) * 8;
                value = baseValue * 1.11; // 11% improvement
              } else {
                const baseValue = actualValue + (seededRandom((day * 24 + hour) * 200 + 100) - 0.5) * 20;
                value = baseValue * 1.11; // 11% improvement
              }
            }
          }
        } else {
          if ((day >= 3 && day <= 4) || (day >= 7 && day <= 9)) {
            value = 0;
          } else {
            // Special handling for Line Pressure to avoid constant decline
            if (metric === 'Line Pressure') {
              if (day < 7) {
                // Slight decline in natural phase
                const declineRate = 0.015;
                value = config.base * (1 - declineRate * (day + hour / 24));
              } else if (day >= 9) {
                // Stable with slight improvement in continuous phase
                const daysInContinuous = day - 9 + hour / 24;
                const improvementFactor = 1.1;
                value = config.base * improvementFactor * (1 - 0.002 * daysInContinuous); // Much slower decline
              }
            } else if (metric === 'Gas Injection Pressure') {
              // Special handling for Gas Injection Pressure to avoid constant decline
              if (day < 7) {
                // Slight decline in natural phase
                const declineRate = 0.015;
                value = config.base * (1 - declineRate * (day + hour / 24));
              } else if (day >= 9) {
                // Stable with slight improvement in continuous phase
                const daysInContinuous = day - 9 + hour / 24;
                const improvementFactor = 1.12;
                value = config.base * improvementFactor * (1 - 0.003 * daysInContinuous); // Much slower decline
              }
            } else {
              // Regular behavior for other metrics
              if (day < 7) {
                const declineRate = 0.02;
                value = config.base * (1 - declineRate * (day + hour / 24));
              } else if (day >= 9) {
                const daysInContinuous = day - 9 + hour / 24;
                const improvementFactor = 1.15;
                value = config.base * improvementFactor * (1 - 0.007 * daysInContinuous);
              }
            }

            const metricIndex = Object.keys(metricBases).indexOf(metric);
            const variance = (seededRandom((day * 24 + hour) * 1000 + metricIndex * 100) - 0.5) * config.variance;
            value += variance;

            if (metric.includes('Production Rate') && metric !== 'Predicted Oil Production Rate' && metric !== 'Predicted Oil Production Rate (BTE)' && day >= 9) {
              const boostFactor = metric.includes('Oil') ? 1.12 : 1.08;
              value *= boostFactor;
            }
          }
        }

        // Apply minimum and maximum constraints for specific metrics
        let minValue = 0;
        let maxValue = Infinity;

        // Line Pressure: 100-200 (except shut-in = 0)
        if (metric === 'Line Pressure' && value > 0) {
          minValue = 100;
          maxValue = 200;
        }

        // Gas Injection Pressure: 700-1200 (except shut-in = 0)
        if (metric === 'Gas Injection Pressure' && value > 0) {
          minValue = 700;
          maxValue = 1200;
        }

        dataPoint[metric] = Math.min(maxValue, Math.max(minValue, Number(value.toFixed(2))));
      });

      data.push(dataPoint);
    }
  }

  return data;
};

export default function TimeSeriesChart({
  well,
  wells,
  onWellChange,
  metrics,
  dateRange,
  mode = 'single',
  selectedWells = [],
  availableWells = [],
  onModeChange,
  onSelectedWellsChange,
  onBackToMap,
  isMultiWellAnalysis = false
}: TimeSeriesChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Well dropdown state
  const [isWellDropdownOpen, setIsWellDropdownOpen] = useState(false);
  const wellDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate total days from date range
  const calculateTotalDays = () => {
    if (!dateRange.from || !dateRange.to) return 21;
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalDays = calculateTotalDays();
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalDays);

  // Legend toggle state - track which metrics are visible
  // Only Line Pressure and Gas Injection Pressure are visible by default
  const [visibleMetrics, setVisibleMetrics] = useState<{[key: string]: boolean}>(() =>
    metrics.reduce((acc, metric) => ({
      ...acc,
      [metric]: metric === 'Line Pressure' || metric === 'Gas Injection Pressure'
    }), {})
  );

  // Hover state - track which metric is being hovered
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

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
    chartLineWidth: 2.5,
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

  // Generate data immediately on render (deterministic, so SSR-safe)
  const data = generateTimeSeriesData(metrics, well, dateRange);

  // Handle SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get adjusted color based on theme
  const getMetricColor = (metric: string, isHovered: boolean = false): string => {
    const colorIndex = METRIC_COLOR_MAP[metric] ?? 0;
    const baseColor = BASE_METRIC_COLORS[colorIndex];

    if (!mounted) return baseColor; // Return base color during SSR

    const isDark = resolvedTheme === 'dark' || theme === 'dark';
    let adjustedColor = adjustColorBrightness(baseColor, isDark);

    // Increase base saturation for all lines to make them more vibrant
    adjustedColor = increaseSaturation(adjustedColor, 25);

    // Increase saturation even more on hover
    if (isHovered) {
      adjustedColor = increaseSaturation(adjustedColor, 15);
    }

    return adjustedColor;
  };

  // Update visible metrics when metrics prop changes
  // Only Line Pressure and Gas Injection Pressure are visible by default
  useEffect(() => {
    setVisibleMetrics(metrics.reduce((acc, metric) => ({
      ...acc,
      [metric]: metric === 'Line Pressure' || metric === 'Gas Injection Pressure'
    }), {}));
  }, [metrics.join(',')]);

  // Toggle metric visibility
  const toggleMetric = (metric: string) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  // Update range when dateRange changes
  useEffect(() => {
    // Initialize range to full date range when totalDays changes
    setRangeStart(0);
    setRangeEnd(totalDays);
  }, [totalDays]);

  useEffect(() => {
    if (dateRange.from && dateRange.to && data.length > 0) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const startDate = new Date(data[0].timestamp);

      // Calculate day indices based on date range
      const startIndex = Math.max(0, Math.floor((fromDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
      const endIndex = Math.min(totalDays, Math.ceil((toDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));

      if (startIndex <= endIndex && startIndex >= 0 && endIndex <= totalDays) {
        setRangeStart(startIndex);
        setRangeEnd(endIndex);
      }
    }
  }, [dateRange, data.length, totalDays]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wellDropdownRef.current && !wellDropdownRef.current.contains(event.target as Node)) {
        setIsWellDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Mouse wheel zoom handler - only activates with Shift key
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only zoom if Shift key is pressed
    if (!e.shiftKey) return;

    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = 0.1;
    const currentRange = rangeEnd - rangeStart;
    const zoomAmount = Math.max(1, Math.round(currentRange * zoomFactor));

    if (e.deltaY < 0) {
      // Zoom in
      if (currentRange > 2) {
        const newStart = rangeStart + zoomAmount;
        const newEnd = rangeEnd - zoomAmount;
        if (newEnd > newStart) {
          setRangeStart(newStart);
          setRangeEnd(newEnd);
        }
      }
    } else {
      // Zoom out
      const newStart = Math.max(0, rangeStart - zoomAmount);
      const newEnd = Math.min(totalDays, rangeEnd + zoomAmount);
      setRangeStart(newStart);
      setRangeEnd(newEnd);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left mouse button
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

    // Calculate pan amount based on mouse movement
    const panAmount = Math.round((deltaX / chartWidth) * currentRange);

    if (panAmount !== 0) {
      const newStart = Math.max(0, rangeStart - panAmount);
      const newEnd = Math.min(totalDays, rangeEnd - panAmount);

      // Only pan if both bounds are valid
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

  // Global mouse up listener for panning
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
      <div ref={chartContainerRef} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none overflow-auto" style={{ outline: 'none' }} tabIndex={-1}>
      <div className="mb-6">
        {/* Top row: Title/Well and Buttons */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Back button for multi-well analysis */}
            {isMultiWellAnalysis && onBackToMap && (
              <button
                onClick={onBackToMap}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Back to Map"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Time-Series Analysis:
            </h3>

            {wells && wells.length > 0 && (
              <>
                {/* Single Well Dropdown */}
                {mode === 'single' && onWellChange && (
                  <div className="relative" ref={wellDropdownRef}>
                    <button
                      onClick={() => setIsWellDropdownOpen(!isWellDropdownOpen)}
                      className="px-4 py-2 text-base font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      {well}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isWellDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isWellDropdownOpen && (
                      <div className="absolute z-30 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto min-w-[200px]">
                        {wells.map((wellOption, index) => (
                          <button
                            key={wellOption}
                            onClick={() => {
                              onWellChange(wellOption);
                              setIsWellDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left transition-colors ${
                              index === 0 ? 'rounded-t-lg' : ''
                            } ${
                              index === wells.length - 1 ? 'rounded-b-lg' : ''
                            } ${
                              well === wellOption
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {wellOption}
                            {well === wellOption && (
                              <span className="ml-2 text-blue-500 dark:text-blue-400">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Well Dropdown (for isMultiWellAnalysis) */}
                {isMultiWellAnalysis && onSelectedWellsChange && (
                  <div className="relative" ref={wellDropdownRef}>
                    <button
                      onClick={() => setIsWellDropdownOpen(!isWellDropdownOpen)}
                      className="px-4 py-2 text-base font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      {selectedWells.length > 0 ? `${selectedWells.length} Wells Selected` : 'Select Wells'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isWellDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isWellDropdownOpen && (
                      <div className="absolute z-30 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto min-w-[250px]">
                        {availableWells.map((wellOption, index) => {
                          const isSelected = selectedWells.includes(wellOption);
                          return (
                            <button
                              key={wellOption}
                              onClick={() => {
                                if (isSelected) {
                                  // Deselect well - but keep at least one well selected
                                  if (selectedWells.length > 1) {
                                    onSelectedWellsChange(selectedWells.filter(w => w !== wellOption));
                                  }
                                } else {
                                  // Select well
                                  onSelectedWellsChange([...selectedWells, wellOption]);
                                }
                              }}
                              className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-2 ${
                                index === 0 ? 'rounded-t-lg' : ''
                              } ${
                                index === availableWells.length - 1 ? 'rounded-b-lg' : ''
                              } ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                              <span className="flex-1">{wellOption}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
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

        {/* Bottom row: Showing text and Phase Legend */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {Object.values(visibleMetrics).filter(v => v).length} metric{Object.values(visibleMetrics).filter(v => v).length > 1 ? 's' : ''} over {totalDays} days with phase transitions • <span className="italic">(Shift+Scroll to zoom • Drag to pan)</span>
          </p>
          {/* Phase Legend - Right aligned */}
          {!isMultiWellAnalysis && (
            <div className="flex items-center gap-3 text-sm whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#bbf7d0] dark:bg-[#34d399] dark:opacity-25"></div>
                <span className="text-gray-700 dark:text-gray-300">Natural Flow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#fee2e2] dark:bg-[#f87171] dark:opacity-25"></div>
                <span className="text-gray-700 dark:text-gray-300">Shut-in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#dbeafe] dark:bg-[#60a5fa] dark:opacity-25"></div>
                <span className="text-gray-700 dark:text-gray-300">Continuous Gas Lift</span>
              </div>
            </div>
          )}
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
        {hasLeftAxisMetrics && (
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
        {hasRightAxisMetrics && (
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
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feFlood floodColor="#FFFFFF" floodOpacity="0.8" result="glowColor" />
                <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={chartStyles.gridOpacity} />

            {/* Background phases - Matching card colors */}
            {mounted && visibleData.length > 0 && (() => {
              const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';
              const phaseColors = isDarkMode
                ? { natural: '#34d399', shutin: '#f87171', continuous: '#60a5fa', opacity: 0.25 }
                : { natural: '#bbf7d0', shutin: '#fee2e2', continuous: '#dbeafe', opacity: 1.0 };

              // Get visible range boundaries
              const firstVisibleIndex = visibleData[0]?.index || 0;
              const lastVisibleIndex = visibleData[visibleData.length - 1]?.index || 0;

              // Phase boundaries (absolute indices) - Overlap by 1 to avoid gaps
              const natural1Start = 0;
              const natural1End = 3 * 24; // Days 0-2 (8/12-8/14) - overlap into day 3
              const shutin1Start = 3 * 24;
              const shutin1End = 5 * 24; // Days 3-4 (8/15-8/16) - overlap into day 5
              const natural2Start = 5 * 24;
              const natural2End = 7 * 24; // Days 5-6 (8/17-8/18) - overlap into day 7
              const shutin2Start = 7 * 24;
              const shutin2End = 10 * 24; // Days 7-9 (8/19-8/21) - overlap into day 10
              const continuousStart = 10 * 24; // Day 10+ (8/22+)

              return !isMultiWellAnalysis ? (
                <>
                  {/* Natural Flow Phase 1: Days 0-2 (8/12-8/14) - Green background */}
                  {natural1End >= firstVisibleIndex && natural1Start <= lastVisibleIndex && (
                    <ReferenceArea
                      x1={Math.max(natural1Start, firstVisibleIndex)}
                      x2={Math.min(natural1End, lastVisibleIndex)}
                      yAxisId="left"
                      stroke="none"
                      fill={phaseColors.natural}
                      fillOpacity={phaseColors.opacity}
                    />
                  )}

                  {/* Shut-In Phase 1: Days 3-4 (8/15-8/16) - Red background */}
                  {shutin1End >= firstVisibleIndex && shutin1Start <= lastVisibleIndex && (
                    <ReferenceArea
                      x1={Math.max(shutin1Start, firstVisibleIndex)}
                      x2={Math.min(shutin1End, lastVisibleIndex)}
                      yAxisId="left"
                      stroke="none"
                      fill={phaseColors.shutin}
                      fillOpacity={phaseColors.opacity}
                    />
                  )}

                  {/* Natural Flow Phase 2: Days 5-6 (8/17-8/18) - Green background */}
                  {natural2End >= firstVisibleIndex && natural2Start <= lastVisibleIndex && (
                    <ReferenceArea
                      x1={Math.max(natural2Start, firstVisibleIndex)}
                      x2={Math.min(natural2End, lastVisibleIndex)}
                      yAxisId="left"
                      stroke="none"
                      fill={phaseColors.natural}
                      fillOpacity={phaseColors.opacity}
                    />
                  )}

                  {/* Shut-In Phase 2: Days 7-9 (8/19-8/21) - Red background */}
                  {shutin2End >= firstVisibleIndex && shutin2Start <= lastVisibleIndex && (
                    <ReferenceArea
                      x1={Math.max(shutin2Start, firstVisibleIndex)}
                      x2={Math.min(shutin2End, lastVisibleIndex)}
                      yAxisId="left"
                      stroke="none"
                      fill={phaseColors.shutin}
                      fillOpacity={phaseColors.opacity}
                    />
                  )}

                  {/* Continuous Phase: Days 9+ - Blue background */}
                  {continuousStart <= lastVisibleIndex && (
                    <ReferenceArea
                      x1={Math.max(continuousStart, firstVisibleIndex)}
                      x2={lastVisibleIndex}
                      yAxisId="left"
                      stroke="none"
                      fill={phaseColors.continuous}
                      fillOpacity={phaseColors.opacity}
                    />
                  )}
                </>
              ) : null;
            })()}

            {/* Threshold Lines */}
            {showLinePressureThreshold && (
              <ReferenceLine
                y={150}
                stroke="#c026d3"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="left"
                label={{
                  value: 'Line Pressure Threshold (150)',
                  position: 'insideTopLeft',
                  fill: '#c026d3',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            {showGasInjectionPressureThreshold && (
              <ReferenceLine
                y={1000}
                stroke="#06b6d4"
                strokeDasharray="5 5"
                strokeWidth={2}
                yAxisId="right"
                label={{
                  value: 'Gas Injection Threshold (1000)',
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

            {/* Left Y-Axis */}
            {hasLeftAxisMetrics && (
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                strokeWidth={chartStyles.axisLineWidth}
                tick={{ fill: '#6b7280', fontSize: chartStyles.tickTextSize }}
                width={65}
                scale={leftLogScale ? 'log' : 'auto'}
                domain={leftLogScale ? [1, 'auto'] : [0, 'auto']}
                allowDataOverflow={leftLogScale}
                label={{ value: '(Pressure, Production, etc.)', angle: -90, position: 'center', dx: -20, style: { fill: '#6b7280', fontSize: chartStyles.axisTitleSize, textAnchor: 'middle' } }}
              />
            )}

            {/* Right Y-Axis */}
            {hasRightAxisMetrics && (
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
                label={{ value: '(Gas Injection, Casing, etc.)', angle: 90, position: 'center', dx: 20, style: { fill: '#6b7280', fontSize: chartStyles.axisTitleSize, textAnchor: 'middle' } }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for each visible metric */}
            {metrics.filter(metric => visibleMetrics[metric]).map((metric) => {
              const isRightAxis = RIGHT_AXIS_METRICS.includes(metric);
              const isHovered = hoveredMetric === metric;
              const baseOpacity = 1.0; // Full opacity for vibrant lines
              const opacity = hoveredMetric === null ? baseOpacity : isHovered ? 1 : 0.25;
              const strokeWidth = isHovered ? chartStyles.chartLineWidth + 1.5 : chartStyles.chartLineWidth;
              const strokeColor = getMetricColor(metric, isHovered);

              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2, fill: strokeColor }}
                  name={metric}
                  yAxisId={isRightAxis ? 'right' : 'left'}
                  filter={isHovered ? 'url(#whiteGlow)' : undefined}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time Range Slider */}
      <div className="mt-4" style={{ marginLeft: '70px', marginRight: '70px' }}>
        <div className="relative" style={{ paddingTop: '0px', paddingBottom: '20px' }}>
          {/* Range track background */}
          <div className="absolute top-0 w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

          {/* Active range highlight */}
          <div
            className="absolute top-0 h-1 bg-blue-500 dark:bg-blue-400 rounded-full pointer-events-none"
            style={{
              left: `${(rangeStart / totalDays) * 100}%`,
              width: `${((rangeEnd - rangeStart) / totalDays) * 100}%`,
            }}
          />

          {/* Start range input */}
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

          {/* End range input */}
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

          {/* Date labels below slider ends */}
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

      {/* Custom Interactive Legend */}
      <div className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-6 ${
        chartStyles.legendPosition === 'left' ? 'justify-start' :
        chartStyles.legendPosition === 'right' ? 'justify-end' :
        'justify-center'
      }`}>
        {metrics.map((metric) => {
          const isVisible = visibleMetrics[metric];
          const isHovered = hoveredMetric === metric;
          const color = getMetricColor(metric, isHovered);
          const isRightAxis = RIGHT_AXIS_METRICS.includes(metric);

          return (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              onMouseEnter={() => setHoveredMetric(metric)}
              onMouseLeave={() => setHoveredMetric(null)}
              className="flex items-center gap-2 cursor-pointer transition-all"
              style={{
                filter: isHovered && isVisible ? 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' : 'none'
              }}
            >
              <svg width="18" height="10" className="flex-shrink-0">
                {/* Left line */}
                <line
                  x1="0"
                  y1="5"
                  x2="5"
                  y2="5"
                  stroke={color}
                  strokeWidth={isHovered && isVisible ? "3" : "2.5"}
                  opacity={isVisible ? 1.0 : 0.3}
                />
                {/* Center hollow circle */}
                <circle
                  cx="9"
                  cy="5"
                  r="3"
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered && isVisible ? "3" : "2.5"}
                  opacity={isVisible ? 1.0 : 0.3}
                />
                {/* Right line */}
                <line
                  x1="13"
                  y1="5"
                  x2="18"
                  y2="5"
                  stroke={color}
                  strokeWidth={isHovered && isVisible ? "3" : "2.5"}
                  opacity={isVisible ? 1.0 : 0.3}
                />
              </svg>
              <span
                style={{
                  color: isVisible ? color : color,
                  opacity: isVisible ? 1 : 0.4,
                  textDecoration: isVisible ? 'none' : 'line-through',
                  fontSize: `${chartStyles.legendSize}px`
                }}
              >
                {metric}<sup>{isRightAxis ? 'R' : 'L'}</sup>
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

        /* Same color for both start and end range */
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

        /* Dark mode adjustments */
        :global(.dark) .range-slider::-webkit-slider-thumb {
          background: #60a5fa;
        }

        :global(.dark) .range-slider::-moz-range-thumb {
          background: #60a5fa;
        }

      `}</style>
      </div>

    </>
  );
}
