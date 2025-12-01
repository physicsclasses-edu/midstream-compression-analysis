'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Droplet, Droplets } from 'lucide-react';

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

// Dynamically import MultiWellMap with SSR disabled
const MultiWellMap = dynamic(() => import('./MultiWellMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
});

interface OilImpactContentProps {
  dateRange: { from: string; to: string };
}

export default function OilImpactContent({ dateRange }: OilImpactContentProps) {
  const wells = [
    'Cinco J Ranch LTD #1H',
    'Cinco J Ranch LTD #2H',
    'Garnet 1H',
    'L & J Lee #1H',
    'L & J Lee #2H',
    'L & J Lee #4H',
    'L & J Lee #5H',
    'L & J Lee #6H',
    'L & Lee Unit 7H',
    'Rock Creek Ranch #1H',
    'Rock Creek Ranch #2H',
    'Rock Creek Ranch #3H',
    'Rock Creek Ranch #4H',
    'Rock Creek Ranch #5H',
    'Rock Creek Ranch #6H',
    'Rock Creek Ranch #7H',
    'Rock Creek Ranch #8H',
    'Rock Creek Ranch #9H',
    'Rock Creek Ranch #10H',
    'Rock Creek Ranch #11H',
    'Rock Creek Ranch #12H',
    'Rock Creek Ranch #14H',
    'Rock Creek Ranch #15H',
    'Rock Creek Ranch #18H',
    'Rock Creek Ranch #20H',
    'Rock Creek Ranch #25H',
    'Flane 1H',
    'RCR Jane 5H',
    'RCR Jane 8H',
    'RCR-Wyatt #1H',
    'RCR-Wyatt #2H',
    'RCR-Wyatt #3H',
    'RCR-Wyatt #4H',
    'RCRS-Jane #1H',
    'RCRS-Jane #2H',
    'RCRS-Jane #4H',
    'RCRS-Jane #6H',
    'RCRS-Jane #7H',
    'RCRS-Fletcher #1H',
    'RCRS-Fletcher #2H',
    'RCRS-Fletcher #3H',
    'RCR-Hinton #1H',
    'RCR-Hinton #2H',
    'RCR-Hinton #3H',
    'Quartz 1H',
  ];

  // Selection mode state
  const [mode, setMode] = useState<'single' | 'multi'>('single');

  // Single well selection
  const [selectedWell, setSelectedWell] = useState(wells[0]);

  // Multi well selection
  const [selectedWells, setSelectedWells] = useState<string[]>([]);

  // Multi-well analysis state
  const [showMultiWellAnalysis, setShowMultiWellAnalysis] = useState(false);
  const [multiWellSelectedWells, setMultiWellSelectedWells] = useState<string[]>([]);
  const [multiWellAvailableWells, setMultiWellAvailableWells] = useState<string[]>([]);

  // Key to force remount of map when switching modes
  const [mapKey, setMapKey] = useState(0);

  // Update map key when switching to multi mode
  useEffect(() => {
    if (mode === 'multi') {
      setMapKey(Date.now());
    }
  }, [mode]);

  // Handler for polygon selection Next button
  const handleMultiWellNext = (selectedWellIds: string[]) => {
    setMultiWellAvailableWells(selectedWellIds); // Store all wells from polygon
    setMultiWellSelectedWells(selectedWellIds); // Initially all are selected
    setShowMultiWellAnalysis(true);
  };

  // Handler for back button from analysis view
  const handleBackToMap = () => {
    setShowMultiWellAnalysis(false);
  };

  // All metrics will be passed to the chart, which handles visibility via legend
  const allMetrics = [
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
    'Predicted Oil Production Rate (BTE)',
  ];

  return (
    <div className="space-y-4">
      {/* Mode Toggle - Above the card */}
      <div className="flex space-x-1">
        <button
          onClick={() => setMode('single')}
          className={`flex items-center space-x-2 pt-3 pb-2 px-4 text-sm border-b-[3px] transition-all duration-150 ${
            mode === 'single'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-gray-900 dark:text-white font-semibold hover:text-blue-500 dark:hover:text-blue-300 hover:border-blue-500 dark:hover:border-blue-300'
          }`}
        >
          <Droplet size={16} style={{ verticalAlign: 'middle', display: 'inline-block', marginBottom: '2px' }} />
          <span>Individual Well Analysis</span>
        </button>
        <button
          onClick={() => setMode('multi')}
          className={`flex items-center space-x-2 pt-3 pb-2 px-4 text-sm border-b-[3px] transition-all duration-150 ${
            mode === 'multi'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-gray-900 dark:text-white font-semibold hover:text-blue-500 dark:hover:text-blue-300 hover:border-blue-500 dark:hover:border-blue-300'
          }`}
        >
          <Droplets size={16} style={{ verticalAlign: 'middle', display: 'inline-block', marginBottom: '2px' }} />
          <span>Multi-Well Analysis</span>
        </button>
      </div>

      {/* Time-Series Chart or Multi Well Map */}
      {mode === 'single' ? (
        <TimeSeriesChart
          well={selectedWell}
          wells={wells}
          onWellChange={setSelectedWell}
          metrics={allMetrics}
          dateRange={dateRange}
          mode={mode}
          selectedWells={selectedWells}
          onModeChange={setMode}
          onSelectedWellsChange={setSelectedWells}
        />
      ) : showMultiWellAnalysis ? (
        <TimeSeriesChart
          well={multiWellSelectedWells[0] || wells[0]}
          wells={wells}
          onWellChange={() => {}}
          metrics={allMetrics}
          dateRange={dateRange}
          mode="multi"
          selectedWells={multiWellSelectedWells}
          availableWells={multiWellAvailableWells}
          onModeChange={setMode}
          onSelectedWellsChange={setMultiWellSelectedWells}
          onBackToMap={handleBackToMap}
          isMultiWellAnalysis={true}
        />
      ) : (
        <MultiWellMap key={mapKey} onNext={handleMultiWellNext} />
      )}

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
    </div>
  );
}