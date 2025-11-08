'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import HomeContent from '@/components/HomeContent';
import OilImpactContent from '@/components/OilImpactContent';
import CompressorIncidentContent from '@/components/CompressorIncidentContent';

type TabType = 'home' | 'oil-impact' | 'compressor-incident';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeContent dateRange={dateRange} />;
      case 'oil-impact':
        return <OilImpactContent dateRange={dateRange} />;
      case 'compressor-incident':
        return <CompressorIncidentContent dateRange={dateRange} />;
      default:
        return <HomeContent dateRange={dateRange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onDateRangeChange={setDateRange} />

      <main className="container mx-auto px-6 py-4">
        {renderContent()}
      </main>
    </div>
  );
}