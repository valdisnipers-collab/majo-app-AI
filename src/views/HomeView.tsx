import React, { useState, useEffect } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import { UserRole, MaintenanceStatus } from '../types';
import type { ActivityLog, Vote } from '../types';

const ActivityIcon = ({ type }: { type: ActivityLog['type'] }) => {
  switch (type) {
    case 'maintenance': return <i className="fa-solid fa-tools text-blue-500"></i>;
    case 'announcement': return <i className="fa-solid fa-bullhorn text-orange-500"></i>;
    case 'meeting': return <i className="fa-solid fa-calendar text-purple-500"></i>;
    case 'vote': return <i className="fa-solid fa-check-to-slot text-green-500"></i>;
    case 'chat': return <i className="fa-solid fa-comments text-indigo-500"></i>;
    default: return <i className="fa-solid fa-info-circle text-gray-500"></i>;
  }
};

const formatRelativeTime = (dateStr: string, _t?: any) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'tikko';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min. atpakaļ`;
  
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return `šodien ${timeStr}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `vakar ${timeStr}`;
  
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

const STAT_COLORS: Record<string, { bg: string; iconBg: string; iconText: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   ring: 'ring-blue-200' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', ring: 'ring-purple-200' },
  green:  { bg: 'bg-green-50',  iconBg: 'bg-green-100',  iconText: 'text-green-600',  ring: 'ring-green-200' },
  indigo: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', ring: 'ring-indigo-200' },
};

const HomeView: React.FC<{ onViewDetails: (tab: string, detailId?: string) => void }> = ({ onViewDetails }) => {
  const { notifications, meetings, votes, ballots, currentUser, activityLogs, chatTopics, maintenanceTopics } = useStore();
  const { t, language } = useTranslation();

  const now = new Date();
  const emergencyNotifications = notifications.filter(n => n.isEmergency && n.emergencyStatus !== 'resolved');
  const nextMeeting = meetings.find(m => new Date(m.date) >= now) || meetings[0];

  // Maintenance: show active (NEW, APPROVED) + recently resolved/rejected (within 24h)
  const ARCHIVE_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours
  const visibleMaintenance = maintenanceTopics.filter(topic => {
    if (topic.status === MaintenanceStatus.NEW || topic.status === MaintenanceStatus.APPROVED) return true;
    if (topic.status === MaintenanceStatus.RESOLVED || topic.status === MaintenanceStatus.REJECTED) {
      if (topic.statusChangedAt) {
        return (now.getTime() - new Date(topic.statusChangedAt).getTime()) < ARCHIVE_DELAY_MS;
      }
      return false; // no timestamp = already archived
    }
    return false;
  });
  
  const activeVotesList = votes.filter(v => now >= new Date(v.startDate) && now <= new Date(v.endDate));
  const upcomingVotesList = votes.filter(v => now < new Date(v.startDate));
  const recentlyEndedVotes = votes.filter(v => {
    const ended = new Date(v.endDate);
    return now > ended && (now.getTime() - ended.getTime()) <= 48 * 60 * 60 * 1000;
  });
  const displayVotes = [...activeVotesList, ...recentlyEndedVotes, ...upcomingVotesList.slice(0, 1)];

  const activeVotesCount = activeVotesList.length;
  const isManager = currentUser?.role === UserRole.MANAGER;

  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU');
  const formatTime = (d: string) => new Date(d).toLocaleTimeString(language === 'lv' ? 'lv-LV' : 'ru-RU', { hour: '2-digit', minute: '2-digit' });

  const getVoteCounts = (vote: Vote) => {
    const voteBallots = ballots.filter(b => b.voteId === vote.id);
    const byOption: Record<string, number> = {};
    vote.options.forEach(opt => {
      byOption[opt.id] = voteBallots.filter(b => b.selectedOptionId === opt.id || (opt.id === 'yes' && b.selectedYes === true) || (opt.id === 'no' && b.selectedYes === false)).length;
    });
    return { total: voteBallots.length, byOption };
  };

  const recentActivity = activityLogs.slice(0, 4);

  return (
    <div className="space-y-6 pb-4">
      <section className="animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('home.welcome')}</h2>
            <p className="text-2xl font-light text-gray-900">{currentUser?.fullName}!</p>
            {currentUser?.role !== UserRole.MANAGER && <p className="text-gray-500 text-sm">{t('home.apartment')}{currentUser?.aptNumber}</p>}
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center space-x-1 text-[9px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span>Online</span>
             </div>
             <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-tighter">LV Cloud Server 1</p>
          </div>
        </div>
      </section>

      {emergencyNotifications.length > 0 && (
        <section className="space-y-3 animate-in zoom-in duration-300">
          {emergencyNotifications.slice(0, 2).map(n => {
            const status = n.emergencyStatus || 'active';
            const colors = status === 'resolved'
              ? { bg: 'bg-green-50', border: 'border-green-200', shadow: 'shadow-green-100', title: 'text-green-700', heading: 'text-green-900', text: 'text-green-700', icon: 'fa-circle-check', badge: 'bg-green-600' }
              : status === 'in_progress'
              ? { bg: 'bg-amber-50', border: 'border-amber-200', shadow: 'shadow-amber-100', title: 'text-amber-700', heading: 'text-amber-900', text: 'text-amber-700', icon: 'fa-clock', badge: 'bg-amber-500' }
              : { bg: 'bg-red-50', border: 'border-red-200', shadow: 'shadow-red-100', title: 'text-red-700', heading: 'text-red-900', text: 'text-red-700', icon: 'fa-triangle-exclamation', badge: 'bg-red-600' };
            return (
              <div key={n.id} className={`${colors.bg} border ${colors.border} rounded-2xl p-4 shadow-sm ${colors.shadow}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center ${colors.title} font-bold`}>
                    <i className={`fa-solid ${colors.icon} mr-2 ${status === 'active' ? 'animate-bounce' : ''}`}></i>
                    <h3>{t('home.emergency_title')}</h3>
                  </div>
                  <span className={`${colors.badge} text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                    {t(`emergency.status_${status}`)}
                  </span>
                </div>
                <p className={`font-semibold ${colors.heading} text-sm`}>{n.title}</p>
                <p className={`${colors.text} text-xs line-clamp-1`}>{n.content}</p>
              </div>
            );
          })}
        </section>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
            icon="fa-bullhorn" 
            value={notifications.length} 
            label={t('home.stats_notifications')} 
            color="blue" 
            onClick={() => onViewDetails('notifications')} 
            hasUpdate={notifications.some(n => new Date(n.date).getTime() > Date.now() - 86400000)}
        />
        <StatCard 
            icon="fa-calendar-days" 
            value={meetings.length} 
            label={t('home.stats_meetings')} 
            color="purple" 
            onClick={() => onViewDetails('meetings')} 
        />
        <StatCard 
            icon="fa-check-to-slot" 
            value={activeVotesCount} 
            label={t('home.stats_voting')} 
            color="green" 
            onClick={() => onViewDetails('meetings', 'segment:voting')} 
        />
        <StatCard 
            icon="fa-comments" 
            value={chatTopics.length} 
            label={t('home.stats_chat')} 
            color="indigo" 
            onClick={() => onViewDetails('chat')} 
        />
      </div>

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">{t('home.activity_title')}</h3>
          <button onClick={() => onViewDetails('activity')} className="text-xs font-bold text-blue-600 active:opacity-60">{t('home.view_all')}</button>
        </div>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map(log => (
              <div key={log.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm">
                  <ActivityIcon type={log.type} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-800">{log.message}</p>
                  <p className="text-[10px] text-gray-400">{formatRelativeTime(log.createdAt, t)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic py-2">Nav datus par nesenām darbībām.</p>
          )}
        </div>
      </section>

      {/* Maintenance Requests Section */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-800">{t('home.maintenance_title')}</h3>
          <button onClick={() => onViewDetails('maintenance')} className="text-xs font-bold text-blue-600 active:opacity-60">{t('home.view_all')}</button>
        </div>
        {visibleMaintenance.length > 0 ? (
          <div className="space-y-3">
            {visibleMaintenance.slice(0, 5).map(topic => {
              const isArchiving = topic.status === MaintenanceStatus.RESOLVED || topic.status === MaintenanceStatus.REJECTED;
              const hoursLeft = topic.statusChangedAt ? Math.max(0, Math.ceil((24 - (now.getTime() - new Date(topic.statusChangedAt).getTime()) / 3600000))) : 0;

              const statusConfig: Record<string, { bg: string; text: string; icon: string; border: string }> = {
                [MaintenanceStatus.NEW]: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'fa-clock', border: 'border-amber-200' },
                [MaintenanceStatus.APPROVED]: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'fa-circle-check', border: 'border-blue-200' },
                [MaintenanceStatus.RESOLVED]: { bg: 'bg-green-50', text: 'text-green-700', icon: 'fa-check-double', border: 'border-green-200' },
                [MaintenanceStatus.REJECTED]: { bg: 'bg-red-50', text: 'text-red-700', icon: 'fa-circle-xmark', border: 'border-red-200' },
              };
              const cfg = statusConfig[topic.status] || statusConfig[MaintenanceStatus.NEW];

              const statusLabel = (() => {
                switch (topic.status) {
                  case MaintenanceStatus.NEW: return t('maintenance.status_new');
                  case MaintenanceStatus.APPROVED: return t('maintenance.status_approved');
                  case MaintenanceStatus.RESOLVED: return t('maintenance.status_resolved');
                  case MaintenanceStatus.REJECTED: return t('maintenance.status_rejected');
                  default: return topic.status;
                }
              })();

              return (
                <div
                  key={topic.id}
                  onClick={() => onViewDetails('maintenance', topic.id)}
                  className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer ${isArchiving ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <i className={`fa-solid ${cfg.icon} ${cfg.text}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{topic.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{topic.category}</span>
                          {topic.priority === 'urgent' && (
                            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">!</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                        {statusLabel}
                      </span>
                      {isArchiving && hoursLeft > 0 && (
                        <span className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5">
                          <i className="fa-regular fa-clock text-[8px]"></i>
                          {t('home.archive_in')} {hoursLeft}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200 text-center">
            <i className="fa-solid fa-wrench text-gray-300 text-2xl mb-2"></i>
            <p className="text-gray-400 text-sm">{t('home.no_maintenance')}</p>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-3">{t('home.next_meeting')}</h3>
        {nextMeeting ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors" onClick={() => onViewDetails('meetings')}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-medium">{t('home.date')}</span>
                <span className="text-sm font-semibold">{formatDate(nextMeeting.date)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-gray-400 font-medium">{t('home.time')}</span>
                <span className="text-sm font-semibold">{formatTime(nextMeeting.date)}</span>
              </div>
            </div>
            <h4 className="font-bold text-gray-900 mb-1">{nextMeeting.title}</h4>
            <p className="text-gray-500 text-sm line-clamp-2">{nextMeeting.description}</p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">{t('home.no_meetings')}</p>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-3">{t('home.active_voting')}</h3>
        {displayVotes.length > 0 ? (
          <div className="space-y-4">
            {displayVotes.map(vote => {
              const hasVoted = ballots.some(b => b.voteId === vote.id && b.aptNumber === currentUser?.aptNumber);
              const voteStats = getVoteCounts(vote);
              const isUpcoming = now < new Date(vote.startDate);
              const isEnded = now > new Date(vote.endDate);
              const isActive = !isUpcoming && !isEnded;

              return (
                <div key={vote.id}>
                  <div className={`p-5 rounded-2xl shadow-md text-white ${isEnded ? 'bg-gradient-to-br from-gray-500 to-gray-700' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold">{vote.title}</h4>
                      {isUpcoming && <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{t('admin_votes.upcoming')}</span>}
                      {isEnded && <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{t('admin_votes.closed')}</span>}
                    </div>
                    <p className="text-white/80 text-sm mb-3 line-clamp-2">{vote.description}</p>
                    
                    {/* Countdown / time info */}
                    {isActive && <VoteCountdown endDate={vote.endDate} t={t} language={language} />}
                    {isUpcoming && (
                      <div className="bg-white/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-[11px]">
                        <i className="fa-regular fa-clock text-white/60"></i>
                        <span className="text-white/80">{t('home.vote_starts')}: {formatDate(vote.startDate)} {formatTime(vote.startDate)}</span>
                      </div>
                    )}
                    {isEnded && (
                      <div className="bg-white/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-[11px]">
                        <i className="fa-solid fa-flag-checkered text-white/60"></i>
                        <span className="text-white/80">{t('home.vote_ended_at')}: {formatDate(vote.endDate)} {formatTime(vote.endDate)}</span>
                      </div>
                    )}
                    
                    <div className="bg-white/10 rounded-xl p-3 mb-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{t('home.results_label')}</p>
                      {vote.options.map(opt => {
                        const count = voteStats.byOption[opt.id] || 0;
                        const pct = voteStats.total > 0 ? Math.round((count / voteStats.total) * 100) : 0;
                        const textLower = opt.text.toLowerCase();
                        const idLower = opt.id.toLowerCase();
                        const isYes = idLower === 'yes' || textLower === 'jā' || textLower === 'да';
                        const isNo = idLower === 'no' || textLower === 'nē' || textLower === 'нет';
                        const barColor = isYes ? 'bg-green-400' : isNo ? 'bg-red-400' : 'bg-blue-300';
                        const isRU = language === 'ru';
                        const displayLabel = (isRU && (opt.id === 'yes' || opt.text === 'Jā')) ? 'Да' : (isRU && (opt.id === 'no' || opt.text === 'Nē')) ? 'Нет' : opt.text;

                        // Determine if this option is the winner (for ended votes)
                        const isWinner = isEnded && voteStats.total > 0 && count === Math.max(...vote.options.map(o => voteStats.byOption[o.id] || 0));

                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-bold truncate ${isWinner ? 'text-white' : 'text-white/80'}`}>{displayLabel}</span>
                              <span className={`text-xs font-bold tabular-nums ${isWinner ? 'text-white' : 'text-white/60'}`}>{pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${isWinner ? 'opacity-100' : 'opacity-70'}`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              ></div>
                            </div>
                            {(isEnded || hasVoted) && (
                              <p className="text-[9px] text-white/40 font-bold mt-0.5 text-right">{count} {t('meetings.balsis')}</p>
                            )}
                          </div>
                        );
                      })}
                      {voteStats.total > 0 && (
                        <div className="text-[9px] text-white/40 font-bold uppercase pt-1 text-right border-t border-white/10 mt-1">{t('home.total_votes')}: {voteStats.total}</div>
                      )}
                    </div>
                    {isEnded ? (
                      <button onClick={() => onViewDetails('meetings', vote.id)} className="w-full bg-white/15 text-white font-bold py-2 rounded-xl text-center text-sm border border-white/20">
                        {t('home.view_details')} <i className="fa-solid fa-chevron-right ml-1 text-[10px]"></i>
                      </button>
                    ) : hasVoted ? (
                      <button onClick={() => onViewDetails('meetings', vote.id)} className="w-full bg-white/20 text-white font-bold py-2 rounded-xl text-center text-sm border border-white/30">
                        {t('home.already_voted')} <i className="fa-solid fa-chevron-right ml-1 text-[10px]"></i>
                      </button>
                    ) : isManager ? (
                      <div className="w-full bg-white/10 text-white/60 font-bold py-2 rounded-xl text-center text-sm border border-white/10">Lomu piekļuves ierobežojums</div>
                    ) : isUpcoming ? (
                      <div className="w-full bg-white/10 text-white/60 font-bold py-2 rounded-xl text-center text-sm border border-white/10">{t('home.vote_not_started')}</div>
                    ) : (
                      <button onClick={() => onViewDetails('meetings', vote.id)} className="w-full bg-white text-blue-600 font-bold py-2 rounded-xl active:scale-95 transition-transform">{t('home.participate')}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-100 p-5 rounded-2xl border-2 border-dashed border-gray-200 text-center">
            <p className="text-gray-400 text-sm italic">{t('home.no_voting')}</p>
          </div>
        )}
      </section>
    </div>
  );
};

const VoteCountdown: React.FC<{ endDate: string; t: (key: string) => string; language: string }> = ({ endDate, t, language }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const end = new Date(endDate).getTime();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('—'); return; }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}${language === 'ru' ? 'д' : 'd'}`);
      if (hours > 0) parts.push(`${hours}${language === 'ru' ? 'ч' : 'h'}`);
      parts.push(`${mins}${language === 'ru' ? 'м' : 'min'}`);
      setTimeLeft(parts.join(' '));
    };
    calc();
    const interval = setInterval(calc, 60_000);
    return () => clearInterval(interval);
  }, [endDate, language]);

  return (
    <div className="bg-white/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-[11px]">
      <i className="fa-solid fa-hourglass-half text-white/60 animate-pulse"></i>
      <span className="text-white/90 font-bold">{t('home.time_remaining')}: {timeLeft}</span>
    </div>
  );
};

const StatCard: React.FC<{
  icon: string; value: number; label: string; color: string;
  onClick: () => void; hasUpdate?: boolean
}> = ({ icon, value, label, color, onClick, hasUpdate }) => {
  const colors = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <button onClick={onClick} className={`${colors.bg} p-4 rounded-2xl border border-gray-100/50 flex flex-col items-center justify-center min-h-[130px] active:scale-95 transition-all relative group shadow-sm`}>
      {hasUpdate && (
        <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
      )}
      <div className={`${colors.iconBg} w-12 h-12 rounded-2xl ${colors.iconText} mb-3 flex items-center justify-center group-active:scale-110 transition-transform ring-2 ${colors.ring}`}>
        <i className={`fa-solid ${icon} text-xl`}></i>
      </div>
      <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
      <span className="text-[10px] text-gray-500 font-semibold uppercase mt-1.5 tracking-tight text-center">{label}</span>
      <div className={`absolute -bottom-1 -right-1 w-8 h-8 ${colors.iconBg} rounded-full opacity-30`}></div>
    </button>
  );
};

export default HomeView;