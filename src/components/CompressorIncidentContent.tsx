'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Incident } from './CompressorTimeSeriesChart';

// Dynamically import CompressorTimeSeriesChart with SSR disabled
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
  // Incident Timeline
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const availableCompressors = [
    'Rock Creek 1',
    'Rock Creek 2',
    'Wyatt',
  ];

  const handleIncidentsGenerated = (generatedIncidents: Incident[]) => {
    setIncidents(generatedIncidents);
  };

  const getIncidentColor = (incident: Incident) => {
    switch (incident.type) {
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'capacity':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Compressor Time-Series Chart */}
      <CompressorTimeSeriesChart
        availableCompressors={availableCompressors}
        dateRange={dateRange}
        onIncidentsGenerated={handleIncidentsGenerated}
      />

      {/* Incident Timeline Card - Separate from chart */}
      {incidents.length > 0 && (
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
            <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Contact: baytex@ayata.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
