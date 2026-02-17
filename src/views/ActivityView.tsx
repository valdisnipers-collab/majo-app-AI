
import React from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import type { ActivityLog } from '../types';

const ActivityIcon = ({ type }: { type: ActivityLog['type'] }) => {
  switch (type) {
    case 'maintenance': return <i className="fa-solid fa-tools text-blue-500"></i>;
    case 'announcement': return <i className="fa-solid fa-bullhorn text-orange-500"></i>;
    case 'meeting': return <i className="fa-solid fa-calendar text-purple-500"></i>;
    case 'vote': return <i className="fa-solid fa-check-to-slot text-green-500"></i>;
    default: return <i className="fa-solid fa-info-circle text-gray-500"></i>;
  }
};

const formatFullTime = (dateStr: string, language: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ActivityView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { activityLogs } = useStore();
  const { t, language } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button onClick={onBack} className="text-blue-600 mr-4">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-light text-gray-900">{t('home.activity_title')}</h2>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        {activityLogs.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start space-x-4 active:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex-shrink-0 flex items-center justify-center text-lg">
                  <ActivityIcon type={log.type} />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-bold text-gray-800 leading-snug">{log.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatFullTime(log.createdAt, language)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <i className="fa-solid fa-clock-rotate-left text-gray-200 text-4xl mb-4"></i>
            <p className="text-gray-400 italic">Darbību vēsture ir tukša.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityView;
