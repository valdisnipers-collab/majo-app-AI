import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from './LanguageContext';
import {
  MaintenanceStatus
} from '../types';
import type {
  UserProfile,
  Notification,
  Meeting,
  MaintenanceTopic,
  MaintenanceComment,
  Vote,
  Ballot,
  ActivityLog,
  ChatTopic,
  ChatMessage,
  EmergencyStatus,
  UserStatus
} from '../types';
import * as votesService from '../services/votes';
import * as chatService from '../services/chat';
import * as activityLogService from '../services/activityLog';
import * as maintenanceService from '../services/maintenance';
import * as houseConfigService from '../services/houseConfig';

import * as authService from '../services/auth';
import * as notificationService from '../services/notifications';
import * as meetingsService from '../services/meetings';

type UserEntity = UserProfile;

interface AppState {
  currentUser: UserEntity | null;
  notifications: Notification[];
  archivedNotifications: Notification[];
  meetings: Meeting[];
  maintenanceTopics: MaintenanceTopic[];
  votes: Vote[];
  ballots: Ballot[];
  users: UserEntity[];
  activityLogs: ActivityLog[];
  chatTopics: ChatTopic[];
  chatMessages: ChatMessage[];
  unreadCounts: {
    notifications: number;
    chat: number;
  };
  houseConfig: {
    address: string;
    totalApartments: number;
  };
}

interface StoreContextType extends AppState {
  login: (email: string, password?: string) => Promise<boolean | 'pending'>;
  register: (user: UserProfile, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addNotification: (n: Notification) => void;
  updateNotification: (n: Notification) => Promise<void>;
  markNotificationsAsRead: () => void;
  addMeeting: (m: Meeting) => void;
  updateMeeting: (m: Meeting) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;
  addMaintenanceTopic: (t: MaintenanceTopic) => Promise<void>;
  updateMaintenanceTopic: (t: MaintenanceTopic) => Promise<void>;
  deleteMaintenanceTopic: (id: string) => Promise<void>;
  updateMaintenanceStatus: (id: string, s: MaintenanceStatus, rejectionReason?: string) => Promise<void>;
  addMaintenanceComment: (topicId: string, comment: MaintenanceComment) => Promise<void>;
  addVote: (v: Vote) => Promise<void>;
  updateVote: (v: Vote) => Promise<void>;
  deleteVote: (voteId: string) => Promise<void>;
  castBallot: (b: Ballot) => Promise<void>;
  approvePendingUser: (userId: string) => Promise<void>;
  rejectPendingUser: (userId: string) => Promise<void>;
  addManager: (user: UserProfile, password?: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<UserEntity>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changeUserEmail: (newEmail: string, currentPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeUserPassword: (newPassword: string, currentPassword: string) => Promise<{ success: boolean; error?: string }>;
  addChatTopic: (topic: ChatTopic) => Promise<string | null>;
  addChatMessage: (message: ChatMessage) => Promise<void>;
  loadChatMessages: (topicId: string) => Promise<void>;
  updateNotificationStatus: (id: string, status: EmergencyStatus) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  resetApp: () => Promise<void>;
  updateHouseConfig: (config: { address: string; totalApartments: number }) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  activeToast: { message: string; type: string } | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Auth is now handled by Supabase — no more local password hashing

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [activeToast, setActiveToast] = useState<{ message: string; type: string } | null>(null);
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    notifications: [],
    meetings: [],
    maintenanceTopics: [],
    votes: [],
    ballots: [],
    activityLogs: [],
    chatTopics: [],
    chatMessages: [],
    archivedNotifications: [],
    unreadCounts: { notifications: 0, chat: 0 },
    houseConfig: { address: '', totalApartments: 24 }
  });

  // Load all data from Supabase on mount
  useEffect(() => {
    (async () => {
      const [activityLogs, maintenanceTopics, chatTopics, votes, ballots, houseConfig] = await Promise.all([
        activityLogService.fetchActivityLogs(),
        maintenanceService.fetchMaintenanceTopics(),
        chatService.fetchChatTopics(),
        votesService.fetchVotes(),
        votesService.fetchAllBallots(),
        houseConfigService.fetchHouseConfig(),
      ]);
      setState(prev => ({ ...prev, activityLogs, maintenanceTopics, chatTopics, votes, ballots, houseConfig }));
    })();
  }, []);

  // Restore Supabase session and fetch notifications/meetings/profiles on app load
  useEffect(() => {
    authService.getCurrentProfile().then(profile => {
      if (profile && profile.status === 'active') {
        setState(prev => ({ ...prev, currentUser: profile }));
      }
    });
    // Load all profiles for admin user management
    authService.fetchAllProfiles().then(profiles => {
      setState(prev => ({ ...prev, users: profiles }));
    });
    // Fetch notifications from Supabase
    notificationService.fetchNotifications().then(notifications => {
      setState(prev => ({ ...prev, notifications }));
    });
    // Fetch meetings from Supabase
    meetingsService.fetchMeetings().then(meetings => {
      setState(prev => ({ ...prev, meetings }));
    });
  }, []);

  // Auto-archive resolved notifications after 48h
  useEffect(() => {
    const ARCHIVE_AFTER_MS = 48 * 60 * 60 * 1000; // 48 hours
    const interval = setInterval(async () => {
      const now = Date.now();
      const toArchive = state.notifications.filter(n => 
        n.emergencyStatus === 'resolved' && n.resolvedAt && 
        (now - new Date(n.resolvedAt).getTime()) >= ARCHIVE_AFTER_MS
      );
      if (toArchive.length === 0) return;
      // Archive each expired notification in Supabase
      for (const n of toArchive) {
        await notificationService.archiveNotification(n.id);
      }
      // Refresh from DB
      const [notifications, archivedNotifications] = await Promise.all([
        notificationService.fetchNotifications(),
        notificationService.fetchArchivedNotifications(),
      ]);
      setState(prev => ({ ...prev, notifications, archivedNotifications }));
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, [state.notifications]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActiveToast({ message, type });
    setTimeout(() => setActiveToast(null), 3500);
  };

  const addActivityLog = async (type: ActivityLog['type'], message: string) => {
    const log: ActivityLog = {
      id: '',
      type,
      message,
      createdAt: new Date().toISOString(),
      userId: state.currentUser?.id || undefined,
    };
    const ok = await activityLogService.addActivityLog(log);
    if (ok) {
      const activityLogs = await activityLogService.fetchActivityLogs();
      setState(prev => ({ ...prev, activityLogs }));
    }
  };

  const login = async (email: string, password?: string): Promise<boolean | 'pending'> => {
    const result = await authService.signIn(email, password || '');
    if (result.pending) {
      return 'pending';
    }
    if (!result.success || !result.profile) {
      return false;
    }
    setState(prev => ({ ...prev, currentUser: result.profile! }));
    showToast(`Sveiki, ${result.profile.fullName}!`, 'success');
    return true;
  };

  const register = async (user: UserProfile, password: string) => {
    const result = await authService.signUp(user.email, password, {
      fullName: user.fullName,
      aptNumber: user.aptNumber,
      phoneNumber: user.phoneNumber,
    });
    if (result.success) {
      showToast(t('auth.registration_pending'), 'info');
    } else {
      showToast(result.error || 'Reģistrācijas kļūda', 'error');
    }
  };

  const logout = async () => {
    await authService.signOut();
    setState(prev => ({ ...prev, currentUser: null }));
    showToast("Jūs esat izrakstījies", 'info');
  };

  const addNotification = async (n: Notification) => {
    const ok = await notificationService.addNotification(n);
    if (ok) {
      notificationService.fetchNotifications().then(notifications => {
        setState(prev => ({ ...prev, notifications }));
      });
      addActivityLog('announcement', 'Paziņojums publicēts');
      showToast("Paziņojums izveidots");
    } else {
      showToast("Kļūda saglabājot paziņojumu", 'error');
    }
  };

  const updateNotification = async (n: Notification) => {
    const ok = await notificationService.updateNotification(n);
    if (ok) {
      const notifications = await notificationService.fetchNotifications();
      setState(prev => ({ ...prev, notifications }));
      showToast("Paziņojums atjaunināts");
    } else {
      showToast("Kļūda atjauninot paziņojumu", 'error');
    }
  };

  const markNotificationsAsRead = () => {
    setState(prev => ({ ...prev, unreadCounts: { ...prev.unreadCounts, notifications: 0 } }));
  };

  const addMeeting = async (m: Meeting) => {
    const ok = await meetingsService.addMeeting(m);
    if (ok) {
      meetingsService.fetchMeetings().then(meetings => {
        setState(prev => ({ ...prev, meetings }));
      });
      addActivityLog('meeting', 'Sapulce izveidota');
      showToast("Sapulce plānota");
    } else {
      showToast("Kļūda saglabājot sapulci", 'error');
    }
  };

  const updateMeeting = async (m: Meeting) => {
    const ok = await meetingsService.updateMeeting(m);
    if (ok) {
      const meetings = await meetingsService.fetchMeetings();
      setState(prev => ({ ...prev, meetings }));
      showToast("Sapulce atjaunināta");
    } else {
      showToast("Kļūda atjauninot sapulci", 'error');
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    const ok = await meetingsService.deleteMeeting(meetingId);
    if (ok) {
      const meetings = await meetingsService.fetchMeetings();
      setState(prev => ({ ...prev, meetings }));
      addActivityLog('meeting', 'Sapulce dzēsta');
      showToast("Sapulce dzēsta");
    } else {
      showToast("Kļūda dzēšot sapulci", 'error');
    }
  };

  const addMaintenanceTopic = async (t: MaintenanceTopic) => {
    const ok = await maintenanceService.addMaintenanceTopic(t);
    if (ok) {
      const topics = await maintenanceService.fetchMaintenanceTopics();
      setState(prev => ({ ...prev, maintenanceTopics: topics }));
      addActivityLog('maintenance', 'Tehniskais pieteikums izveidots');
      showToast("Pieteikums nosūtīts!");
    } else {
      showToast("Kļūda saglabājot pieteikumu", 'error');
    }
  };

  const updateMaintenanceTopic = async (t: MaintenanceTopic) => {
    const ok = await maintenanceService.updateMaintenanceTopic(t);
    if (ok) {
      const topics = await maintenanceService.fetchMaintenanceTopics();
      setState(prev => ({ ...prev, maintenanceTopics: topics }));
      showToast("Pieteikums atjaunināts");
    } else {
      showToast("Kļūda atjauninot pieteikumu", 'error');
    }
  };

  const deleteMaintenanceTopic = async (id: string) => {
    const ok = await maintenanceService.deleteMaintenanceTopic(id);
    if (ok) {
      const topics = await maintenanceService.fetchMaintenanceTopics();
      setState(prev => ({ ...prev, maintenanceTopics: topics }));
      addActivityLog('maintenance', 'Tehniskais pieteikums dzēsts');
      showToast("Pieteikums dzēsts");
    } else {
      showToast("Kļūda dzēšot pieteikumu", 'error');
    }
  };

  const updateMaintenanceStatus = async (id: string, s: MaintenanceStatus, rejectionReason?: string) => {
    const ok = await maintenanceService.updateMaintenanceStatus(id, s, rejectionReason);
    if (ok) {
      const topics = await maintenanceService.fetchMaintenanceTopics();
      setState(prev => ({ ...prev, maintenanceTopics: topics }));
      const statusMap: Record<string, string> = {
        [MaintenanceStatus.NEW]: t('maintenance.status_new'),
        [MaintenanceStatus.APPROVED]: t('maintenance.status_approved'),
        [MaintenanceStatus.RESOLVED]: t('maintenance.status_resolved'),
        [MaintenanceStatus.REJECTED]: t('maintenance.status_rejected'),
      };
      showToast(`${t('maintenance.status_changed')}${statusMap[s] || s}`);
    } else {
      showToast("Kļūda mainot statusu", 'error');
    }
  };

  const addMaintenanceComment = async (topicId: string, comment: MaintenanceComment) => {
    const ok = await maintenanceService.addMaintenanceComment(topicId, comment);
    if (ok) {
      const topics = await maintenanceService.fetchMaintenanceTopics();
      setState(prev => ({ ...prev, maintenanceTopics: topics }));
      showToast("Komentārs pievienots");
    } else {
      showToast("Kļūda pievienojot komentāru", 'error');
    }
  };

  const addVote = async (v: Vote) => {
    const ok = await votesService.addVote(v);
    if (ok) {
      const votes = await votesService.fetchVotes();
      setState(prev => ({ ...prev, votes }));
      addActivityLog('vote', 'Balsojums izveidots');
      showToast("Balsojums uzsākts");
    } else {
      showToast("Kļūda saglabājot balsojumu", 'error');
    }
  };

  const updateVote = async (v: Vote) => {
    const ok = await votesService.updateVote(v);
    if (ok) {
      const votes = await votesService.fetchVotes();
      setState(prev => ({ ...prev, votes }));
      showToast("Balsojums atjaunināts");
    } else {
      showToast("Kļūda atjauninot balsojumu", 'error');
    }
  };

  const deleteVote = async (voteId: string) => {
    const ok = await votesService.deleteVote(voteId);
    if (ok) {
      const [votes, ballots] = await Promise.all([
        votesService.fetchVotes(),
        votesService.fetchAllBallots(),
      ]);
      setState(prev => ({ ...prev, votes, ballots }));
      addActivityLog('vote', 'Balsojums dzēsts');
      showToast("Balsojums dzēsts");
    } else {
      showToast("Kļūda dzēšot balsojumu", 'error');
    }
  };

  const castBallot = async (b: Ballot) => {
    const ok = await votesService.castBallot(b);
    if (ok) {
      const ballots = await votesService.fetchAllBallots();
      setState(prev => ({ ...prev, ballots }));
      showToast("Jūsu balss ir reģistrēta!", 'success');
    } else {
      showToast("Kļūda reģistrējot balsi", 'error');
    }
  };

  const approvePendingUser = async (userId: string) => {
    const ok = await authService.approveUser(userId);
    if (ok) {
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, status: 'active' as UserStatus } : u)
      }));
      const user = state.users.find(u => u.id === userId);
      showToast(`${user?.fullName} ${t('admin.user_approved')}`, 'success');
    }
  };

  const rejectPendingUser = async (userId: string) => {
    const ok = await authService.rejectUser(userId);
    if (ok) {
      setState(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== userId)
      }));
      showToast(t('admin.user_rejected'), 'error');
    }
  };

  const addManager = async (user: UserProfile, password?: string) => {
    const result = await authService.signUp(user.email, password || 'Majo2024!', {
      fullName: user.fullName,
      aptNumber: user.aptNumber,
      phoneNumber: user.phoneNumber,
    });
    if (result.success) {
      setState(prev => ({ ...prev, users: [...prev.users, user] }));
      showToast("Pārvaldnieks pievienots");
    } else {
      showToast(result.error || 'Kļūda', 'error');
    }
  };

  const updateUser = async (id: string, updates: any) => {
    // Map camelCase to snake_case for Supabase
    const dbUpdates: Record<string, any> = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
    if (updates.aptNumber !== undefined) dbUpdates.apt_number = updates.aptNumber;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    if (Object.keys(dbUpdates).length > 0) {
      const ok = await authService.updateProfile(id, dbUpdates);
      if (!ok) {
        showToast("Kļūda atjauninot datus", 'error');
        return;
      }
    }
    setState(prev => ({ ...prev, users: prev.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
    showToast("Dati atjaunoti");
  };

  const deleteUser = async (id: string) => {
    const ok = await authService.rejectUser(id);
    if (ok) {
      setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      showToast("Lietotājs izdzēsts");
    } else {
      showToast("Kļūda dzēšot lietotāju", 'error');
    }
  };

  const changeUserEmail = async (newEmail: string, _currentPassword: string) => {
    const result = await authService.changeEmail(newEmail);
    if (result.success) {
      setState(prev => ({ 
        ...prev, 
        currentUser: { ...prev.currentUser!, email: newEmail },
        users: prev.users.map(u => u.id === prev.currentUser?.id ? { ...u, email: newEmail } : u)
      }));
      showToast("E-pasts nomainīts");
      return { success: true };
    }
    return { success: false, error: result.error || 'Kļūda' };
  };

  const changeUserPassword = async (newPassword: string, _currentPassword: string) => {
    const result = await authService.changePassword(newPassword);
    if (result.success) {
      showToast("Parole nomainīta");
      return { success: true };
    }
    return { success: false, error: result.error || 'Kļūda' };
  };

  const addChatTopic = async (topic: ChatTopic): Promise<string | null> => {
    const newId = await chatService.addChatTopic(topic);
    if (newId) {
      const chatTopics = await chatService.fetchChatTopics();
      setState(prev => ({ ...prev, chatTopics }));
      addActivityLog('chat', `Jauna diskusija: ${topic.title}`);
      showToast("Tēma izveidota");
    } else {
      showToast("Kļūda saglabājot tēmu", 'error');
    }
    return newId;
  };

  const addChatMessage = async (message: ChatMessage) => {
    const ok = await chatService.addChatMessage(message);
    if (ok) {
      // Refresh chat topics + messages for this topic
      const [chatTopics, msgs] = await Promise.all([
        chatService.fetchChatTopics(),
        chatService.fetchChatMessages(message.topicId),
      ]);
      setState(prev => ({
        ...prev,
        chatTopics,
        chatMessages: [...prev.chatMessages.filter(m => m.topicId !== message.topicId), ...msgs],
      }));
    } else {
      showToast("Kļūda sūtot ziņu", 'error');
    }
  };

  const loadChatMessages = async (topicId: string) => {
    const msgs = await chatService.fetchChatMessages(topicId);
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages.filter(m => m.topicId !== topicId), ...msgs],
    }));
  };

  const updateNotificationStatus = async (id: string, status: EmergencyStatus) => {
    const ok = await notificationService.updateNotificationStatus(id, status);
    if (ok) {
      notificationService.fetchNotifications().then(notifications => {
        setState(prev => ({ ...prev, notifications }));
      });
      const statusKey = `emergency.status_${status}` as const;
      showToast(`${t('emergency.status_changed')}${t(statusKey)}`);
    } else {
      showToast('Neizdevās atjaunināt statusu', 'error');
    }
  };

  const deleteNotification = async (id: string) => {
    const ok = await notificationService.deleteNotification(id);
    if (ok) {
      notificationService.fetchNotifications().then(notifications => {
        setState(prev => ({ ...prev, notifications }));
      });
    } else {
      showToast('Neizdevās dzēst paziņojumu', 'error');
    }
  };

  const resetApp = async () => {
    await authService.signOut();
    window.location.reload();
  };

  const updateHouseConfig = async (config: { address: string; totalApartments: number }) => {
    const ok = await houseConfigService.updateHouseConfig(config);
    if (ok) {
      setState(prev => ({ ...prev, houseConfig: config }));
      showToast("Mājas iestatījumi saglabāti");
    } else {
      showToast("Kļūda saglabājot iestatījumus", 'error');
    }
  };

  return (
    <StoreContext.Provider value={{ 
      ...state, login, register, logout, addNotification, updateNotification, markNotificationsAsRead, addMeeting, updateMeeting, deleteMeeting, addMaintenanceTopic, updateMaintenanceTopic, deleteMaintenanceTopic,
      updateMaintenanceStatus, addMaintenanceComment, addVote, updateVote, deleteVote, castBallot, approvePendingUser, 
      rejectPendingUser, addManager, updateUser, 
      deleteUser, changeUserEmail, changeUserPassword, addChatTopic, addChatMessage, loadChatMessages, updateNotificationStatus, deleteNotification, resetApp, updateHouseConfig,
      showToast, activeToast
    }}>
      {children}
      {activeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border ${
            activeToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
            activeToast.type === 'info' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-white text-gray-800 border-gray-100'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeToast.type === 'error' ? 'bg-red-500 text-white' : 
              activeToast.type === 'info' ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'
            }`}>
              <i className={`fa-solid ${activeToast.type === 'error' ? 'fa-xmark' : activeToast.type === 'info' ? 'fa-info' : 'fa-check'}`}></i>
            </div>
            <p className="text-xs font-bold leading-tight flex-1">{activeToast.message}</p>
          </div>
        </div>
      )}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};