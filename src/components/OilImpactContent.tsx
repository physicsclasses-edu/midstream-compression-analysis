'use client';

import { useState } from 'react';
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

interface OilImpactContentProps {
  dateRange: { from: string; to: string };
}

export default function OilImpactContent({ dateRange }: OilImpactContentProps) {
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

  // Set first well as default
  const [selectedWell, setSelectedWell] = useState(wells[0]);

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
  ];

  return (
    <div className="space-y-8">
      {/* Time-Series Chart with embedded well selector */}
      <TimeSeriesChart
        well={selectedWell}
        wells={wells}
        onWellChange={setSelectedWell}
        metrics={allMetrics}
        dateRange={dateRange}
      />

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