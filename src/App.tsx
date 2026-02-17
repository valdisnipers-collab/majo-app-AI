import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/localStore';
import { LanguageProvider, useTranslation } from './store/LanguageContext';
import Layout from './components/Layout';
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import NotificationsView from './views/NotificationsView';
import MeetingsView from './views/MeetingsView';
import MaintenanceView from './views/MaintenanceView';
import ProfileView from './views/ProfileView';
import ActivityView from './views/ActivityView';
import ChatView from './views/ChatView';

const NavigationContainer: React.FC = () => {
  const { currentUser } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('home');
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const [pendingMaintenanceId, setPendingMaintenanceId] = useState<string | null>(null);
  const [meetingsSegment, setMeetingsSegment] = useState<'meetings' | 'voting' | null>(null);

  if (!currentUser) return <AuthView />;

  const handleNavigate = (tab: string, detailId?: string) => {
    setActiveTab(tab);
    setMeetingsSegment(null);
    if (tab === 'meetings') {
      if (detailId === 'segment:voting') setMeetingsSegment('voting');
      else if (detailId) { setPendingVoteId(detailId); setMeetingsSegment('voting'); }
    } else if (tab === 'maintenance' && detailId) setPendingMaintenanceId(detailId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeView onViewDetails={handleNavigate} />;
      case 'notifications': return <NotificationsView onViewDetails={handleNavigate} />;
      case 'meetings': return <MeetingsView initialVoteId={pendingVoteId} initialSegment={meetingsSegment} onVoteConsumed={() => setPendingVoteId(null)} />;
      case 'maintenance': return <MaintenanceView initialTopicId={pendingMaintenanceId} onTopicConsumed={() => setPendingMaintenanceId(null)} />;
      case 'profile': return <ProfileView />;
      case 'activity': return <ActivityView onBack={() => setActiveTab('home')} />;
      case 'chat': return <ChatView />;
      default: return <HomeView onViewDetails={handleNavigate} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'home': return t('tabs.home');
      case 'notifications': return t('notifications.title');
      case 'meetings': return t('meetings.tab_meetings');
      case 'maintenance': return t('maintenance.title');
      case 'profile': return t('profile.title');
      case 'activity': return t('home.activity_title');
      case 'chat': return t('chat.title');
      default: return 'Pārvaldnieks';
    }
  };

  return (
    <Layout title={getTitle()} activeTab={activeTab === 'activity' || activeTab === 'chat' ? 'home' : activeTab} onTabChange={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <StoreProvider>
      <NavigationContainer />
    </StoreProvider>
  </LanguageProvider>
);

export default App;