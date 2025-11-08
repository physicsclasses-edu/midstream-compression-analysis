'use client';

import { useState, useEffect } from 'react';
import { Home, BarChart3, AlertTriangle, Calendar, ChevronDown } from 'lucide-react';

type TabType = 'home' | 'oil-impact' | 'compressor-incident';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onDateRangeChange?: (dateRange: { from: string; to: string }) => void;
}

export default function Navigation({ activeTab, onTabChange, onDateRangeChange }: NavigationProps) {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Initialize date range on client side only to avoid hydration issues
  useEffect(() => {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
    const initialDateRange = {
      from: ninetyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
    setDateRange(initialDateRange);
    if (onDateRangeChange) {
      onDateRangeChange(initialDateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent of date range changes
  const updateDateRange = (newDateRange: { from: string; to: string }) => {
    setDateRange(newDateRange);
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
  };

  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Home',
      icon: Home,
    },
    {
      id: 'oil-impact' as TabType,
      label: 'Oil Impact Details',
      icon: BarChart3,
    },
    {
      id: 'compressor-incident' as TabType,
      label: 'Compressor Incident Details',
      icon: AlertTriangle,
    },
  ];

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) {
      return 'Select Date Range';
    }
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="w-full px-6 py-4">
      <nav className="container mx-auto">
        <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center space-x-2 pt-3 pb-2 px-4 text-base border-b-[3px] transition-all duration-150 tab-button ${
                      isActive ? 'tab-active' : 'tab-inactive'
                    }`}
                    style={{ paddingBottom: '0.5rem' }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Calendar Date Range Picker - Available on all tabs */}
            <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDateRange()}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Date Range Inputs Dropdown */}
                  {isCalendarOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[300px] z-50">
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Date Range</div>

                        {/* Quick Select Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <button
                            onClick={() => {
                              const today = new Date();
                              const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                              updateDateRange({
                                from: thirtyDaysAgo.toISOString().split('T')[0],
                                to: today.toISOString().split('T')[0]
                              });
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                          >
                            Last 30 Days
                          </button>
                          <button
                            onClick={() => {
                              const today = new Date();
                              const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
                              updateDateRange({
                                from: ninetyDaysAgo.toISOString().split('T')[0],
                                to: today.toISOString().split('T')[0]
                              });
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-500 transition-colors"
                          >
                            Last 90 Days
                          </button>
                          <button
                            onClick={() => {
                              const today = new Date();
                              const sixMonthsAgo = new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));
                              updateDateRange({
                                from: sixMonthsAgo.toISOString().split('T')[0],
                                to: today.toISOString().split('T')[0]
                              });
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                          >
                            Last 6 Months
                          </button>
                        </div>

                        {/* Custom Date Inputs */}
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                            <input
                              type="date"
                              value={dateRange.from}
                              onChange={(e) => updateDateRange({ ...dateRange, from: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                            <input
                              type="date"
                              value={dateRange.to}
                              onChange={(e) => updateDateRange({ ...dateRange, to: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
      </nav>

      <style jsx>{`
        .tab-active {
          border-color: #2F80ED;
          color: #2F80ED;
          font-weight: 600;
        }

        .tab-inactive {
          border-color: transparent;
          color: #111827;
          font-weight: 500;
        }

        .tab-inactive:hover {
          color: #4C9AFF;
          border-color: #4C9AFF;
        }

        :global(.dark) .tab-active {
          border-color: #4C9AFF;
          color: #F5F7FA;
        }

        :global(.dark) .tab-inactive {
          color: #A0A9B8;
        }

        :global(.dark) .tab-inactive:hover {
          color: #5BAEFF;
          border-color: #5BAEFF;
        }
      `}</style>
    </div>
  );
}