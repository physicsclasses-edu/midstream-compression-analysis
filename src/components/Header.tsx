'use client';

import { Bell, Sun, Moon, LogOut, MessageSquare, BarChart3, AlertTriangle, Calendar, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import FeedbackCapture from './FeedbackCapture';

type TabType = 'home' | 'oil-impact' | 'compressor-incident';

interface HeaderProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onDateRangeChange?: (dateRange: { from: string; to: string }) => void;
}

export default function Header({ activeTab = 'home', onTabChange, onDateRangeChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });

  useEffect(() => {
    setMounted(true);
    // Initialize date range
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
  }, []);

  const updateDateRange = (newDateRange: { from: string; to: string }) => {
    setDateRange(newDateRange);
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) {
      return 'Select Date Range';
    }
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const tabs = [
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

  if (!mounted) {
    return (
      <header className="w-full bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                NOVA
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-9 h-9"></div>
              <div className="w-9 h-9"></div>
              <div className="w-9 h-9"></div>
              <div className="w-9 h-9"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: NOVA logo (clickable) + Navigation tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onTabChange?.('home')}
              className={`text-2xl md:text-3xl font-bold tracking-tight transition-colors ${
                activeTab === 'home'
                  ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                  : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              NOVA
            </button>

            {/* Navigation tabs with rounded buttons (Google Flights style) */}
            <div className="flex items-center gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center space-x-4">
            {/* Calendar button */}
            <div className="relative">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isCalendarOpen
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar size={16} />
                <span>{formatDateRange()}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Calendar Dropdown */}
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

            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Feedback & Screenshot"
              style={{ lineHeight: '20px' }}
            >
              <MessageSquare size={20} style={{ verticalAlign: 'middle', display: 'inline-block' }} />
            </button>

            <button
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Notifications"
              style={{ lineHeight: '20px' }}
            >
              <Bell size={20} style={{ verticalAlign: 'middle', display: 'inline-block' }} />
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Toggle theme"
              style={{ lineHeight: '20px' }}
            >
              {theme === 'dark' ? <Sun size={20} style={{ verticalAlign: 'middle', display: 'inline-block' }} /> : <Moon size={20} style={{ verticalAlign: 'middle', display: 'inline-block' }} />}
            </button>

            <button
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Logout"
              style={{ lineHeight: '20px' }}
            >
              <LogOut size={20} style={{ verticalAlign: 'middle', display: 'inline-block' }} />
            </button>
          </div>
        </div>
      </div>
      <FeedbackCapture isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </header>
  );
}