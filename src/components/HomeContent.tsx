'use client';

import { TrendingDown, AlertTriangle, TrendingUp, ChevronDown, ZoomIn, ZoomOut, Move, MapPin, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HomeContent() {
  const [benchmarkPrice, setBenchmarkPrice] = useState(75.50);
  const [chartUnit, setChartUnit] = useState<'BBL' | '$'>('BBL');
  const [mounted, setMounted] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Map interaction functions
  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev * 1.5, 4));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setMapPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetMapView = () => {
    setMapZoom(1);
    setMapPosition({ x: 0, y: 0 });
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

  // Static well positions and statuses based on Houston geography
  const wellsData = [
    // Ship Channel area wells (Southeast Houston)
    { id: 1, x: 75, y: 65, status: 'Operational', name: 'Ship Channel Alpha', production: 1247, gasPressure: 2850, nonCompliantHours: 0 },
    { id: 2, x: 82, y: 70, status: 'Operational', name: 'Bayport Station', production: 982, gasPressure: 2920, nonCompliantHours: 0 },
    { id: 3, x: 88, y: 75, status: 'Warning', name: 'Gulf Coast Unit', production: 756, gasPressure: 2650, nonCompliantHours: 14 },
    { id: 4, x: 85, y: 62, status: 'Operational', name: 'Channel View', production: 1156, gasPressure: 2780, nonCompliantHours: 0 },
    { id: 5, x: 78, y: 72, status: 'Critical', name: 'Refinery Junction', production: 423, gasPressure: 2180, nonCompliantHours: 67 },

    // Energy Corridor and West Houston wells
    { id: 6, x: 15, y: 45, status: 'Operational', name: 'Energy Plaza', production: 1345, gasPressure: 3120, nonCompliantHours: 0 },
    { id: 7, x: 22, y: 50, status: 'Operational', name: 'Westchase Hub', production: 1189, gasPressure: 2890, nonCompliantHours: 0 },
    { id: 8, x: 28, y: 42, status: 'Warning', name: 'Katy Freeway Unit', production: 834, gasPressure: 2420, nonCompliantHours: 18 },
    { id: 9, x: 18, y: 55, status: 'Operational', name: 'Memorial Station', production: 1067, gasPressure: 2950, nonCompliantHours: 0 },

    // North Houston / Woodlands area
    { id: 10, x: 45, y: 20, status: 'Operational', name: 'Woodlands North', production: 1423, gasPressure: 3240, nonCompliantHours: 0 },
    { id: 11, x: 52, y: 15, status: 'Operational', name: 'Spring Branch', production: 1298, gasPressure: 3180, nonCompliantHours: 0 },
    { id: 12, x: 38, y: 25, status: 'Warning', name: 'Tomball Junction', production: 712, gasPressure: 2380, nonCompliantHours: 12 },
    { id: 13, x: 58, y: 22, status: 'Operational', name: 'North Harris', production: 1534, gasPressure: 3350, nonCompliantHours: 0 },

    // Southwest Houston (near refineries)
    { id: 14, x: 35, y: 65, status: 'Operational', name: 'Sugar Land Unit', production: 1267, gasPressure: 2820, nonCompliantHours: 0 },
    { id: 15, x: 42, y: 70, status: 'Operational', name: 'Fort Bend Station', production: 1134, gasPressure: 2740, nonCompliantHours: 0 },
    { id: 16, x: 48, y: 75, status: 'Critical', name: 'Southwest Terminal', production: 398, gasPressure: 2050, nonCompliantHours: 84 },
    { id: 17, x: 40, y: 78, status: 'Operational', name: 'Brazoria Unit', production: 1089, gasPressure: 2690, nonCompliantHours: 0 },

    // Southeast coastal area
    { id: 18, x: 70, y: 80, status: 'Warning', name: 'Galveston Bay', production: 678, gasPressure: 2290, nonCompliantHours: 16 },
    { id: 19, x: 65, y: 85, status: 'Operational', name: 'Clear Lake Station', production: 1456, gasPressure: 3080, nonCompliantHours: 0 },
    { id: 20, x: 75, y: 88, status: 'Operational', name: 'Coastal Terminal', production: 1312, gasPressure: 2960, nonCompliantHours: 0 },

    // Northwest Houston area
    { id: 21, x: 25, y: 30, status: 'Operational', name: 'Northwest Hub', production: 1178, gasPressure: 2850, nonCompliantHours: 0 },
    { id: 22, x: 32, y: 35, status: 'Warning', name: 'Cypress Station', production: 789, gasPressure: 2340, nonCompliantHours: 9 },
    { id: 23, x: 20, y: 25, status: 'Operational', name: 'Willowbrook Unit', production: 1401, gasPressure: 3190, nonCompliantHours: 0 },

    // Central Houston area
    { id: 24, x: 50, y: 50, status: 'Operational', name: 'Downtown Central', production: 1523, gasPressure: 3420, nonCompliantHours: 0 },
    { id: 25, x: 55, y: 45, status: 'Operational', name: 'Midtown Station', production: 1267, gasPressure: 3100, nonCompliantHours: 0 },
  ];

  const stats = [
    {
      label: 'Estimated Total Lost Production',
      bblValue: `${lostProductionBBL} BBL`,
      dollarValue: `$${lostProductionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      borderColor: 'border-l-red-500 dark:border-l-red-400',
      hasDropdown: true,
    },
    {
      label: 'Line Pressure Too High',
      value: '160h',
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      borderColor: 'border-l-orange-500 dark:border-l-orange-400',
    },
    {
      label: 'Gas Injection Pressure Too Low',
      value: '87h',
      icon: TrendingUp,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      borderColor: 'border-l-yellow-500 dark:border-l-yellow-400',
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>

                {stat.hasDropdown ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.bblValue}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {stat.dollarValue}
                      </p>
                      <div className="relative">
                        <select
                          value={benchmarkPrice}
                          onChange={(e) => setBenchmarkPrice(Number(e.target.value))}
                          className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
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
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  chartUnit === '$'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ${chartUnit === '$' ? `@ $${benchmarkPrice}` : ''}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {mounted ? (
              <div className="relative h-48 bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-1 h-full relative">
                  {/* Cumulative Delta Line Graph */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      points={chartData.map((item, index) => {
                        const maxCumulativeDelta = Math.max(...chartData.map(d => Math.abs(d.cumulativeDelta)));
                        const x = (index / (chartData.length - 1)) * 100;
                        const deltaHeight = Math.abs(item.cumulativeDelta) / maxCumulativeDelta * 40;
                        const y = 20 + (40 - deltaHeight);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>

                  {chartData.map((item, index) => {
                    const maxActual = Math.max(...chartData.map(d => d.actualValue));
                    const maxPredicted = Math.max(...chartData.map(d => d.predictedValue));
                    const maxValue = Math.max(maxActual, maxPredicted);
                    const actualHeight = Math.max((item.actualValue / maxValue) * 160, 2);
                    const predictedHeight = Math.max((item.predictedValue / maxValue) * 160, 2);

                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center h-full group cursor-pointer hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 p-1 relative"
                        onMouseEnter={() => setHoveredMonth(index)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        <div className="flex-1 flex items-end justify-center space-x-1 pb-6">
                          <div
                            className="bg-blue-500 rounded-t-sm min-h-[2px] group-hover:bg-blue-600 transition-colors duration-200 group-hover:shadow-md"
                            style={{
                              height: `${actualHeight}px`,
                              width: '8px'
                            }}
                          />
                          <div
                            className="bg-green-500 rounded-t-sm min-h-[2px] group-hover:bg-green-600 transition-colors duration-200 group-hover:shadow-md"
                            style={{
                              height: `${predictedHeight}px`,
                              width: '8px'
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
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Actual</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-gray-900 dark:text-white">{item.actual} BBL</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">${(item.actual * benchmarkPrice).toLocaleString()}</div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-6 pt-8">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Actual Production {chartUnit === 'BBL' ? '(BBL)' : '($)'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Predicted Model {chartUnit === 'BBL' ? '(BBL)' : '($)'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-red-600 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Cumulative Delta {chartUnit === 'BBL' ? '(BBL)' : '($)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              LGS Compressor Non-Compliance Breakdown
            </h3>
          </div>

          {mounted ? (
            <div className="space-y-6">
              {/* Compressor Offline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Compressor Offline</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">15.2 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 dark:bg-red-400 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(12.8 / 15.2) * 100}%` }}
                      title="1 Compressor offline: 12.8 hrs"
                    >
                      {(12.8 / 15.2) * 100 > 15 ? '12.8h' : ''}
                    </div>
                    <div
                      className="bg-red-300 dark:bg-red-600 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(2.4 / 15.2) * 100}%` }}
                      title="2 Compressors offline: 2.4 hrs"
                    >
                      {(2.4 / 15.2) * 100 > 8 ? '2.4h' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline (12.8h)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-300 dark:bg-red-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline (2.4h)</span>
                  </div>
                </div>
              </div>

              {/* Line Pressure Too High */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Line Pressure Too High</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">8.7 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 dark:bg-orange-400 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(5.3 / 8.7) * 100}%` }}
                      title="All 3 compressors online: 5.3 hrs"
                    >
                      {(5.3 / 8.7) * 100 > 15 ? '5.3h' : ''}
                    </div>
                    <div
                      className="bg-orange-400 dark:bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(2.8 / 8.7) * 100}%` }}
                      title="1 Compressor offline: 2.8 hrs"
                    >
                      {(2.8 / 8.7) * 100 > 15 ? '2.8h' : ''}
                    </div>
                    <div
                      className="bg-orange-300 dark:bg-orange-600 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(0.6 / 8.7) * 100}%` }}
                      title="2 Compressors offline: 0.6 hrs"
                    >
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-orange-500 dark:bg-orange-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">All Online (5.3h)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-orange-400 dark:bg-orange-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline (2.8h)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-orange-300 dark:bg-orange-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline (0.6h)</span>
                  </div>
                </div>
              </div>

              {/* Gas Injection Pressure Too Low */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Gas Injection Pressure Too Low</p>
                  <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">6.1 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-yellow-500 dark:bg-yellow-400 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(2.9 / 6.1) * 100}%` }}
                      title="All 3 compressors online: 2.9 hrs"
                    >
                      {(2.9 / 6.1) * 100 > 15 ? '2.9h' : ''}
                    </div>
                    <div
                      className="bg-yellow-400 dark:bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(2.4 / 6.1) * 100}%` }}
                      title="1 Compressor offline: 2.4 hrs"
                    >
                      {(2.4 / 6.1) * 100 > 15 ? '2.4h' : ''}
                    </div>
                    <div
                      className="bg-yellow-300 dark:bg-yellow-600 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(0.8 / 6.1) * 100}%` }}
                      title="2 Compressors offline: 0.8 hrs"
                    >
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">All Online (2.9h)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-400 dark:bg-yellow-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">1 Offline (2.4h)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-300 dark:bg-yellow-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">2 Offline (0.8h)</span>
                  </div>
                </div>
              </div>

              {/* Capacity Exceeded */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Capacity Exceeded</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">3.4 hrs</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div
                    className="bg-purple-500 dark:bg-purple-400 h-4 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: '100%' }}
                    title="Capacity Exceeded: 3.4 hrs"
                  >
                    3.4h
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-500 dark:bg-purple-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Total (3.4h)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      {/* Houston Region Well Status Map */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Houston Region Well Status Map
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Operational (18)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Warning (5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Critical (2)</span>
            </div>
          </div>
        </div>

        {mounted ? (
          <div className="relative h-96 bg-green-200 dark:bg-green-800 rounded-lg overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-30 flex flex-col space-y-2">
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

            {/* Zoom Level Indicator */}
            <div className="absolute bottom-4 right-4 z-30 bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 py-1 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-900 dark:text-white">
                Zoom: {Math.round(mapZoom * 100)}%
              </div>
            </div>

            {/* Interactive Map Container */}
            <div
              className={`absolute inset-0 transition-transform duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapZoom})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Realistic Satellite Map */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-300 dark:from-amber-700 dark:via-yellow-800 dark:to-amber-800">

                {/* Natural Terrain Texture */}
                <div className="absolute inset-0 opacity-40">
                  {/* Large vegetation patches */}
                  <div className="absolute top-[5%] left-[10%] w-20 h-16 bg-green-700 dark:bg-green-900 rounded-full transform rotate-12 opacity-50"></div>
                  <div className="absolute top-[15%] left-[40%] w-24 h-18 bg-green-800 dark:bg-green-950 rounded-full transform -rotate-6 opacity-40"></div>
                  <div className="absolute top-[25%] right-[20%] w-18 h-14 bg-green-700 dark:bg-green-900 rounded-full transform rotate-45 opacity-45"></div>
                  <div className="absolute top-[45%] left-[5%] w-22 h-20 bg-green-800 dark:bg-green-950 rounded-full transform -rotate-12 opacity-55"></div>
                  <div className="absolute bottom-[30%] left-[25%] w-16 h-12 bg-green-700 dark:bg-green-900 rounded-full transform rotate-30 opacity-40"></div>
                  <div className="absolute bottom-[15%] right-[35%] w-20 h-16 bg-green-800 dark:bg-green-950 rounded-full transform -rotate-20 opacity-45"></div>

                  {/* Agricultural fields */}
                  <div className="absolute top-[8%] left-[65%] w-14 h-10 bg-amber-200 dark:bg-amber-600 opacity-50 transform rotate-15"></div>
                  <div className="absolute top-[35%] right-[15%] w-12 h-8 bg-amber-300 dark:bg-amber-700 opacity-45 transform -rotate-10"></div>
                  <div className="absolute bottom-[40%] left-[70%] w-16 h-12 bg-yellow-200 dark:bg-yellow-600 opacity-50 transform rotate-25"></div>
                </div>

                {/* Water Bodies */}
                {/* Galveston Bay */}
                <div className="absolute bottom-0 right-0 w-40 h-32 bg-blue-500 dark:bg-blue-700 opacity-85">
                  <div className="absolute inset-2 bg-blue-400 dark:bg-blue-600 opacity-60"></div>
                  <div className="absolute bottom-2 right-2 w-8 h-6 bg-blue-600 dark:bg-blue-800 opacity-70"></div>
                </div>
                <div className="absolute bottom-0 right-24 w-24 h-20 bg-blue-500 dark:bg-blue-700 opacity-80">
                  <div className="absolute inset-1 bg-blue-400 dark:bg-blue-600 opacity-50"></div>
                </div>

                {/* Buffalo Bayou */}
                <div className="absolute top-1/2 left-0 right-0 h-3 bg-blue-600 dark:bg-blue-800 transform -rotate-2 opacity-80">
                  <div className="absolute inset-0 bg-blue-500 dark:bg-blue-700 opacity-60"></div>
                </div>

                {/* Ship Channel */}
                <div className="absolute bottom-8 left-1/2 right-0 h-4 bg-blue-600 dark:bg-blue-800 transform rotate-6 origin-left opacity-80">
                  <div className="absolute inset-0 bg-blue-500 dark:bg-blue-700 opacity-60"></div>
                </div>

                {/* Major Highways - Realistic */}
                {mapZoom > 0.8 && (
                  <>
                    {/* I-10 (Katy Freeway) */}
                    <div className="absolute top-1/2 left-0 right-0 bg-gray-600 dark:bg-gray-400 shadow-md" style={{ height: '2px', transform: 'translateY(-1px)' }}></div>

                    {/* I-45 (Gulf Freeway) */}
                    <div className="absolute top-0 left-1/2 bottom-0 bg-gray-600 dark:bg-gray-400 transform rotate-12 origin-top shadow-md" style={{ width: '2px' }}></div>

                    {/* US-59/I-69 (Southwest Freeway) */}
                    <div className="absolute top-0 right-0 bottom-0 bg-gray-600 dark:bg-gray-400 transform -rotate-12 origin-top shadow-md" style={{ width: '2px' }}></div>

                    {/* Beltway 8 */}
                    <div className="absolute top-1/4 left-1/4 w-48 h-48 border-2 border-gray-600 dark:border-gray-400 rounded-full opacity-70"></div>
                  </>
                )}

                {/* Urban Areas */}
                {/* Downtown Houston */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 bg-gray-400 dark:bg-gray-600 opacity-80 shadow-lg">
                    <div className="absolute inset-1 bg-gray-500 dark:bg-gray-700 opacity-70"></div>
                    <div className="absolute inset-2 bg-gray-600 dark:bg-gray-800 opacity-60"></div>
                  </div>
                  {mapZoom > 1.5 && (
                    <>
                      <div className="absolute -top-1 -left-2 w-3 h-10 bg-gray-500 dark:bg-gray-600 shadow-md opacity-75"></div>
                      <div className="absolute -top-1 left-2 w-3 h-8 bg-gray-500 dark:bg-gray-600 shadow-md opacity-75"></div>
                      <div className="absolute -top-1 left-6 w-3 h-12 bg-gray-500 dark:bg-gray-600 shadow-md opacity-75"></div>
                      <div className="absolute -top-1 left-10 w-3 h-9 bg-gray-500 dark:bg-gray-600 shadow-md opacity-75"></div>
                      <div className="absolute -top-1 left-14 w-3 h-11 bg-gray-500 dark:bg-gray-600 shadow-md opacity-75"></div>
                    </>
                  )}
                </div>

                {/* Industrial/Refinery Complex */}
                <div className="absolute bottom-12 right-12">
                  <div className="flex space-x-1">
                    <div className="w-4 h-8 bg-gray-500 dark:bg-gray-600 shadow-lg opacity-80"></div>
                    <div className="w-4 h-10 bg-gray-500 dark:bg-gray-600 shadow-lg opacity-80"></div>
                    <div className="w-4 h-6 bg-gray-500 dark:bg-gray-600 shadow-lg opacity-80"></div>
                  </div>
                  <div className="mt-1 w-12 h-3 bg-gray-400 dark:bg-gray-500 opacity-60"></div>
                </div>

                {/* Energy Corridor */}
                <div className="absolute top-1/2 left-8 transform -translate-y-1/2">
                  <div className="w-20 h-8 bg-gray-400 dark:bg-gray-600 opacity-75 shadow-md">
                    <div className="absolute inset-1 bg-gray-500 dark:bg-gray-700 opacity-60"></div>
                  </div>
                </div>

                {/* Suburban Areas */}
                <div className="absolute top-1/4 left-1/5 w-14 h-10 bg-yellow-100 dark:bg-yellow-700 opacity-70 shadow-inner"></div>
                <div className="absolute top-1/6 right-1/5 w-12 h-8 bg-amber-100 dark:bg-amber-700 opacity-70 shadow-inner"></div>
                <div className="absolute bottom-1/3 left-1/4 w-16 h-12 bg-yellow-50 dark:bg-yellow-800 opacity-70 shadow-inner"></div>

                {/* Forest Areas */}
                <div className="absolute top-[20%] left-[30%] w-18 h-14 bg-green-700 dark:bg-green-900 opacity-70 rounded-lg shadow-inner"></div>
                <div className="absolute bottom-[35%] right-[25%] w-14 h-18 bg-green-700 dark:bg-green-900 opacity-70 rounded-lg shadow-inner"></div>
                <div className="absolute top-[60%] left-[15%] w-12 h-10 bg-green-700 dark:bg-green-900 opacity-70 rounded-lg shadow-inner"></div>

                {/* Coastal vegetation */}
                <div className="absolute bottom-[5%] right-[45%] w-8 h-6 bg-green-600 dark:bg-green-800 opacity-60 rounded-full"></div>
                <div className="absolute bottom-[15%] right-[55%] w-10 h-8 bg-green-600 dark:bg-green-800 opacity-60 rounded-full"></div>
              </div>

            {/* Well Markers */}
            <div className="absolute inset-0">
              {wellsData.map((well) => {
                let color, bgColor;

                if (well.status === 'Operational') {
                  color = 'bg-green-500';
                  bgColor = 'bg-green-100 dark:bg-green-900/20';
                } else if (well.status === 'Warning') {
                  color = 'bg-orange-500';
                  bgColor = 'bg-orange-100 dark:bg-orange-900/20';
                } else {
                  color = 'bg-red-500';
                  bgColor = 'bg-red-100 dark:bg-red-900/20';
                }

                return (
                  <div
                    key={well.id}
                    className="absolute group cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${well.x}%`, top: `${well.y}%` }}
                  >
                    <div className={`w-4 h-4 ${color} rounded-full shadow-lg hover:scale-125 transition-transform duration-200 border-2 border-white dark:border-gray-800`}></div>

                    {/* Enhanced Tooltip */}
                    <div className={`absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${
                      well.x > 70 ? 'right-0' : well.x < 30 ? 'left-0' : 'left-1/2 transform -translate-x-1/2'
                    }`}>
                      <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-xl border border-gray-200 dark:border-gray-600 min-w-[240px]">
                        {/* Header */}
                        <div className="border-b border-gray-200 dark:border-gray-600 pb-2 mb-3">
                          <div className="text-base font-bold text-gray-900 dark:text-white">{well.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Well #{String(well.id).padStart(3, '0')}</div>
                        </div>

                        {/* Data Rows */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Production:</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{well.production.toLocaleString()} BBL/day</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Gas Pressure:</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{well.gasPressure.toLocaleString()} PSI</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Compliance:</span>
                            <span className={`text-sm font-semibold ${
                              well.status === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {well.status === 'Critical' ? 'Non-Compliant' : 'Compliant'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant Hours:</span>
                            <span className={`text-sm font-semibold ${
                              well.nonCompliantHours === 0 ? 'text-green-600 dark:text-green-400' :
                              well.nonCompliantHours < 50 ? 'text-orange-600 dark:text-orange-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {well.nonCompliantHours}h
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            well.status === 'Operational' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            well.status === 'Warning' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-1 ${color.replace('bg-', 'bg-')}`}></div>
                            {well.status === 'Operational' ? 'Normal Operations' :
                             well.status === 'Warning' ? 'Requires Attention' :
                             'Immediate Action Required'}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className={`absolute top-full w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 ${
                          well.x > 70 ? 'right-4' : well.x < 30 ? 'left-4' : 'left-1/2 transform -translate-x-1/2'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Top 10 Wells by Impact
          </h3>
        </div>

        {mounted ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Well ID
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Lost Prod.
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Hours
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Impact
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Operator
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { wellId: 'SW-Terminal-016', lostProd: '84.2 BBL', hours: '84h', impact: 'High' },
                  { wellId: 'Refinery-Junction-005', lostProd: '67.5 BBL', hours: '67h', impact: 'High' },
                  { wellId: 'Galveston-Bay-018', lostProd: '45.8 BBL', hours: '16h', impact: 'Medium' },
                  { wellId: 'Gulf-Coast-Unit-003', lostProd: '38.9 BBL', hours: '14h', impact: 'Medium' },
                  { wellId: 'Katy-Freeway-Unit-008', lostProd: '32.1 BBL', hours: '18h', impact: 'Medium' },
                  { wellId: 'Tomball-Junction-012', lostProd: '28.7 BBL', hours: '12h', impact: 'Medium' },
                  { wellId: 'Cypress-Station-022', lostProd: '24.3 BBL', hours: '9h', impact: 'Low' },
                  { wellId: 'Downtown-Central-024', lostProd: '18.5 BBL', hours: '7h', impact: 'Low' },
                  { wellId: 'Energy-Plaza-006', lostProd: '15.2 BBL', hours: '5h', impact: 'Low' },
                  { wellId: 'Memorial-Station-009', lostProd: '12.8 BBL', hours: '4h', impact: 'Low' },
                ].map((well, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                      {well.wellId}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {well.lostProd}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {well.hours}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        well.impact === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        well.impact === 'Medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {well.impact}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      Baytex
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
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</a>
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Contact: info@ayata.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}