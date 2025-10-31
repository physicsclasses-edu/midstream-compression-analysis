'use client';

import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronDown, X, Filter, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Incident } from './CompressorTimeSeriesChart';

// Dynamically import CompressorTimeSeriesChart with SSR disabled to avoid hydration issues
const CompressorTimeSeriesChart = dynamic(() => import('./CompressorTimeSeriesChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
      </div>
    </div>
  ),
});

interface CompressorIncidentContentProps {
  dateRange: { from: string; to: string };
}

export default function CompressorIncidentContent({ dateRange }: CompressorIncidentContentProps) {
  const [selectedCompressors, setSelectedCompressors] = useState<string[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [isCompressorDropdownOpen, setIsCompressorDropdownOpen] = useState(false);
  const [isVariableDropdownOpen, setIsVariableDropdownOpen] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [appliedCompressors, setAppliedCompressors] = useState<string[]>([]);
  const [appliedVariables, setAppliedVariables] = useState<string[]>([]);

  // Day selection
  const [selectedDay, setSelectedDay] = useState('');
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [dateList, setDateList] = useState<string[]>([]);

  // Incident Timeline
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const compressorDropdownRef = useRef<HTMLDivElement>(null);
  const variableDropdownRef = useRef<HTMLDivElement>(null);
  const dayDropdownRef = useRef<HTMLDivElement>(null);

  // Generate date list when dateRange changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      const dates: string[] = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
        dates.push(dateString);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setDateList(dates);
      // Reset selected day when date range changes
      setSelectedDay('');
    }
  }, [dateRange]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compressorDropdownRef.current && !compressorDropdownRef.current.contains(event.target as Node)) {
        setIsCompressorDropdownOpen(false);
      }
      if (variableDropdownRef.current && !variableDropdownRef.current.contains(event.target as Node)) {
        setIsVariableDropdownOpen(false);
      }
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
        setIsDayDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const compressors = [
    'Rock Creek 1',
    'Rock Creek 2',
    'Wyatt',
  ];

  const displayVariables = [
    'Discharge Pressure (psi)',
    'Suction Pressure (psi)',
    'Gas Flow Rate (MCFD)',
    'Gas Temperature (F)',
  ];

  const toggleCompressor = (compressor: string) => {
    setSelectedCompressors((prev) =>
      prev.includes(compressor)
        ? prev.filter((c) => c !== compressor)
        : [...prev, compressor]
    );
  };

  const toggleVariable = (variable: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  const removeCompressor = (compressor: string) => {
    setSelectedCompressors((prev) => prev.filter((c) => c !== compressor));
  };

  const removeVariable = (variable: string) => {
    setSelectedVariables((prev) => prev.filter((v) => v !== variable));
  };

  const clearAllFilters = () => {
    setSelectedCompressors([]);
    setSelectedVariables([]);
    setShowChart(false);
  };

  const applyFilters = () => {
    if (selectedDay) {
      setAppliedCompressors(selectedCompressors);
      setAppliedVariables(selectedVariables);
      setShowChart(true);
    }
  };

  const handleIncidentsGenerated = (generatedIncidents: Incident[]) => {
    setIncidents(generatedIncidents);
  };

  const getIncidentColor = (incident: Incident) => {
    switch (incident.type) {
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'capacity':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Analysis Filters
            </h3>
          </div>

          {/* Day Selector Dropdown - Right aligned */}
          <div className="relative" ref={dayDropdownRef}>
            <button
              onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
              className="px-4 py-2 text-sm font-medium bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className={selectedDay ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                {selectedDay || 'Select Day'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDayDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDayDropdownOpen && dateList.length > 0 && (
              <div className="absolute right-0 z-10 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto min-w-[180px]">
                {dateList.map((date) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDay(date);
                      setIsDayDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      selectedDay === date
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compressor Multi-Selector */}
          <div className="relative" ref={compressorDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Compressors
            </label>
            <div className="relative">
              <button
                onClick={() => setIsCompressorDropdownOpen(!isCompressorDropdownOpen)}
                className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center justify-between"
              >
                <span className={selectedCompressors.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {selectedCompressors.length > 0
                    ? `${selectedCompressors.length} compressor${selectedCompressors.length > 1 ? 's' : ''} selected`
                    : 'Choose compressors...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isCompressorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCompressorDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {compressors.map((compressor) => (
                    <label
                      key={compressor}
                      className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompressors.includes(compressor)}
                        onChange={() => toggleCompressor(compressor)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-600 dark:border-gray-500"
                      />
                      <span className="ml-3 text-gray-900 dark:text-white">
                        {compressor}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Display Variables Multi-Selector */}
          <div className="relative" ref={variableDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Display Variables
            </label>
            <div className="relative">
              <button
                onClick={() => setIsVariableDropdownOpen(!isVariableDropdownOpen)}
                className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center justify-between"
              >
                <span className={selectedVariables.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {selectedVariables.length > 0
                    ? `${selectedVariables.length} variable${selectedVariables.length > 1 ? 's' : ''} selected`
                    : 'Choose variables...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isVariableDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isVariableDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {displayVariables.map((variable) => (
                    <label
                      key={variable}
                      className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVariables.includes(variable)}
                        onChange={() => toggleVariable(variable)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-600 dark:border-gray-500"
                      />
                      <span className="ml-3 text-gray-900 dark:text-white">
                        {variable}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Items Tags */}
        {(selectedCompressors.length > 0 || selectedVariables.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {selectedCompressors.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Compressors:
                  </span>
                  <button
                    onClick={() => setSelectedCompressors([])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCompressors.map((compressor) => (
                    <span
                      key={compressor}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm"
                    >
                      {compressor}
                      <button
                        onClick={() => removeCompressor(compressor)}
                        className="hover:bg-green-200 dark:hover:bg-green-800/30 rounded-full p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedVariables.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Variables:
                  </span>
                  <button
                    onClick={() => setSelectedVariables([])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedVariables.map((variable) => (
                    <span
                      key={variable}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                    >
                      {variable}
                      <button
                        onClick={() => removeVariable(variable)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800/30 rounded-full p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={applyFilters}
            disabled={selectedCompressors.length === 0 || selectedVariables.length === 0 || !selectedDay}
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

      {/* Compressor Time-Series Chart */}
      {showChart && selectedDay && (
        <CompressorTimeSeriesChart
          compressors={appliedCompressors}
          variables={appliedVariables}
          selectedDay={selectedDay}
          onIncidentsGenerated={handleIncidentsGenerated}
        />
      )}

      {/* Incident Timeline Card - Separate from chart */}
      {showChart && selectedDay && incidents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Incident Timeline
          </h4>
          <div className="space-y-3">
            {incidents.map((incident, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className={`px-3 py-1 rounded-md border font-semibold text-sm whitespace-nowrap ${getIncidentColor(incident)}`}>
                  {incident.startTime} - {incident.endTime}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {incident.description}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Duration: {incident.duration} hour{incident.duration > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
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