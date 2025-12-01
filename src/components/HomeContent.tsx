'use client';

import { TrendingDown, AlertTriangle, TrendingUp, ChevronDown, ZoomIn, ZoomOut, Move, MapPin, BarChart3 } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

interface HomeContentProps {
  dateRange?: { from: string; to: string };
}

export default function HomeContent({ dateRange }: HomeContentProps) {
  const [benchmarkPrice, setBenchmarkPrice] = useState(75.50);
  const [chartUnit, setChartUnit] = useState<'BBL' | '$'>('BBL');
  const [mounted, setMounted] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredWell, setHoveredWell] = useState<number | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const houstonCenter: [number, number] = [29.435, -97.31]; // Centered on actual well locations

  // Helper function to create well icon
  const createWellIcon = (status: string) => {
    if (typeof window === 'undefined') return null;

    const L = require('leaflet');
    let color;

    if (status === 'Operational') {
      color = '#10b981'; // green-500
    } else if (status === 'Warning') {
      color = '#eab308'; // yellow-500
    } else {
      color = '#ef4444'; // red-500
    }

    return L.divIcon({
      html: `
        <div class="w-4 h-4 rounded-full shadow-lg border-2 border-white dark:border-gray-800 transition-transform duration-200" style="background-color: ${color};"></div>
      `,
      className: 'custom-well-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  useEffect(() => {
    setMounted(true);

    // Fix for Leaflet marker icons in Next.js
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  // Map interaction functions
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const resetMapView = () => {
    if (mapRef.current) {
      mapRef.current.setView(houstonCenter, 13);
    }
  };

  const priceOptions = [
    { label: 'WTI Crude', value: 75.50 },
    { label: 'Brent Crude', value: 78.20 },
    { label: 'Custom Price', value: 80.00 },
  ];

  const lostProductionBBL = 142.5;
  const lostProductionValue = lostProductionBBL * benchmarkPrice;

  // Monthly production impact data
  const monthlyData = [
    { month: 'Jan', actual: 1250, predicted: 1450 },
    { month: 'Feb', actual: 1180, predicted: 1380 },
    { month: 'Mar', actual: 1320, predicted: 1520 },
    { month: 'Apr', actual: 1150, predicted: 1350 },
    { month: 'May', actual: 1280, predicted: 1480 },
    { month: 'Jun', actual: 1420, predicted: 1620 },
    { month: 'Jul', actual: 1350, predicted: 1550 },
    { month: 'Aug', actual: 1180, predicted: 1380 },
    { month: 'Sep', actual: 1240, predicted: 1440 },
    { month: 'Oct', actual: 1380, predicted: 1580 },
    { month: 'Nov', actual: 1450, predicted: 1650 },
    { month: 'Dec', actual: 1320, predicted: 1520 },
  ];

  const chartData = monthlyData.map((item, index) => {
    const delta = item.predicted - item.actual;
    const cumulativeDelta = monthlyData.slice(0, index + 1).reduce((sum, monthItem) => sum + (monthItem.predicted - monthItem.actual), 0);

    return {
      ...item,
      actualValue: chartUnit === 'BBL' ? item.actual : item.actual * benchmarkPrice,
      predictedValue: chartUnit === 'BBL' ? item.predicted : item.predicted * benchmarkPrice,
      delta: chartUnit === 'BBL' ? delta : delta * benchmarkPrice,
      cumulativeDelta: chartUnit === 'BBL' ? cumulativeDelta : cumulativeDelta * benchmarkPrice,
    };
  });

  // Filter chart data based on date range from navigation calendar
  // Compare by month name, extracting months from the date range
  const filteredChartData = (dateRange?.from && dateRange?.to)
    ? (() => {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);

        // Get all months in the date range
        const monthsInRange: string[] = [];
        const currentDate = new Date(fromDate);

        while (currentDate <= toDate) {
          const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
          if (!monthsInRange.includes(monthName)) {
            monthsInRange.push(monthName);
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return chartData.filter(item => monthsInRange.includes(item.month));
      })()
    : chartData;

  // Get the year(s) from date range for x-axis label
  const getYearLabel = () => {
    if (!dateRange?.from || !dateRange?.to) return '2024';

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const fromYear = fromDate.getFullYear();
    const toYear = toDate.getFullYear();

    if (fromYear === toYear) {
      return fromYear.toString();
    }
    return `${fromYear}-${toYear}`;
  };

  // Actual well data with real coordinates - use useMemo to prevent hydration issues
  const wellsData = useMemo(() => {
    // Simple seeded random function based on well ID for deterministic values
    const seededRandom = (seed: number, min: number, max: number) => {
      const x = Math.sin(seed) * 10000;
      const random = x - Math.floor(x);
      return Math.floor(min + random * (max - min));
    };

    return [
      { id: 1, lat: 29.459734, lng: -97.303643, name: 'Cinco J Ranch LTD #1H' },
      { id: 2, lat: 29.459802, lng: -97.303466, name: 'Cinco J Ranch LTD #2H' },
      { id: 3, lat: 29.459765, lng: -97.303489, name: 'Garnet 1H' },
      { id: 4, lat: 29.447887, lng: -97.296519, name: 'L & J Lee #1H' },
      { id: 5, lat: 29.447925, lng: -97.296502, name: 'L & J Lee #2H' },
      { id: 6, lat: 29.450001, lng: -97.295796, name: 'L & J Lee #4H' },
      { id: 7, lat: 29.450052, lng: -97.295774, name: 'L & J Lee #5H' },
      { id: 8, lat: 29.450103, lng: -97.295751, name: 'L & J Lee #6H' },
      { id: 9, lat: 29.459729, lng: -97.30351, name: 'L & Lee Unit 7H' },
      { id: 10, lat: 29.437156, lng: -97.315931, name: 'Rock Creek Ranch #1H' },
      { id: 11, lat: 29.437179, lng: -97.315889, name: 'Rock Creek Ranch #2H' },
      { id: 12, lat: 29.437523, lng: -97.316163, name: 'Rock Creek Ranch #3H' },
      { id: 13, lat: 29.437542, lng: -97.316119, name: 'Rock Creek Ranch #4H' },
      { id: 14, lat: 29.437905, lng: -97.308892, name: 'Rock Creek Ranch #5H' },
      { id: 15, lat: 29.437926, lng: -97.308848, name: 'Rock Creek Ranch #6H' },
      { id: 16, lat: 29.438265, lng: -97.309122, name: 'Rock Creek Ranch #7H' },
      { id: 17, lat: 29.438049, lng: -97.30881, name: 'Rock Creek Ranch #8H' },
      { id: 18, lat: 29.442132, lng: -97.324619, name: 'Rock Creek Ranch #9H' },
      { id: 19, lat: 29.442381, lng: -97.32493, name: 'Rock Creek Ranch #10H' },
      { id: 20, lat: 29.433367, lng: -97.30067, name: 'Rock Creek Ranch #11H' },
      { id: 21, lat: 29.433377, lng: -97.301034, name: 'Rock Creek Ranch #12H' },
      { id: 22, lat: 29.44885, lng: -97.320069, name: 'Rock Creek Ranch #14H' },
      { id: 23, lat: 29.448889, lng: -97.320057, name: 'Rock Creek Ranch #15H' },
      { id: 24, lat: 29.4421611, lng: -97.3245786, name: 'Rock Creek Ranch #18H' },
      { id: 25, lat: 29.442201, lng: -97.3245671, name: 'Rock Creek Ranch #20H' },
      { id: 26, lat: 29.433346, lng: -97.301037, name: 'Rock Creek Ranch #25H' },
      { id: 27, lat: 29.4280347, lng: -97.3244106, name: 'Flane 1H' },
      { id: 28, lat: 29.4280717, lng: -97.3244326, name: 'RCR Jane 5H' },
      { id: 29, lat: 29.4281084, lng: -97.3244534, name: 'RCR Jane 8H' },
      { id: 30, lat: 29.420706, lng: -97.331291, name: 'RCR-Wyatt #1H' },
      { id: 31, lat: 29.420717, lng: -97.331246, name: 'RCR-Wyatt #2H' },
      { id: 32, lat: 29.420729, lng: -97.331201, name: 'RCR-Wyatt #3H' },
      { id: 33, lat: 29.420741, lng: -97.331156, name: 'RCR-Wyatt #4H' },
      { id: 34, lat: 29.418885, lng: -97.317251, name: 'RCRS-Jane #1H' },
      { id: 35, lat: 29.418892, lng: -97.317204, name: 'RCRS-Jane #2H' },
      { id: 36, lat: 29.418907, lng: -97.317112, name: 'RCRS-Jane #4H' },
      { id: 37, lat: 29.418899, lng: -97.317158, name: 'RCRS-Jane #6H' },
      { id: 38, lat: 29.418911, lng: -97.317086, name: 'RCRS-Jane #7H' },
      { id: 39, lat: 29.417278, lng: -97.321441, name: 'RCRS-Fletcher #1H' },
      { id: 40, lat: 29.417292, lng: -97.321397, name: 'RCRS-Fletcher #2H' },
      { id: 41, lat: 29.417307, lng: -97.321353, name: 'RCRS-Fletcher #3H' },
      { id: 42, lat: 29.415484, lng: -97.33428, name: 'RCR-Hinton #1H' },
      { id: 43, lat: 29.415502, lng: -97.33422, name: 'RCR-Hinton #2H' },
      { id: 44, lat: 29.415519, lng: -97.334161, name: 'RCR-Hinton #3H' },
      { id: 45, lat: 29.433312, lng: -97.301064, name: 'Quartz 1H' }
    ].map(well => {
      // Generate deterministic random values based on well ID
      const statuses = ['Operational', 'Warning', 'Critical'];
      const statusIndex = seededRandom(well.id, 0, 3);
      const randomStatus = statuses[statusIndex];
      const randomProduction = seededRandom(well.id * 100, 400, 1600); // 400-1600 BBL/day
      const randomGasPressure = seededRandom(well.id * 200, 2000, 3500); // 2000-3500 PSI
      const randomNonCompliantHours = randomStatus === 'Critical' ? seededRandom(well.id * 300, 50, 100) :
                                      randomStatus === 'Warning' ? seededRandom(well.id * 400, 5, 25) :
                                      0;

      return {
        ...well,
        status: randomStatus,
        production: randomProduction,
        gasPressure: randomGasPressure,
        nonCompliantHours: randomNonCompliantHours
      };
    });
  }, []); // Empty dependency array ensures this only runs once

  const stats = [
    {
      label: 'Estimated Total Lost Production',
      bblValue: `${lostProductionBBL} BBL`,
      dollarValue: `$${lostProductionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      borderColor: 'border-l-[#2F80ED] dark:border-l-[#4C9AFF]',
      hasDropdown: true,
    },
    {
      label: 'Line Pressure Too High',
      value: '160h',
      wellsAffected: 8,
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      borderColor: 'border-l-[#2F80ED] dark:border-l-[#4C9AFF]',
    },
    {
      label: 'Gas Injection Pressure Too Low',
      value: '87h',
      wellsAffected: 7,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      borderColor: 'border-l-[#2F80ED] dark:border-l-[#4C9AFF]',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 ${stat.borderColor} border-l-4 hover:shadow-xl transition-all duration-200`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>

                {stat.hasDropdown ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.bblValue}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {stat.dollarValue}
                      </p>
                      <div className="relative">
                        <select
                          value={benchmarkPrice}
                          onChange={(e) => setBenchmarkPrice(Number(e.target.value))}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {priceOptions.map((option) => (
                            <option key={option.label} value={option.value}>
                              ${option.value}/BBL
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    {stat.wellsAffected && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stat.wellsAffected} wells affected
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Monthly Production Impact
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setChartUnit('BBL')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  chartUnit === 'BBL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                BBL
              </button>
              <button
                onClick={() => setChartUnit('$')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap min-w-[110px] ${
                  chartUnit === '$'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                $ @ ${benchmarkPrice}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {mounted ? (
              <div className="relative flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 pb-2">
                {/* Y-Axis Label */}
                <div className="absolute left-0 top-0 bottom-6 flex items-center justify-center w-8">
                  <div className="transform -rotate-90">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {chartUnit === 'BBL' ? 'BBL' : '$'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-[calc(100%-28px)] relative ml-4 mb-6" style={{ justifyContent: 'space-evenly' }}>
                  {/* Cumulative Delta Line Graph */}
                  {filteredChartData.length > 1 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#FF7F0E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={filteredChartData.map((item, index) => {
                          const maxCumulativeDelta = Math.max(...filteredChartData.map(d => Math.abs(d.cumulativeDelta)));
                          const x = (index / (filteredChartData.length - 1)) * 100;
                          const deltaHeight = Math.abs(item.cumulativeDelta) / maxCumulativeDelta * 40;
                          const y = 20 + (40 - deltaHeight);
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    </svg>
                  )}

                  {filteredChartData.map((item, index) => {
                    const maxActual = Math.max(...filteredChartData.map(d => d.actualValue));
                    const maxPredicted = Math.max(...filteredChartData.map(d => d.predictedValue));
                    const maxValue = Math.max(maxActual, maxPredicted);
                    const actualHeight = Math.max((item.actualValue / maxValue) * 160, 2);
                    const predictedHeight = Math.max((item.predictedValue / maxValue) * 160, 2);

                    // Calculate dynamic bar width based on number of filtered items
                    const barWidth = filteredChartData.length <= 4 ? '16px' : filteredChartData.length <= 8 ? '12px' : '8px';

                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center justify-end group cursor-pointer hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 p-1 relative"
                        style={{ height: '100%' }}
                        onMouseEnter={() => setHoveredMonth(index)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        <div className="flex items-end justify-center space-x-1 mb-1" style={{ height: 'calc(100% - 20px)' }}>
                          <div
                            className="rounded-t-sm min-h-[2px] transition-all duration-200 group-hover:shadow-md"
                            style={{
                              height: `${actualHeight}px`,
                              width: barWidth,
                              backgroundColor: '#2F80ED'
                            }}
                          />
                          <div
                            className="rounded-t-sm min-h-[2px] transition-all duration-200 group-hover:shadow-md"
                            style={{
                              height: `${predictedHeight}px`,
                              width: barWidth,
                              backgroundColor: '#9CC2F9'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-200">
                          {item.month}
                        </span>

                        {/* Card-style Tooltip */}
                        {hoveredMonth === index && (
                          <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 z-50">
                            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-150">
                              {/* Tooltip Arrow */}
                              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white dark:border-r-gray-800"></div>

                              {/* Month Header */}
                              <div className="text-center font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                                {item.month}
                              </div>

                              {/* Data Rows */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2F80ED' }}></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Actual</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-gray-900 dark:text-white">{item.actual} BBL</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">${(item.actual * benchmarkPrice).toLocaleString()}</div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9CC2F9' }}></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Predicted</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-gray-900 dark:text-white">{item.predicted} BBL</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">${(item.predicted * benchmarkPrice).toLocaleString()}</div>
                                  </div>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF7F0E' }}></div>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Cumulative Δ</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                                        {chartUnit === 'BBL' ? `${Math.round(item.cumulativeDelta)} BBL` : `$${Math.round(item.cumulativeDelta).toLocaleString()}`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* X-Axis Year Label */}
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 ml-4">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {getYearLabel()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-6 pt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2F80ED' }}></div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Actual Production</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{chartUnit === 'BBL' ? '(BBL)' : '($)'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9CC2F9' }}></div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Predicted Model</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{chartUnit === 'BBL' ? '(BBL)' : '($)'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: '#FF7F0E' }}></div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cumulative Delta</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{chartUnit === 'BBL' ? '(BBL)' : '($)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-[400px] flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              LGS Compressor Non-Compliance Breakdown
            </h3>
          </div>

          {mounted ? (
            <div className="space-y-11 flex-1 overflow-y-auto">
              {/* Compressor Offline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Compressor Offline</p>
                  <p className="text-sm font-bold" style={{ color: '#2F80ED' }}>15.2 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(12.8 / 15.2) * 100}%`, backgroundColor: '#2F80ED' }}
                      title="1 Compressor offline: 12.8 hrs"
                    >
                      {(12.8 / 15.2) * 100 > 15 ? '12.8h' : ''}
                    </div>
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(2.4 / 15.2) * 100}%`, backgroundColor: '#9CC2F9' }}
                      title="2 Compressors offline: 2.4 hrs"
                    >
                      {(2.4 / 15.2) * 100 > 8 ? '2.4h' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2F80ED' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9CC2F9' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline</span>
                  </div>
                </div>
              </div>

              {/* Line Pressure Too High */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Line Pressure Too High</p>
                  <p className="text-sm font-bold" style={{ color: '#2F80ED' }}>8.7 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(5.3 / 8.7) * 100}%`, backgroundColor: '#2F80ED' }}
                      title="All 3 compressors online: 5.3 hrs"
                    >
                      {(5.3 / 8.7) * 100 > 15 ? '5.3h' : ''}
                    </div>
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(2.8 / 8.7) * 100}%`, backgroundColor: '#9CC2F9' }}
                      title="1 Compressor offline: 2.8 hrs"
                    >
                      {(2.8 / 8.7) * 100 > 15 ? '2.8h' : ''}
                    </div>
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(0.6 / 8.7) * 100}%`, backgroundColor: '#C6DEFF' }}
                      title="2 Compressors offline: 0.6 hrs"
                    >
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2F80ED' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">All Online</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9CC2F9' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#C6DEFF' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline</span>
                  </div>
                </div>
              </div>

              {/* Gas Injection Pressure Too Low */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Gas Injection Pressure Too Low</p>
                  <p className="text-sm font-bold" style={{ color: '#2F80ED' }}>6.1 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(2.9 / 6.1) * 100}%`, backgroundColor: '#2F80ED' }}
                      title="All 3 compressors online: 2.9 hrs"
                    >
                      {(2.9 / 6.1) * 100 > 15 ? '2.9h' : ''}
                    </div>
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(2.4 / 6.1) * 100}%`, backgroundColor: '#9CC2F9' }}
                      title="1 Compressor offline: 2.4 hrs"
                    >
                      {(2.4 / 6.1) * 100 > 15 ? '2.4h' : ''}
                    </div>
                    <div
                      className="flex items-center justify-center text-white text-xs font-medium transition-all hover:brightness-110"
                      style={{ width: `${(0.8 / 6.1) * 100}%`, backgroundColor: '#C6DEFF' }}
                      title="2 Compressors offline: 0.8 hrs"
                    >
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2F80ED' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">All Online</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9CC2F9' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#C6DEFF' }}></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      {/* Houston Region Well Status Map */}
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHoveredWell(null)}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Houston Region Well Status Map
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 bg-green-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                Operational ({wellsData.filter(w => w.status === 'Operational').length})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 bg-yellow-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                Warning ({wellsData.filter(w => w.status === 'Warning').length})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 bg-red-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                Critical ({wellsData.filter(w => w.status === 'Critical').length})
              </span>
            </div>
          </div>
        </div>

        {mounted ? (
          <div className="relative h-96" style={{ overflow: 'visible' }}>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={resetMapView}
                className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                title="Reset View"
              >
                <Move size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div style={{ borderRadius: '0.5rem', overflow: 'hidden', height: '100%', width: '100%' }}>
              <MapContainer
                center={houstonCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                ref={mapRef}
              >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Well Markers */}
              {wellsData.map((well) => {
                const customIcon = createWellIcon(well.status);
                if (!customIcon) return null;

                // Determine color for status badge
                let badgeColor;
                if (well.status === 'Operational') {
                  badgeColor = '#10b981';
                } else if (well.status === 'Warning') {
                  badgeColor = '#eab308';
                } else {
                  badgeColor = '#ef4444';
                }

                return (
                  <Marker
                    key={well.id}
                    position={[well.lat, well.lng]}
                    icon={customIcon}
                  >
                    <Tooltip
                      direction="auto"
                      offset={[0, -10]}
                      opacity={0.95}
                      permanent={false}
                      sticky={true}
                      className="well-info-tooltip"
                    >
                      <div className="well-tooltip-content">
                        {/* Header */}
                        <div className="well-tooltip-header">
                          <div className="well-tooltip-name">{well.name}</div>
                          <div className="well-tooltip-id">Well #{String(well.id).padStart(3, '0')}</div>
                        </div>

                        {/* Data Rows */}
                        <div className="well-tooltip-data">
                          <div className="well-tooltip-row">
                            <span className="well-tooltip-label">Production:</span>
                            <span className="well-tooltip-value">{well.production.toLocaleString()} BBL/day</span>
                          </div>

                          <div className="well-tooltip-row">
                            <span className="well-tooltip-label">Gas Pressure:</span>
                            <span className="well-tooltip-value">{well.gasPressure.toLocaleString()} PSI</span>
                          </div>

                          <div className="well-tooltip-row">
                            <span className="well-tooltip-label">Compliance:</span>
                            <span className="well-tooltip-value" style={{
                              color: well.status === 'Critical' ? '#ef4444' : '#10b981'
                            }}>
                              {well.status === 'Critical' ? 'Non-Compliant' : 'Compliant'}
                            </span>
                          </div>

                          <div className="well-tooltip-row">
                            <span className="well-tooltip-label">Non-Compliant Hours:</span>
                            <span className="well-tooltip-value" style={{
                              color: well.nonCompliantHours === 0 ? '#10b981' :
                                     well.nonCompliantHours < 50 ? '#f97316' :
                                     '#ef4444'
                            }}>
                              {well.nonCompliantHours}h
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="well-tooltip-footer">
                          <div className="well-tooltip-badge" style={{
                            backgroundColor: well.status === 'Operational' ? '#dcfce7' :
                                           well.status === 'Warning' ? '#fef3c7' :
                                           '#fee2e2',
                            color: well.status === 'Operational' ? '#166534' :
                                  well.status === 'Warning' ? '#854d0e' :
                                  '#991b1b'
                          }}>
                            <div className="well-tooltip-badge-dot" style={{ backgroundColor: badgeColor }}></div>
                            {well.status === 'Operational' ? 'Normal Operations' :
                             well.status === 'Warning' ? 'Requires Attention' :
                             'Immediate Action Required'}
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
          </div>
        )}
      </div>

      {/* Top 10 Wells by Impact */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Top 10 Wells by Impact
          </h3>
        </div>

        {mounted ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Well ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Lost Prod.
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Hours
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Impact
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Area
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { wellId: 'SW-Terminal-016', lostProd: '84.2 BBL', hours: '84h', impact: 'High', area: 'Southwest' },
                  { wellId: 'Refinery-Junction-005', lostProd: '67.5 BBL', hours: '67h', impact: 'High', area: 'Ship Channel' },
                  { wellId: 'Galveston-Bay-018', lostProd: '45.8 BBL', hours: '16h', impact: 'Medium', area: 'Southeast Coastal' },
                  { wellId: 'Gulf-Coast-Unit-003', lostProd: '38.9 BBL', hours: '14h', impact: 'Medium', area: 'Ship Channel' },
                  { wellId: 'Katy-Freeway-Unit-008', lostProd: '32.1 BBL', hours: '18h', impact: 'Medium', area: 'West Houston' },
                  { wellId: 'Tomball-Junction-012', lostProd: '28.7 BBL', hours: '12h', impact: 'Medium', area: 'North Houston' },
                  { wellId: 'Cypress-Station-022', lostProd: '24.3 BBL', hours: '9h', impact: 'Low', area: 'Northwest' },
                  { wellId: 'Downtown-Central-024', lostProd: '18.5 BBL', hours: '7h', impact: 'Low', area: 'Central' },
                  { wellId: 'Energy-Plaza-006', lostProd: '15.2 BBL', hours: '5h', impact: 'Low', area: 'Energy Corridor' },
                  { wellId: 'Memorial-Station-009', lostProd: '12.8 BBL', hours: '4h', impact: 'Low', area: 'West Houston' },
                ].map((well, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {well.wellId}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {well.lostProd}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {well.hours}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        well.impact === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        well.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {well.impact}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {well.area}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Loading table...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            © 2025 Ayata. All rights reserved. No part of this product may be reproduced or transmitted without prior written permission.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Contact: baytex@ayata.com</a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        /* Dark mode color adjustments */
        :global(.dark) [style*="backgroundColor: #2F80ED"] {
          background-color: #4C9AFF !important;
        }
        :global(.dark) [style*="color: #2F80ED"] {
          color: #4C9AFF !important;
        }

        /* Hover effect */
        [style*="backgroundColor: #2F80ED"]:hover,
        [style*="backgroundColor: #9CC2F9"]:hover,
        [style*="backgroundColor: #C6DEFF"]:hover {
          filter: brightness(1.15);
        }

        /* Leaflet tooltip positioning to show above card boundaries */
        .leaflet-tooltip-pane {
          z-index: 9999 !important;
        }

        .leaflet-tooltip {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }

        .leaflet-container {
          overflow: visible !important;
        }

        .leaflet-pane {
          z-index: auto;
        }

        .leaflet-top,
        .leaflet-bottom {
          z-index: 1000;
        }

        /* Well Tooltip Styles */
        .well-tooltip-content {
          padding: 8px;
          min-width: 240px;
        }

        .well-tooltip-header {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .well-tooltip-name {
          font-size: 16px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 4px;
        }

        .well-tooltip-id {
          font-size: 12px;
          color: #6b7280;
        }

        .well-tooltip-data {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .well-tooltip-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .well-tooltip-label {
          font-size: 14px;
          color: #4b5563;
        }

        .well-tooltip-value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .well-tooltip-footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .well-tooltip-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }

        .well-tooltip-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }
      `}</style>
    </div>
  );
}