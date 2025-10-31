'use client';

import { ChevronDown, X, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import TimeSeriesChart with SSR disabled to avoid hydration issues
const TimeSeriesChart = dynamic(() => import('./TimeSeriesChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
      </div>
    </div>
  ),
});

export default function OilImpactContent() {
  const [selectedWell, setSelectedWell] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isWellDropdownOpen, setIsWellDropdownOpen] = useState(false);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [appliedWell, setAppliedWell] = useState('');
  const [appliedMetrics, setAppliedMetrics] = useState<string[]>([]);

  const wellDropdownRef = useRef<HTMLDivElement>(null);
  const metricDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wellDropdownRef.current && !wellDropdownRef.current.contains(event.target as Node)) {
        setIsWellDropdownOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target as Node)) {
        setIsMetricDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wells = [
    'Well-A12',
    'Well-B08',
    'Well-C15',
    'Well-D04',
    'Well-E21',
    'Well-F18',
    'Well-G09',
    'Well-H14',
  ];

  const metrics = [
    'Line Pressure',
    'Gas Injection Pressure',
    'Gas Injection Rate',
    'Choke',
    'Casing Pressure',
    'Tubing Pressure',
    'Oil Production Rate',
    'Water Production Rate',
    'Gas Production Rate',
    'Predicted Oil Production Rate',
  ];

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const removeMetric = (metric: string) => {
    setSelectedMetrics((prev) => prev.filter((m) => m !== metric));
  };

  const clearAllFilters = () => {
    setSelectedWell('');
    setSelectedMetrics([]);
    setShowChart(false);
  };

  const applyFilters = () => {
    setAppliedWell(selectedWell);
    setAppliedMetrics(selectedMetrics);
    setShowChart(true);
  };

  return (
    <div className="space-y-8">
      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Analysis Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Well Selector */}
          <div className="relative" ref={wellDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Well
            </label>
            <div className="relative">
              <button
                onClick={() => setIsWellDropdownOpen(!isWellDropdownOpen)}
                className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center justify-between"
              >
                <span className={selectedWell ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {selectedWell || 'Choose a well...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isWellDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isWellDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {wells.map((well) => (
                    <button
                      key={well}
                      onClick={() => {
                        setSelectedWell(well);
                        setIsWellDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                        selectedWell === well
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {well}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics Multi-Selector */}
          <div className="relative" ref={metricDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Metrics
            </label>
            <div className="relative">
              <button
                onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
                className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center justify-between"
              >
                <span className={selectedMetrics.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {selectedMetrics.length > 0
                    ? `${selectedMetrics.length} metric${selectedMetrics.length > 1 ? 's' : ''} selected`
                    : 'Choose metrics...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isMetricDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMetricDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {metrics.map((metric) => (
                    <label
                      key={metric}
                      className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric)}
                        onChange={() => toggleMetric(metric)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-600 dark:border-gray-500"
                      />
                      <span className="ml-3 text-gray-900 dark:text-white">
                        {metric}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Metrics Tags */}
        {selectedMetrics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected Metrics:
              </span>
              <button
                onClick={() => setSelectedMetrics([])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMetrics.map((metric) => (
                <span
                  key={metric}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                >
                  {metric}
                  <button
                    onClick={() => removeMetric(metric)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800/30 rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={applyFilters}
            disabled={!selectedWell || selectedMetrics.length === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            Apply Filters
          </button>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Time-Series Chart */}
      {showChart && (
        <TimeSeriesChart well={appliedWell} metrics={appliedMetrics} />
      )}

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