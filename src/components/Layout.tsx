import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import appLogo from '../assets/app2_logo.png';

const EMERGENCY_CONTACTS = [
  { key: 'manager',    icon: 'fa-house-chimney',     phone: '64639000', bg: 'bg-blue-50',   iconColor: 'text-blue-600',   border: 'border-blue-200' },
  { key: 'gas',         icon: 'fa-fire-flame-simple', phone: '114',      bg: 'bg-orange-50', iconColor: 'text-orange-500', border: 'border-orange-200' },
  { key: 'electricity', icon: 'fa-bolt-lightning',    phone: '8404',     bg: 'bg-amber-50',  iconColor: 'text-amber-500',  border: 'border-amber-200' },
  { key: 'water',       icon: 'fa-droplet',           phone: '64622016', bg: 'bg-sky-50',    iconColor: 'text-sky-500',    border: 'border-sky-200' },
  { key: 'heating',     icon: 'fa-temperature-half',  phone: '64622132', bg: 'bg-rose-50',   iconColor: 'text-rose-500',   border: 'border-rose-200' },
  { key: 'sos',         icon: 'fa-heart-pulse',       phone: '112',      bg: 'bg-red-50',    iconColor: 'text-red-600',    border: 'border-red-200' },
];

interface LayoutProps {
  children: ReactNode;
  title: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showBack?: boolean;
  onBack?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, showBack, onBack }) => {
  const { t } = useTranslation();
  const { unreadCounts, markNotificationsAsRead } = useStore();
  const [showAbout, setShowAbout] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  const handleTabClick = (tab: string) => {
    if (tab === 'notifications') markNotificationsAsRead();
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative shadow-2xl border-x border-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          {showBack && (
            <button onClick={onBack} className="mr-3 text-gray-600 active:scale-95 transition-transform">
              <i className="fa-solid fa-chevron-left text-xl"></i>
            </button>
          )}
          <img src={appLogo} alt="Mājo" className="w-8 h-8 rounded-full object-cover mr-2" />
          <div className="flex flex-col leading-none mt-1">
            <span className="text-xl font-light tracking-tight leading-none">
              <span className="text-gray-900">M</span><span style={{ color: '#5B9BD5' }}>ājo</span>
            </span>
            <span className="text-[8px] text-gray-400 font-light tracking-wide mt-0.5">Ērta tava mājokļa pārvaldība.</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowSOS(s => !s)} className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all ${showSOS ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100'}`}>
              <i className={`fa-solid ${showSOS ? 'fa-xmark' : 'fa-phone-volume'} text-sm`}></i>
            </button>
            <button onClick={() => setShowAbout(true)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:scale-90 transition-all">
              <i className="fa-solid fa-circle-question text-sm"></i>
            </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24 overflow-y-scroll px-4 pt-4 animate-in fade-in duration-500" style={{ scrollbarGutter: 'stable' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {onTabChange && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-gray-100 px-2 pt-2 safe-bottom z-50 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center h-16">
            <TabItem icon="fa-house" label={t('tabs.home')} active={activeTab === 'home'} onClick={() => handleTabClick('home')} />
            <TabItem 
              icon="fa-bell" 
              label={t('tabs.notifications')} 
              active={activeTab === 'notifications'} 
              onClick={() => handleTabClick('notifications')} 
              badge={unreadCounts.notifications > 0 ? unreadCounts.notifications : undefined}
            />
            <TabItem icon="fa-calendar" label={t('tabs.meetings')} active={activeTab === 'meetings'} onClick={() => handleTabClick('meetings')} />
            <TabItem icon="fa-tools" label={t('tabs.maintenance')} active={activeTab === 'maintenance'} onClick={() => handleTabClick('maintenance')} />
            <TabItem icon="fa-user" label={t('tabs.profile')} active={activeTab === 'profile'} onClick={() => handleTabClick('profile')} />
          </div>
        </nav>
      )}

      {/* SOS Emergency Contacts Panel — slides down from header */}
      <div
        className={`absolute left-0 right-0 z-[55] bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-500 ease-out overflow-hidden ${showSOS ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ top: '56px', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}
      >
        {/* Contacts list */}
        <div className="overflow-y-auto px-5 pt-4 pb-4" style={{ maxHeight: 'calc(85vh - 56px - 48px)' }}>
          <div className="divide-y divide-gray-100">
            {EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.key}
                href={`tel:${c.phone}`}
                className="flex items-center gap-3 py-3.5 active:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-right min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{t(`sos.${c.key}_name`)}</p>
                  <p className="text-[10px] text-gray-400 font-light leading-tight mt-0.5 truncate">{t(`sos.${c.key}_desc`)}</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5 tabular-nums">{c.phone}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                  <i className={`fa-solid ${c.icon} ${c.iconColor} text-lg`}></i>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 text-center">
          <p className="text-[10px] text-gray-400 font-light">{t('sos.footer_hint')}</p>
        </div>
      </div>
      {/* SOS backdrop */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/20 z-[54] animate-in fade-in duration-200" onClick={() => setShowSOS(false)} />
      )}

      {/* About Dropdown */}
      {showAbout && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowAbout(false)} />
          <div className="absolute top-16 right-3 z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-64 overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                <img src={appLogo} alt="Mājo" className="w-20 h-20 object-contain mb-4" />
                <h2 className="text-2xl font-light tracking-tight mb-1">
                  <span className="text-gray-900">M</span><span style={{ color: '#5B9BD5' }}>ājo</span>
                </h2>
                <p className="text-xs text-gray-400 font-light">Ērta tava mājokļa pārvaldība.</p>
                <p className="text-[10px] text-gray-300 font-light mt-0.5">{t('about.version')}</p>
              </div>
              <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center">
                <p className="text-[10px] text-gray-400 font-light">{t('about.developer')} Valdis Nipers &middot; &copy; 2026</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TabItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-1/5 space-y-1 transition-all duration-300 ${active ? 'text-blue-600' : 'text-gray-400'}`}>
    <div className={`relative ${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        <i className={`fa-solid ${icon} text-lg`}></i>
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ring-1 ring-red-100 animate-in zoom-in">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
    </div>
    <span className={`text-[9px] font-bold tracking-tight uppercase ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

export default Layout;