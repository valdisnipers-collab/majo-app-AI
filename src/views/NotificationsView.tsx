
import React, { useState } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import { NotificationType, UserRole } from '../types';
import type { Notification } from '../types';

interface NotificationsViewProps {
  onViewDetails?: (tab: string, detailId?: string) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onViewDetails }) => {
  const { notifications, archivedNotifications, currentUser, deleteNotification } = useStore();
  const { t, language } = useTranslation();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const formatDateTime = (d: string) => new Date(d).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU');
  
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  const handleNotificationClick = (n: Notification) => {
    if (n.type === NotificationType.NEW_REQUEST && n.relatedId && isManager && onViewDetails) {
      onViewDetails('maintenance', n.relatedId);
      return;
    }
    setSelected(n);
  };

  const getEmergencyColors = (status?: string) => {
    if (status === 'resolved') return { bg: 'bg-green-50', border: 'border-green-200', ring: 'ring-green-100', badge: 'bg-green-600', title: 'text-green-900', icon: 'text-green-600' };
    if (status === 'in_progress') return { bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-100', badge: 'bg-amber-500', title: 'text-amber-900', icon: 'text-amber-600' };
    return { bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-100', badge: 'bg-red-600', title: 'text-red-900', icon: 'text-red-600' };
  };

  if (selected) {
    const selColors = selected.isEmergency ? getEmergencyColors(selected.emergencyStatus) : null;
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center text-blue-600 text-sm font-medium mb-2">
          <i className="fa-solid fa-arrow-left mr-2"></i> {t('notifications.back')}
        </button>
        <div className={`p-6 rounded-3xl shadow-sm ${selColors ? `${selColors.bg} border ${selColors.border}` : 'bg-white border border-gray-100'}`}>
          <div className="flex items-center space-x-2 mb-4">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
              selColors ? `${selColors.badge} text-white` : 'bg-blue-100 text-blue-600'
            }`}>
              {selected.isEmergency ? t('notifications.type_emergency') : (selected.type === NotificationType.NEW_REQUEST ? 'Tehniskais' : selected.type)}
            </span>
            {selected.isEmergency && selected.emergencyStatus && (
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${selColors!.badge} text-white`}>
                {t(`emergency.status_${selected.emergencyStatus}`)}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDateTime(selected.date)}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{selected.title}</h2>
          <div className="prose prose-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {selected.content}
          </div>
          {selected.relatedId && isManager && onViewDetails && (
            <button 
              onClick={() => onViewDetails('maintenance', selected.relatedId)}
              className="mt-6 w-full py-3 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-transform text-sm"
            >
              Atvērt pieteikumu
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-light text-gray-900 mb-4">{t('notifications.title')}</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-10 text-gray-400 italic">{t('notifications.no_items')}</div>
      ) : (
        notifications.map(n => {
          const eColors = n.isEmergency ? getEmergencyColors(n.emergencyStatus) : null;
          const remaining = n.resolvedAt ? Math.max(0, 48 * 60 * 60 * 1000 - (Date.now() - new Date(n.resolvedAt).getTime())) : null;
          const hoursLeft = remaining !== null ? Math.ceil(remaining / (60 * 60 * 1000)) : null;
          return (
          <button 
            key={n.id} 
            onClick={() => handleNotificationClick(n)}
            className={`w-full text-left p-4 rounded-2xl shadow-sm border transition-all active:scale-[0.98] ${
              eColors ? `${eColors.bg} ${eColors.border} ring-1 ${eColors.ring}` : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className={`font-bold ${eColors ? eColors.title : 'text-gray-900'}`}>{n.title}</h3>
              <div className="flex items-center space-x-1.5">
                {n.isEmergency && n.emergencyStatus && (
                  <span className={`${eColors!.badge} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase`}>
                    {t(`emergency.status_${n.emergencyStatus}`)}
                  </span>
                )}
                {n.isEmergency && <i className={`fa-solid fa-circle-exclamation ${eColors!.icon}`}></i>}
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{n.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-[10px] text-gray-400 font-medium">
                <i className="fa-regular fa-clock mr-1"></i>
                {formatDateTime(n.date)}
              </div>
              {hoursLeft !== null && hoursLeft > 0 && (
                <span className="text-[9px] text-gray-300 font-medium">
                  <i className="fa-solid fa-box-archive mr-1"></i>{t('notifications.archive_in')} {hoursLeft}h
                </span>
              )}
            </div>
          </button>
          );
        })
      )}

      {/* Archive section */}
      {archivedNotifications.length > 0 && (
        <div className="pt-4">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center justify-between w-full text-sm text-gray-400 font-medium py-2"
          >
            <span><i className="fa-solid fa-box-archive mr-2"></i>{t('notifications.archive')} ({archivedNotifications.length})</span>
            <i className={`fa-solid fa-chevron-${showArchive ? 'up' : 'down'} text-xs`}></i>
          </button>
          {showArchive && (
            <div className="space-y-2 mt-2">
              {archivedNotifications.map(n => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-500 truncate">{n.title}</p>
                    <p className="text-[10px] text-gray-300">{formatDateTime(n.date)}</p>
                  </div>
                  {isManager && (
                    <button 
                      onClick={() => deleteNotification(n.id)} 
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
