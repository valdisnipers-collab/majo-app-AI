import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import { VoteType, UserRole } from '../types';
import type { Meeting, Vote, Ballot } from '../types';

const CircularProgress: React.FC<{ 
  count: number; 
  total: number; 
  color: string; 
  size?: number; 
 }> = ({ count, total, color, size = 36 }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const radius = (size / 2) - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="2.5"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="2.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-gray-700">{count}</span>
    </div>
  );
};

interface MeetingsViewProps {
  initialVoteId?: string | null;
  initialSegment?: 'meetings' | 'voting' | null;
  onVoteConsumed?: () => void;
}

const MeetingsView: React.FC<MeetingsViewProps> = ({ initialVoteId, initialSegment, onVoteConsumed }) => {
  const { meetings, votes, ballots, castBallot, currentUser } = useStore();
  const { t, language } = useTranslation();
  const [activeSegment, setActiveSegment] = useState<'meetings' | 'voting'>('meetings');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);

  const [tempSelectionId, setTempSelectionId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const backTimerRef = useRef<number | null>(null);

  const isManager = currentUser?.role === UserRole.MANAGER;

  useEffect(() => {
    if (initialSegment) {
      setActiveSegment(initialSegment);
    }
  }, [initialSegment]);

  useEffect(() => {
    if (initialVoteId) {
      const vote = votes.find(v => v.id === initialVoteId);
      if (vote) {
        setActiveSegment('voting');
        setSelectedVote(vote);
        onVoteConsumed?.();
      }
    }
  }, [initialVoteId, votes, onVoteConsumed]);

  useEffect(() => {
    return () => {
      if (backTimerRef.current) window.clearTimeout(backTimerRef.current);
    };
  }, []);

  const isPast = (date: string) => new Date(date) < new Date();
  const formatDateTime = (d: string) => new Date(d).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU');
  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU');

  const getVoteStats = (voteId: string, options: any[]) => {
    const voteBallots = ballots.filter(b => b.voteId === voteId);
    const byOption: Record<string, number> = {};
    options.forEach(opt => {
      byOption[opt.id] = voteBallots.filter(b => 
        b.selectedOptionId === opt.id || 
        (opt.id === 'yes' && b.selectedYes === true) || 
        (opt.id === 'no' && b.selectedYes === false)
      ).length;
    });
    return { total: voteBallots.length, byOption };
  };

  if (selectedMeeting) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedMeeting(null)} className="text-blue-600 text-sm font-medium"><i className="fa-solid fa-arrow-left"></i> {t('meetings.back')}</button>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <span className={`text-[10px] font-bold px-2 py-1 rounded ${isPast(selectedMeeting.date) ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
            {isPast(selectedMeeting.date) ? t('meetings.past') : t('meetings.planned')}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">{selectedMeeting.title}</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center"><i className="fa-solid fa-calendar w-5"></i> {formatDateTime(selectedMeeting.date)}</div>
            <div className="flex items-center"><i className="fa-solid fa-location-dot w-5"></i> {selectedMeeting.location}</div>
          </div>
          <p className="mt-4 text-gray-700">{selectedMeeting.description}</p>
          <div className="mt-6">
            <h3 className="font-bold text-gray-900 mb-2 underline decoration-blue-500 decoration-2 underline-offset-4">{t('meetings.agenda')}</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              {selectedMeeting.agenda.sort((a,b) => a.order - b.order).map(item => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (selectedVote) {
    const userBallot = ballots.find(b => b.voteId === selectedVote.id && b.aptNumber === currentUser?.aptNumber);
    const hasVoted = !!userBallot;
    const now = new Date();
    const votingEnded = new Date(selectedVote.endDate) < now;
    const votingStarted = new Date(selectedVote.startDate) <= now;

    const currentSelectionId = hasVoted 
      ? userBallot!.selectedOptionId
      : tempSelectionId;

    const getVoteCount = (optionId: string) => ballots.filter(b => b.voteId === selectedVote.id && (b.selectedOptionId === optionId || (optionId === 'yes' && b.selectedYes) || (optionId === 'no' && b.selectedYes === false))).length;
    const totalVotes = ballots.filter(b => b.voteId === selectedVote.id).length;

    const handleOptionSelect = (optionId: string) => {
      if (hasVoted || votingEnded || !votingStarted || isManager) return;
      setTempSelectionId(optionId);
    };

    const handleConfirmVote = () => {
      if (hasVoted || votingEnded || !votingStarted || !tempSelectionId || isManager) return;
      
      setIsVoting(true);
      const ballot: Ballot = {
        id: Math.random().toString(36).substring(7),
        voteId: selectedVote.id,
        aptNumber: currentUser!.aptNumber,
        optionIds: [tempSelectionId],
        selectedOptionId: tempSelectionId,
        selectedYes: selectedVote.type === VoteType.YES_NO ? selectedVote.options.find(o => o.id === tempSelectionId)?.text === 'Jā' : undefined,
      };

      // Small delay for visual feedback
      setTimeout(() => {
        castBallot(ballot);
        setIsVoting(false);
        setTempSelectionId(null);
        
        // Return to list after 2 seconds
        backTimerRef.current = window.setTimeout(() => {
          setSelectedVote(null);
        }, 2000);
      }, 800);
    };

    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedVote(null); setTempSelectionId(null); }} className="text-blue-600 text-sm font-medium"><i className="fa-solid fa-arrow-left"></i> {t('meetings.back')}</button>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-bold text-gray-900 pr-4">{selectedVote.title}</h2>
            {!votingStarted && <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap">{t('admin_votes.upcoming')}</span>}
          </div>
          <p className="text-gray-600 mt-2 mb-6">{selectedVote.description}</p>
          
          <div className="space-y-3">
            {selectedVote.options.map(opt => {
              const count = getVoteCount(opt.id);
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              
              const isSelected = opt.id === currentSelectionId;
              const isMuted = currentSelectionId !== null && !isSelected;

              const isRU = language === 'ru';
              const displayLabel = (isRU && (opt.id === 'yes' || opt.text === 'Jā')) ? 'Да' : 
                                   (isRU && (opt.id === 'no' || opt.text === 'Nē')) ? 'Нет' : opt.text;

              return (
                <div key={opt.id} className="relative">
                  <button 
                    disabled={hasVoted || votingEnded || !votingStarted || isManager || isVoting}
                    onClick={() => handleOptionSelect(opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all relative z-10 flex justify-between items-center ${
                      isSelected 
                        ? 'border-green-500 bg-green-50/30 opacity-100' 
                        : isMuted 
                          ? 'border-gray-100 opacity-60' 
                          : (!votingStarted || isManager ? 'opacity-50 border-gray-100 cursor-not-allowed' : 'border-blue-100 hover:border-blue-300 opacity-100')
                    }`}
                  >
                    <span className={`font-semibold ${isSelected ? 'text-green-900' : 'text-gray-800'}`}>{displayLabel}</span>
                    {isSelected && <i className="fa-solid fa-check-circle text-green-500"></i>}
                  </button>
                  { (hasVoted || votingEnded) && (
                    <div className="absolute inset-0 bg-blue-50/50 rounded-xl transition-all" style={{ width: `${pct}%`, zIndex: 0 }}></div>
                  )}
                  { (hasVoted || votingEnded) && (
                     <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-bold px-2">
                        <span>{t('meetings.result')}</span>
                        <span>{pct}% ({count} {t('meetings.balsis')})</span>
                     </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold min-h-[50px] flex items-center justify-center">
            {isVoting ? (
              <i className="fa-solid fa-spinner fa-spin text-blue-600 text-lg"></i>
            ) : isManager ? (
              "TIKAI SKATĪŠANAS REŽĪMS"
            ) : !votingStarted ? (
              `${t('admin_votes.starts')}: ${formatDateTime(selectedVote.startDate)}`
            ) : hasVoted ? (
              <span className="text-green-600"><i className="fa-solid fa-check-double mr-1"></i> {t('meetings.footer_voted')}</span>
            ) : (tempSelectionId) ? (
              <button 
                onClick={handleConfirmVote}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-blue-100"
              >
                {t('meetings.confirm_btn')}
              </button>
            ) : votingEnded ? (
              t('meetings.footer_ended')
            ) : (
              `${t('meetings.footer_ends')}: ${formatDate(selectedVote.endDate)}`
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveSegment('meetings')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeSegment === 'meetings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
        >
          {t('meetings.tab_meetings')}
        </button>
        <button 
          onClick={() => setActiveSegment('voting')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeSegment === 'voting' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
        >
          {t('meetings.tab_voting')}
        </button>
      </div>

      {activeSegment === 'meetings' ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('meetings.header_list')}</h3>
          {meetings.map(m => (
            <button key={m.id} onClick={() => setSelectedMeeting(m)} className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 active:bg-gray-50">
               <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${isPast(m.date) ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
                  <span className="text-[10px] uppercase">{new Date(m.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU', { month: 'short' })}</span>
                  <span className="text-lg">{new Date(m.date).getDate()}</span>
               </div>
               <div className="flex-1">
                  <h4 className="font-bold text-gray-900 line-clamp-1">{m.title}</h4>
                  <p className="text-xs text-gray-400">{m.location}</p>
               </div>
               <i className="fa-solid fa-chevron-right text-gray-300"></i>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('meetings.voting_header')}</h3>
          {votes.map(v => {
            const userBallot = ballots.find(b => b.voteId === v.id && b.aptNumber === currentUser?.aptNumber);
            const hasVoted = !!userBallot;
            const isClosed = new Date(v.endDate) < new Date();
            const isUpcoming = new Date(v.startDate) > new Date();
            const stats = getVoteStats(v.id, v.options);

            // Determine what the user voted for
            let userVoteLabel = '';
            if (hasVoted && userBallot) {
              if (v.type === 'YES_NO') {
                const chosenOpt = v.options.find(o => o.id === userBallot.selectedOptionId);
                const isYes = chosenOpt?.text === 'Jā';
                userVoteLabel = isYes ? (language === 'ru' ? 'Да' : 'Jā') : (language === 'ru' ? 'Нет' : 'Nē');
              } else {
                const chosenOpt = v.options.find(o => o.id === userBallot.selectedOptionId);
                userVoteLabel = chosenOpt?.text || '';
              }
            }
            
            return (
              <button 
                key={v.id} 
                onClick={() => setSelectedVote(v)} 
                className={`w-full text-left bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all active:bg-gray-50`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 flex-1 pr-4">{v.title}</h4>
                  <div className="flex flex-col items-end space-y-1">
                    {hasVoted && (
                      <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <i className="fa-solid fa-check text-[8px]"></i>
                        {t('meetings.voted_badge')}: {userVoteLabel}
                      </span>
                    )}
                    {isUpcoming && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">{t('admin_votes.upcoming')}</span>}
                    {isClosed && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">{t('admin_votes.closed')}</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{v.description}</p>
                
                <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase mb-4">
                  <i className="fa-regular fa-calendar-check mr-1"></i>
                  {isUpcoming ? `${t('admin_votes.starts')} ${formatDate(v.startDate)}` : isClosed ? t('admin_votes.closed') : `${t('meetings.ends_at')} ${formatDate(v.endDate)}`}
                </div>

                <div className="pt-3 border-t border-gray-50 space-y-2">
                  {v.options.map(opt => {
                    const count = stats.byOption[opt.id] || 0;
                    const textLower = opt.text.toLowerCase();
                    const idLower = opt.id.toLowerCase();
                    
                    let strokeColor = "#CBD5E1"; 
                    if (idLower === 'yes' || textLower === 'jā' || textLower === 'да' || textLower === 'yes') {
                      strokeColor = "#4ADE80";
                    } else if (idLower === 'no' || textLower === 'nē' || textLower === 'нет' || textLower === 'no') {
                      strokeColor = "#F87171";
                    }

                    const isRU = language === 'ru';
                    const displayLabel = (isRU && (opt.id === 'yes' || opt.text === 'Jā')) ? 'Да' : 
                                         (isRU && (opt.id === 'no' || opt.text === 'Nē')) ? 'Нет' : opt.text;

                    return (
                      <div key={opt.id} className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-600 truncate pr-4">{displayLabel}</span>
                        <CircularProgress count={count} total={stats.total} color={strokeColor} size={32} />
                      </div>
                    );
                  })}
                  <div className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter pt-1 flex justify-between items-center">
                    <span>{t('home.results_label')}</span>
                    <span>{stats.total} {t('meetings.balsis')}</span>
                  </div>
                </div>
              </button>
            );
          })}
          {votes.length === 0 && (
             <p className="text-center py-10 text-gray-400 italic">{t('home.no_voting')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingsView;