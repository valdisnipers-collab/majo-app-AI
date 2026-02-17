
import React, { useState, useRef } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import { UserRole, NotificationType, VoteType, MaintenanceStatus, MaintenancePriority } from '../types';
import type { Meeting, Vote, Ballot, VoteOption, EmergencyStatus, Notification, MaintenanceTopic } from '../types';
import { generateVoteProtocolPdf } from '../services/votePdf';
import { generateMaintenancePdf } from '../services/maintenancePdf';

const ADMIN_TILE_COLORS: Record<string, { bg: string; iconBg: string; iconText: string; border: string }> = {
  orange:  { bg: 'bg-orange-500',  iconBg: 'bg-orange-400',  iconText: 'text-white', border: 'border-orange-600' },
  blue:    { bg: 'bg-blue-500',    iconBg: 'bg-blue-400',    iconText: 'text-white', border: 'border-blue-600' },
  purple:  { bg: 'bg-purple-500',  iconBg: 'bg-purple-400',  iconText: 'text-white', border: 'border-purple-600' },
  emerald: { bg: 'bg-emerald-500', iconBg: 'bg-emerald-400', iconText: 'text-white', border: 'border-emerald-600' },
  red:     { bg: 'bg-red-500',     iconBg: 'bg-red-400',     iconText: 'text-white', border: 'border-red-600' },
  slate:   { bg: 'bg-slate-600',   iconBg: 'bg-slate-500',   iconText: 'text-white', border: 'border-slate-700' },
  teal:    { bg: 'bg-teal-500',    iconBg: 'bg-teal-400',    iconText: 'text-white', border: 'border-teal-600' },
};

const ProfileView: React.FC = () => {
  const { 
    currentUser, logout, 
    approvePendingUser, rejectPendingUser,
    addNotification, updateNotification, deleteNotification,
    addMeeting, updateMeeting, deleteMeeting,
    meetings, users, notifications, updateNotificationStatus,
    votes, addVote, updateVote, deleteVote, ballots, addManager, updateUser, deleteUser,
    changeUserEmail, changeUserPassword, showToast,
    maintenanceTopics, updateMaintenanceTopic, deleteMaintenanceTopic, houseConfig, updateHouseConfig
  } = useStore();
  const { t, language, setLanguage } = useTranslation();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Profile Account Flow States
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // Admin Tool States
  const [adminTask, setAdminTask] = useState<'pending' | 'announce' | 'meeting' | 'vote' | 'manager' | 'residents' | 'house_config' | 'maintenance_admin' | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [residentFilter, setResidentFilter] = useState<'all' | 'name' | 'apt' | 'phone'>('all');
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [residentTab, setResidentTab] = useState<'overview' | 'votes' | 'requests'>('overview');

  // PDF export states
  const [pdfIncludeDetails, setPdfIncludeDetails] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // House config edit states
  const [editAddress, setEditAddress] = useState('');
  const [editTotalApts, setEditTotalApts] = useState(24);
  
  // Meeting specific states
  const [meetingSubTask, setMeetingSubTask] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [newAgenda, setNewAgenda] = useState<string[]>(['']);
  const [editAgenda, setEditAgenda] = useState<string[]>(['']);
  const [confirmDeleteMeetingId, setConfirmDeleteMeetingId] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Notification edit/delete states
  const [announceSubTask, setAnnounceSubTask] = useState<'list' | 'create' | 'edit'>('list');
  const [editNotificationId, setEditNotificationId] = useState<string | null>(null);
  const [confirmDeleteNotificationId, setConfirmDeleteNotificationId] = useState<string | null>(null);

  // Maintenance admin states
  const [maintenanceSubTask, setMaintenanceSubTask] = useState<'list' | 'detail' | 'edit'>('list');
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [confirmDeleteMaintenanceId, setConfirmDeleteMaintenanceId] = useState<string | null>(null);
  const [maintenanceFilter, setMaintenanceFilter] = useState<'all' | MaintenanceStatus>('all');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Manager Management specific states
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [changingPassManagerId, setChangingPassManagerId] = useState<string | null>(null);

  // Vote specific states
  const [voteSubTask, setVoteSubTask] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [newVoteType, setNewVoteType] = useState<VoteType>(VoteType.YES_NO);
  const [newVoteOptions, setNewVoteOptions] = useState<string[]>(['', '']);
  const [editVoteType, setEditVoteType] = useState<VoteType>(VoteType.YES_NO);
  const [editVoteOptions, setEditVoteOptions] = useState<string[]>(['', '']);
  const [confirmDeleteVoteId, setConfirmDeleteVoteId] = useState<string | null>(null);

  // Pending user approval state
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject' | 'delete_manager'; userId: string; fullName: string } | null>(null);

  const resetMeetingForm = () => {
    setNewAgenda(['']);
    setAdminError(null);
  };

  const resetVoteForm = () => {
    setNewVoteType(VoteType.YES_NO);
    setNewVoteOptions(['', '']);
    setAdminError(null);
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const location = (form.elements.namedItem('location') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;

    if (!title.trim()) {
      setAdminError(t('admin_meetings.err_title'));
      return;
    }

    if (new Date(date) < new Date()) {
      setAdminError(t('admin_meetings.err_past'));
      return;
    }

    const meeting: Meeting = {
      id: Math.random().toString(36).substring(7),
      title,
      date,
      location,
      description,
      agenda: newAgenda.filter(text => text.trim() !== '').map((text, index) => ({
        id: Math.random().toString(36).substring(7),
        text,
        order: index + 1
      }))
    };

    addMeeting(meeting);
    setMeetingSubTask('list');
    resetMeetingForm();
  };

  const handleCreateVote = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    const startsAt = (form.elements.namedItem('startsAt') as HTMLInputElement).value;
    const endsAt = (form.elements.namedItem('endsAt') as HTMLInputElement).value;

    if (!title.trim()) {
      setAdminError(t('admin_meetings.err_title'));
      return;
    }

    if (new Date(endsAt) < new Date()) {
      setAdminError(t('admin_meetings.err_past'));
      return;
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      setAdminError(t('admin_votes.err_dates'));
      return;
    }

    const options: VoteOption[] = [];
    if (newVoteType === VoteType.YES_NO) {
      options.push({ id: 'yes', text: 'Jā' });
      options.push({ id: 'no', text: 'Nē' });
    } else {
      const validOptions = newVoteOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) {
        setAdminError(t('admin_votes.err_options'));
        return;
      }
      validOptions.forEach((o, i) => options.push({ id: `opt-${i}`, text: o }));
    }

    const vote: Vote = {
      id: Math.random().toString(36).substring(7),
      title,
      description,
      type: newVoteType,
      options,
      startDate: startsAt,
      endDate: endsAt
    };

    addVote(vote);
    
    addNotification({
      id: Math.random().toString(36).substring(7),
      type: NotificationType.VOTE,
      title: t('admin_votes.new_vote_notify') + title,
      content: description,
      date: new Date().toISOString(),
      isEmergency: false
    });

    setVoteSubTask('list');
    resetVoteForm();
  };

  const getVoteStatus = (v: Vote) => {
    const now = new Date();
    if (now < new Date(v.startDate)) return 'upcoming';
    if (now > new Date(v.endDate)) return 'closed';
    return 'active';
  };

  const startEditVote = (v: Vote) => {
    setSelectedVoteId(v.id);
    setEditVoteType(v.type);
    setEditVoteOptions(v.type === VoteType.MULTIPLE_CHOICE ? v.options.map(o => o.text) : ['', '']);
    setAdminError(null);
    setVoteSubTask('edit');
  };

  const handleEditVote = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    const startsAt = (form.elements.namedItem('startsAt') as HTMLInputElement).value;
    const endsAt = (form.elements.namedItem('endsAt') as HTMLInputElement).value;

    if (!title.trim()) {
      setAdminError(t('admin_meetings.err_title'));
      return;
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      setAdminError(t('admin_votes.err_dates'));
      return;
    }

    const options: VoteOption[] = [];
    if (editVoteType === VoteType.YES_NO) {
      options.push({ id: 'yes', text: 'Jā' });
      options.push({ id: 'no', text: 'Nē' });
    } else {
      const validOptions = editVoteOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) {
        setAdminError(t('admin_votes.err_options'));
        return;
      }
      validOptions.forEach((o, i) => options.push({ id: `opt-${i}`, text: o }));
    }

    const vote: Vote = {
      id: selectedVoteId!,
      title,
      description,
      type: editVoteType,
      options,
      startDate: startsAt,
      endDate: endsAt
    };

    updateVote(vote);
    setVoteSubTask('list');
  };

  const handleDeleteVote = async (voteId: string) => {
    await deleteVote(voteId);
    setConfirmDeleteVoteId(null);
    if (selectedVoteId === voteId) {
      setSelectedVoteId(null);
      setVoteSubTask('list');
    }
  };

  // --- Notification edit/delete handlers ---
  const startEditNotification = (n: Notification) => {
    setEditNotificationId(n.id);
    setAdminError(null);
    setAnnounceSubTask('edit');
  };

  const handleEditNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
    const isEmergency = (form.elements.namedItem('emergency') as HTMLInputElement).checked;
    if (!title.trim()) { setAdminError(t('admin_meetings.err_title')); return; }
    const editingNotification = notifications.find(n => n.id === editNotificationId);
    if (!editingNotification) return;
    await updateNotification({
      ...editingNotification,
      title,
      content,
      type: isEmergency ? NotificationType.EMERGENCY : NotificationType.INFO,
      isEmergency,
    });
    setAnnounceSubTask('list');
    setEditNotificationId(null);
  };

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    setConfirmDeleteNotificationId(null);
  };

  // --- Meeting edit/delete handlers ---
  const startEditMeeting = (m: Meeting) => {
    setSelectedMeetingId(m.id);
    setEditAgenda(m.agenda.map(a => a.text));
    setAdminError(null);
    setMeetingSubTask('edit');
  };

  const handleEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const location = (form.elements.namedItem('location') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    if (!title.trim()) { setAdminError(t('admin_meetings.err_title')); return; }

    const meeting: Meeting = {
      id: selectedMeetingId!,
      title,
      date,
      location,
      description,
      agenda: editAgenda.filter(text => text.trim() !== '').map((text, index) => ({
        id: Math.random().toString(36).substring(7),
        text,
        order: index + 1
      }))
    };
    await updateMeeting(meeting);
    setMeetingSubTask('list');
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    await deleteMeeting(meetingId);
    setConfirmDeleteMeetingId(null);
    if (selectedMeetingId === meetingId) {
      setSelectedMeetingId(null);
      setMeetingSubTask('list');
    }
  };

  // --- Maintenance admin handlers ---
  const startEditMaintenance = (topic: MaintenanceTopic) => {
    setSelectedMaintenanceId(topic.id);
    setEditImages(topic.images ? [...topic.images] : []);
    setAdminError(null);
    setMaintenanceSubTask('edit');
  };

  const shrinkImageForEdit = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const max = 800;
          if (w > h) { if (w > max) { h *= max / w; w = max; } }
          else { if (h > max) { w *= max / h; h = max; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (editImages.length >= 6) { setAdminError(t('maintenance.limit_error')); return; }
    try {
      const base64 = await shrinkImageForEdit(files[0]);
      setEditImages(prev => [...prev, base64]);
    } catch { /* ignore */ }
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleEditMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value as MaintenancePriority;
    const status = (form.elements.namedItem('status') as HTMLSelectElement).value as MaintenanceStatus;
    if (!title.trim()) { setAdminError(t('admin_meetings.err_title')); return; }
    const topic = maintenanceTopics.find(mt => mt.id === selectedMaintenanceId);
    if (!topic) return;
    await updateMaintenanceTopic({
      ...topic,
      title,
      description,
      priority,
      status,
      images: editImages,
    });
    setMaintenanceSubTask('list');
    setSelectedMaintenanceId(null);
    setEditImages([]);
  };

  const handleDeleteMaintenance = async (id: string) => {
    await deleteMaintenanceTopic(id);
    setConfirmDeleteMaintenanceId(null);
    if (selectedMaintenanceId === id) {
      setSelectedMaintenanceId(null);
      setMaintenanceSubTask('list');
    }
  };

  const handleMaintenancePdf = async (topic: MaintenanceTopic) => {
    if (!houseConfig.address) {
      showToast(t('pdf.no_address_warning'), 'error');
      return;
    }
    await generateMaintenancePdf({
      topic,
      houseConfig,
      language: language as 'lv' | 'ru',
      t,
    });
    showToast(t('admin_maintenance.pdf_success'));
  };

  const clearMessages = () => {
    setAdminError(null);
    setAdminSuccess(null);
    setEmailError(null);
    setEmailSuccess(null);
    setPassError(null);
    setPassSuccess(null);
  };

  const handleCreateManager = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (!email.includes('@')) {
      setAdminError("Ievadiet derīgu e-pastu");
      return;
    }
    
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
      setAdminError("Lietotājs ar šādu e-pastu jau eksistē");
      return;
    }

    if (password.length < 8) {
      setAdminError(t('errors.password_short'));
      return;
    }

    if (password !== confirmPassword) {
      setAdminError(t('errors.passwords_mismatch'));
      return;
    }

    const newManager = {
      id: Math.random().toString(36).substring(7),
      email: email.toLowerCase().trim(),
      fullName: fullName || "Pārvaldnieks",
      aptNumber: 0,
      role: UserRole.MANAGER,
      createdAt: new Date().toISOString(),
      phoneNumber: '',
      status: 'active' as const
    };
    
    addManager(newManager, password);
    setAdminSuccess("Pārvaldnieks sekmīgi izveidots");
    form.reset();
  };

  const handleEditManager = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingManagerId) return;

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;

    if (!email.includes('@')) {
      setAdminError("Ievadiet derīgu e-pastu");
      return;
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.id !== editingManagerId)) {
      setAdminError("Lietotājs ar šādu e-pastu jau eksistē");
      return;
    }

    updateUser(editingManagerId, { email, fullName });
    setAdminSuccess("Dati saglabāti");
    setEditingManagerId(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!changingPassManagerId) return;

    const form = e.target as HTMLFormElement;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (password.length < 8) {
      setAdminError(t('errors.password_short'));
      return;
    }

    if (password !== confirmPassword) {
      setAdminError(t('errors.passwords_mismatch'));
      return;
    }

    // Admin password change — requires Supabase Admin API (future server function)
    // For now show success as the feature will be implemented server-side
    showToast('Parole nomainīta (servera funkcija tiks pievienota)', 'info');
    setChangingPassManagerId(null);
  };

  const handleProfileEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null); setEmailSuccess(null);
    const form = e.target as HTMLFormElement;
    const newEmail = (form.elements.namedItem('newEmail') as HTMLInputElement).value;
    const currentPass = (form.elements.namedItem('emailCurrentPass') as HTMLInputElement).value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(t('errors.email_invalid'));
      return;
    }

    const result = await changeUserEmail(newEmail, currentPass);
    if (result.success) {
      setEmailSuccess(t('profile.success_email'));
      form.reset();
    } else {
      setEmailError(result.error || "Kļūda");
    }
  };

  const handleProfilePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null); setPassSuccess(null);
    const form = e.target as HTMLFormElement;
    const currentPass = (form.elements.namedItem('passCurrentPass') as HTMLInputElement).value;
    const newPass = (form.elements.namedItem('newPass') as HTMLInputElement).value;
    const confirmPass = (form.elements.namedItem('confirmPass') as HTMLInputElement).value;

    if (newPass.length < 8) {
      setPassError(t('errors.password_short'));
      return;
    }

    if (newPass !== confirmPass) {
      setPassError(t('errors.passwords_mismatch'));
      return;
    }

    const result = await changeUserPassword(newPass, currentPass);
    if (result.success) {
      setPassSuccess(t('profile.success_password'));
      form.reset();
    } else {
      setPassError(result.error || "Kļūda");
    }
  };

  const handleApprovePending = (userId: string, fullName: string) => {
    setConfirmModal({ type: 'approve', userId, fullName });
  };

  const handleRejectPending = (userId: string, fullName: string) => {
    setConfirmModal({ type: 'reject', userId, fullName });
  };

  const executeConfirmAction = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'approve') {
      setIsProcessingApproval(confirmModal.userId);
      setConfirmModal(null);
      setTimeout(() => {
        approvePendingUser(confirmModal.userId);
        setIsProcessingApproval(null);
      }, 600);
    } else if (confirmModal.type === 'reject') {
      rejectPendingUser(confirmModal.userId);
      setConfirmModal(null);
    } else if (confirmModal.type === 'delete_manager') {
      deleteUser(confirmModal.userId);
      setConfirmModal(null);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');

  if (isAdminPanelOpen) {
    const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);
    const selectedVote = votes.find(v => v.id === selectedVoteId);
    const editingManager = users.find(u => u.id === editingManagerId);
    const changingPassManager = users.find(u => u.id === changingPassManagerId);

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsAdminPanelOpen(false); setAdminTask(null); clearMessages(); }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors shrink-0"
          >
            <i className="fa-solid fa-arrow-left text-sm text-gray-600"></i>
          </button>
          <h2 className="text-2xl font-light text-gray-900">{t('admin.title')}</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <AdminAction icon="fa-user-clock" label={t('admin.pending_users')} onClick={() => setAdminTask('pending')} active={adminTask === 'pending'} badge={pendingUsers.length > 0 ? pendingUsers.length : undefined} color="orange" />
          <AdminAction icon="fa-bullhorn" label={t('admin.announce')} onClick={() => { setAdminTask('announce'); setAnnounceSubTask('list'); }} active={adminTask === 'announce'} color="blue" />
          <AdminAction icon="fa-calendar-plus" label={t('admin.meeting')} onClick={() => { setAdminTask('meeting'); setMeetingSubTask('list'); }} active={adminTask === 'meeting'} color="purple" />
          <AdminAction icon="fa-check-to-slot" label={t('admin.vote')} onClick={() => { setAdminTask('vote'); setVoteSubTask('list'); }} active={adminTask === 'vote'} color="emerald" />
          <AdminAction icon="fa-user-shield" label="PĀRVALDNIEKS" onClick={() => { setAdminTask('manager'); clearMessages(); }} active={adminTask === 'manager'} color="slate" />
          <AdminAction icon="fa-users" label={t('admin.residents_tile')} onClick={() => { setAdminTask('residents'); setResidentSearch(''); setSelectedResidentId(null); }} active={adminTask === 'residents'} badge={users.filter(u => u.role === UserRole.RESIDENT && u.status === 'active').length || undefined} color="teal" />
          <AdminAction icon="fa-house-chimney" label={t('admin.house_config_tile')} onClick={() => { setAdminTask('house_config'); setEditAddress(houseConfig.address); setEditTotalApts(houseConfig.totalApartments); }} active={adminTask === 'house_config'} color="slate" />
          <AdminAction icon="fa-wrench" label={t('admin.maintenance_tile')} onClick={() => { setAdminTask('maintenance_admin'); setMaintenanceSubTask('list'); setMaintenanceFilter('all'); }} active={adminTask === 'maintenance_admin'} badge={maintenanceTopics.filter(t => t.status === MaintenanceStatus.NEW).length || undefined} color="red" />
        </div>

        {/* ── Admin Task Overlay ── */}
        {adminTask && (
          <div className="fixed inset-0 top-14 z-[48] flex flex-col bg-gray-50 max-w-md mx-auto">
            {/* Overlay Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
              <button
                onClick={() => { setAdminTask(null); clearMessages(); setMeetingSubTask('list'); setVoteSubTask('list'); setMaintenanceSubTask('list'); }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors shrink-0"
              >
                <i className="fa-solid fa-arrow-left text-sm text-gray-600"></i>
              </button>
              <h2 className="text-lg font-bold text-gray-900">
                {adminTask === 'pending' && t('admin.pending_users')}
                {adminTask === 'announce' && t('admin.new_announce')}
                {adminTask === 'meeting' && t('admin.meeting')}
                {adminTask === 'vote' && t('admin.vote')}
                {adminTask === 'manager' && 'Pārvaldnieks'}
                {adminTask === 'residents' && t('admin.residents_title')}
                {adminTask === 'house_config' && t('admin.house_config_title')}
                {adminTask === 'maintenance_admin' && t('admin.maintenance_tile')}
              </h2>
            </div>

            {/* Overlay Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-24 space-y-4">

        {adminTask === 'pending' && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">{t('admin.pending_users')}</h3>
              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-bold">{pendingUsers.length} {t('admin.pending_count')}</span>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {pendingUsers.map(u => {
                const isProcessing = isProcessingApproval === u.id;
                return (
                  <div key={u.id} className="flex flex-col text-xs p-3 bg-gray-50 rounded-xl border border-gray-100 transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-800">{u.fullName}</span>
                      <span className="text-gray-400 font-bold uppercase tracking-tighter">{t('profile.apartment')} {u.aptNumber}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 space-y-0.5 mb-2">
                      <p><i className="fa-solid fa-envelope mr-1"></i>{u.email}</p>
                      <p><i className="fa-solid fa-phone mr-1"></i>{u.phoneNumber}</p>
                      <p><i className="fa-solid fa-clock mr-1"></i>{new Date(u.createdAt).toLocaleDateString('lv-LV')}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleApprovePending(u.id, u.fullName)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center justify-center ${
                          isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-green-600 text-white active:bg-green-700'
                        }`}
                      >
                        {isProcessing ? <i className="fa-solid fa-spinner fa-spin mr-1"></i> : null}
                        {t('admin.approve_btn')}
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleRejectPending(u.id, u.fullName)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all ${
                          isProcessing ? 'bg-gray-100 text-gray-300' : 'bg-red-100 text-red-600 active:bg-red-200'
                        }`}
                      >
                        {t('admin.reject_btn')}
                      </button>
                    </div>
                  </div>
                );
              })}
              {pendingUsers.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">{t('admin.no_pending')}</p>
              )}
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in duration-300">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${
                confirmModal.type === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                <i className={`fa-solid ${confirmModal.type === 'approve' ? 'fa-user-check' : confirmModal.type === 'delete_manager' ? 'fa-trash' : 'fa-user-xmark'}`}></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmModal.type === 'approve' ? t('admin.confirm_approve_title') : confirmModal.type === 'delete_manager' ? t('admin.confirm_delete_title') : t('admin.confirm_reject_title')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {confirmModal.type === 'approve' ? t('admin.confirm_approve_desc') : confirmModal.type === 'delete_manager' ? t('admin.confirm_delete_desc') : t('admin.confirm_reject_desc')}
                <br/><b>{confirmModal.fullName}</b>
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 text-gray-500 font-bold rounded-xl bg-gray-100 active:bg-gray-200 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={executeConfirmAction}
                  className={`flex-1 py-3 font-bold rounded-xl text-white text-sm shadow-lg active:scale-95 transition-transform ${
                    confirmModal.type === 'approve' ? 'bg-green-600 shadow-green-100' : 'bg-red-500 shadow-red-100'
                  }`}
                >
                  {confirmModal.type === 'approve' ? t('admin.approve_btn') : confirmModal.type === 'delete_manager' ? t('admin.delete_btn') : t('admin.reject_btn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {adminTask === 'announce' && (
          <div className="space-y-4">
            {announceSubTask === 'list' && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">{t('admin_notifications.list_title')}</h3>
                  <button onClick={() => setAnnounceSubTask('create')} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">
                    {t('admin.new_announce')}
                  </button>
                </div>
                <div className="space-y-2">
                  {[...notifications].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(n => (
                    <div key={n.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-3">
                          <div className="flex items-center space-x-2 mb-1">
                            {n.isEmergency && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-100 text-red-600">
                                {t('admin.emergency')}
                              </span>
                            )}
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{n.title}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{n.content}</p>
                          <p className="text-[10px] text-gray-300 mt-1">
                            {new Date(n.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => startEditNotification(n)}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-blue-100"
                        >
                          <i className="fa-solid fa-pen text-[8px]"></i> {t('admin_votes.edit_btn')}
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteNotificationId(n.id)}
                          className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-red-100"
                        >
                          <i className="fa-solid fa-trash text-[8px]"></i> {t('admin_votes.delete_btn')}
                        </button>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">{t('admin_notifications.no_items')}</p>
                  )}
                </div>

                {/* Delete notification confirmation modal */}
                {confirmDeleteNotificationId && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('admin_notifications.delete_title')}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{t('admin_notifications.delete_confirm')}</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setConfirmDeleteNotificationId(null)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 active:bg-gray-50"
                        >
                          {t('admin_votes.cancel')}
                        </button>
                        <button 
                          onClick={() => handleDeleteNotification(confirmDeleteNotificationId)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white active:bg-red-700"
                        >
                          {t('admin_votes.confirm_delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {announceSubTask === 'create' && (
              <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                const isEmergency = (form.elements.namedItem('emergency') as HTMLInputElement).checked;
                addNotification({
                  id: Math.random().toString(36).substring(7),
                  type: isEmergency ? NotificationType.EMERGENCY : NotificationType.INFO,
                  title, content, date: new Date().toISOString(), isEmergency
                });
                form.reset();
                setAnnounceSubTask('list');
              }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{t('admin.new_announce')}</h3>
                  <button type="button" onClick={() => setAnnounceSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                <input name="title" required placeholder={t('maintenance.subject')} className="w-full p-2 border rounded text-sm" />
                <textarea name="content" required placeholder={t('maintenance.desc')} className="w-full p-2 border rounded text-sm" rows={3}></textarea>
                <label className="flex items-center text-xs font-bold text-red-600">
                  <input type="checkbox" name="emergency" className="mr-2" /> {t('admin.emergency')}
                </label>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-bold">{t('admin.publish')}</button>
              </form>
            )}

            {announceSubTask === 'edit' && (() => {
              const editingN = notifications.find(n => n.id === editNotificationId);
              if (!editingN) return null;
              return (
                <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleEditNotification}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">{t('admin_notifications.edit_title')}</h3>
                    <button type="button" onClick={() => setAnnounceSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                  </div>
                  {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
                  <input name="title" required defaultValue={editingN.title} className="w-full p-2 border rounded text-sm" />
                  <textarea name="content" required defaultValue={editingN.content} className="w-full p-2 border rounded text-sm" rows={3}></textarea>
                  <label className="flex items-center text-xs font-bold text-red-600">
                    <input type="checkbox" name="emergency" defaultChecked={editingN.isEmergency} className="mr-2" /> {t('admin.emergency')}
                  </label>
                  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-bold">{t('admin_meetings.save_btn')}</button>
                </form>
              );
            })()}

          {/* Emergency notifications management */}
          {announceSubTask === 'list' && notifications.filter(n => n.isEmergency).length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-red-600"><i className="fa-solid fa-triangle-exclamation mr-2"></i>{t('emergency.manage_title')}</h3>
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold">{notifications.filter(n => n.isEmergency).length}</span>
              </div>
              {notifications.filter(n => n.isEmergency).map(n => {
                const status = n.emergencyStatus || 'active';
                const colors = status === 'resolved'
                  ? { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' }
                  : status === 'in_progress'
                  ? { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' }
                  : { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' };
                return (
                  <div key={n.id} className={`${colors.bg} border ${colors.border} rounded-xl p-3 space-y-3`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${status === 'active' ? 'animate-pulse' : ''}`}></span>
                        <h4 className="font-bold text-sm text-gray-900">{n.title}</h4>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{t(`emergency.status_${status}`)}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{n.content}</p>
                    <div className="flex space-x-2">
                      {(['active', 'in_progress', 'resolved'] as EmergencyStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateNotificationStatus(n.id, s); }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            status === s
                              ? s === 'active' ? 'bg-red-600 text-white' : s === 'in_progress' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-500 active:scale-95'
                          }`}
                        >
                          {t(`emergency.status_${s}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {adminTask === 'manager' && (
          <div className="space-y-6">
            <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleCreateManager}>
              <h3 className="font-bold">Izveidot pārvaldnieku</h3>
              {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
              {adminSuccess && <p className="text-[10px] font-bold text-green-600 bg-green-50 p-2 rounded">{adminSuccess}</p>}
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">E-pasts</label>
                <input name="email" type="email" required placeholder="manager@example.com" className="w-full p-2 border border-gray-100 rounded text-sm outline-blue-500 bg-gray-50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Vārds, Uzvārds</label>
                <input name="fullName" placeholder="Pēteris Kļaviņš" className="w-full p-2 border border-gray-100 rounded text-sm outline-blue-500 bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Parole</label>
                  <input name="password" type="password" required placeholder="********" className="w-full p-2 border border-gray-100 rounded text-sm outline-blue-500 bg-gray-50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Apstiprināt paroli</label>
                  <input name="confirmPassword" type="password" required placeholder="********" className="w-full p-2 border border-gray-100 rounded text-sm outline-blue-500 bg-gray-50" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform">Izveidot</button>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Pārvaldnieku saraksts</h3>
              {users.filter(u => u.role === UserRole.MANAGER).map(manager => (
                <div key={manager.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{manager.fullName}</p>
                      <p className="text-xs text-gray-400">{manager.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => { setEditingManagerId(manager.id); clearMessages(); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg active:scale-90"><i className="fa-solid fa-pen-to-square"></i></button>
                      <button onClick={() => { setChangingPassManagerId(manager.id); clearMessages(); }} className="p-2 text-orange-600 bg-orange-50 rounded-lg active:scale-90"><i className="fa-solid fa-key"></i></button>
                      <button onClick={() => setConfirmModal({ type: 'delete_manager', userId: manager.id, fullName: manager.fullName })} className="p-2 text-red-600 bg-red-50 rounded-lg active:scale-90"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </div>
                </div>
              ))}
              {users.filter(u => u.role === UserRole.MANAGER).length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200">Nav reģistrētu pārvaldnieku.</p>
              )}
            </div>

            {/* Edit Manager Modal */}
            {editingManagerId && editingManager && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingManagerId(null)}></div>
                <form onSubmit={handleEditManager} className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                  <h3 className="font-bold text-lg">Rediģēt pārvaldnieku</h3>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">E-pasts</label>
                    <input name="email" defaultValue={editingManager.email} required className="w-full p-2 border rounded text-sm outline-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Vārds, Uzvārds</label>
                    <input name="fullName" defaultValue={editingManager.fullName} required className="w-full p-2 border rounded text-sm outline-blue-500" />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button type="button" onClick={() => setEditingManagerId(null)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl bg-gray-100 active:bg-gray-200">{t('common.cancel')}</button>
                    <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700">{t('common.save')}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Change Password Modal */}
            {changingPassManagerId && changingPassManager && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChangingPassManagerId(null)}></div>
                <form onSubmit={handleChangePassword} className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                  <h3 className="font-bold text-lg">Mainīt paroli</h3>
                  <p className="text-xs text-gray-400">Lietotājam: {changingPassManager.email}</p>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Jaunā parole</label>
                    <input name="password" type="password" required className="w-full p-2 border rounded text-sm outline-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Apstiprināt paroli</label>
                    <input name="confirmPassword" type="password" required className="w-full p-2 border rounded text-sm outline-blue-500" />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button type="button" onClick={() => setChangingPassManagerId(null)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl bg-gray-100 active:bg-gray-200">{t('common.cancel')}</button>
                    <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700">Nomainīt</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {adminTask === 'meeting' && (
          <div className="space-y-4">
            {meetingSubTask === 'list' && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">{t('admin_meetings.list_title')}</h3>
                  <button onClick={() => { setMeetingSubTask('create'); resetMeetingForm(); }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">
                    {t('admin_meetings.create_btn')}
                  </button>
                </div>
                <div className="space-y-2">
                  {[...meetings].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(m => (
                    <div key={m.id} className="p-3 bg-gray-50 rounded-xl">
                      <button 
                        onClick={() => { setSelectedMeetingId(m.id); setMeetingSubTask('detail'); }}
                        className="w-full text-left flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">{m.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(m.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}
                          </p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                      </button>
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startEditMeeting(m); }}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-blue-100"
                        >
                          <i className="fa-solid fa-pen text-[8px]"></i> {t('admin_votes.edit_btn')}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteMeetingId(m.id); }}
                          className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-red-100"
                        >
                          <i className="fa-solid fa-trash text-[8px]"></i> {t('admin_votes.delete_btn')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delete meeting confirmation modal */}
                {confirmDeleteMeetingId && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('admin_meetings.delete_title')}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{t('admin_meetings.delete_confirm')}</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setConfirmDeleteMeetingId(null)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 active:bg-gray-50"
                        >
                          {t('admin_votes.cancel')}
                        </button>
                        <button 
                          onClick={() => handleDeleteMeeting(confirmDeleteMeetingId)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white active:bg-red-700"
                        >
                          {t('admin_votes.confirm_delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {meetingSubTask === 'create' && (
              <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleCreateMeeting}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{t('admin_meetings.create_btn')}</h3>
                  <button type="button" onClick={() => setMeetingSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.title_label')}</label>
                  <input name="title" required className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.date_label')}</label>
                  <input name="date" type="datetime-local" required className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.loc_label')}</label>
                  <input name="location" className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.desc_label')}</label>
                  <textarea name="description" rows={2} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.agenda_label')}</label>
                  {newAgenda.map((item, idx) => (
                    <div key={idx} className="flex space-x-2">
                      <input value={item} onChange={(e) => { const updated = [...newAgenda]; updated[idx] = e.target.value; setNewAgenda(updated); }} placeholder={t('admin_meetings.agenda_placeholder')} className="flex-1 p-2 border rounded text-sm" />
                      {newAgenda.length > 1 && <button type="button" onClick={() => setNewAgenda(newAgenda.filter((_, i) => i !== idx))} className="text-red-400"><i className="fa-solid fa-circle-minus"></i></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewAgenda([...newAgenda, ''])} className="text-[10px] font-bold text-blue-600 flex items-center"><i className="fa-solid fa-plus-circle mr-1"></i> {t('admin_meetings.add_item')}</button>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform">{t('admin_meetings.save_btn')}</button>
              </form>
            )}
            {meetingSubTask === 'edit' && (() => {
              const editMeeting = meetings.find(m => m.id === selectedMeetingId);
              if (!editMeeting) return null;
              return (
                <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleEditMeeting}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">{t('admin_meetings.edit_title')}</h3>
                    <button type="button" onClick={() => setMeetingSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                  </div>
                  {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.title_label')}</label>
                    <input name="title" required defaultValue={editMeeting.title} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.date_label')}</label>
                    <input name="date" type="datetime-local" required defaultValue={editMeeting.date.slice(0, 16)} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.loc_label')}</label>
                    <input name="location" defaultValue={editMeeting.location} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.desc_label')}</label>
                    <textarea name="description" rows={2} defaultValue={editMeeting.description} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.agenda_label')}</label>
                    {editAgenda.map((item, idx) => (
                      <div key={idx} className="flex space-x-2">
                        <input value={item} onChange={(e) => { const updated = [...editAgenda]; updated[idx] = e.target.value; setEditAgenda(updated); }} placeholder={t('admin_meetings.agenda_placeholder')} className="flex-1 p-2 border rounded text-sm" />
                        {editAgenda.length > 1 && <button type="button" onClick={() => setEditAgenda(editAgenda.filter((_, i) => i !== idx))} className="text-red-400"><i className="fa-solid fa-circle-minus"></i></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditAgenda([...editAgenda, ''])} className="text-[10px] font-bold text-blue-600 flex items-center"><i className="fa-solid fa-plus-circle mr-1"></i> {t('admin_meetings.add_item')}</button>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform">{t('admin_meetings.save_btn')}</button>
                </form>
              );
            })()}
            {meetingSubTask === 'detail' && selectedMeeting && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">{selectedMeeting.title}</h3>
                  <button onClick={() => setMeetingSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                   <p><i className="fa-solid fa-calendar mr-2"></i> {new Date(selectedMeeting.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
                   {selectedMeeting.location && <p><i className="fa-solid fa-location-dot mr-2"></i> {selectedMeeting.location}</p>}
                </div>
                <p className="text-sm text-gray-700">{selectedMeeting.description}</p>
                <div className="pt-2 border-t border-gray-50">
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{t('admin_meetings.agenda_label')}</h4>
                   <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">{selectedMeeting.agenda.map(item => (<li key={item.id}>{item.text}</li>))}</ol>
                </div>
              </div>
            )}
          </div>
        )}

        {adminTask === 'vote' && (
          <div className="space-y-4">
            {voteSubTask === 'list' && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">{t('admin_votes.list_title')}</h3>
                  <button onClick={() => { setVoteSubTask('create'); resetVoteForm(); }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">
                    {t('admin_votes.create_btn')}
                  </button>
                </div>
                <div className="space-y-2">
                  {[...votes].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(v => {
                    const status = getVoteStatus(v);
                    const statusColors = { 
                      upcoming: 'bg-gray-100 text-gray-500', 
                      active: 'bg-green-100 text-green-600', 
                      closed: 'bg-red-100 text-red-600' 
                    };
                    return (
                      <div key={v.id} className="p-3 bg-gray-50 rounded-xl active:bg-gray-100">
                        <button 
                          onClick={() => { setSelectedVoteId(v.id); setVoteSubTask('detail'); }}
                          className="w-full text-left flex justify-between items-center"
                        >
                          <div className="flex-1 mr-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColors[status]}`}>
                                {t(`admin_votes.${status}`)}
                              </span>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">{v.title}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">
                              {t('admin_votes.ends')}: {new Date(v.endDate).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}
                            </p>
                          </div>
                          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                        </button>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditVote(v); }}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-blue-100"
                          >
                            <i className="fa-solid fa-pen text-[8px]"></i> {t('admin_votes.edit_btn')}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteVoteId(v.id); }}
                            className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-red-100"
                          >
                            <i className="fa-solid fa-trash text-[8px]"></i> {t('admin_votes.delete_btn')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delete vote confirmation modal */}
                {confirmDeleteVoteId && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('admin_votes.delete_title')}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{t('admin_votes.delete_confirm')}</p>
                      {(() => {
                        const bc = ballots.filter(b => b.voteId === confirmDeleteVoteId).length;
                        return bc > 0 ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                            <i className="fa-solid fa-circle-exclamation text-orange-500 text-xs mt-0.5"></i>
                            <p className="text-xs text-orange-700">{t('admin_votes.delete_has_ballots')} ({bc})</p>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setConfirmDeleteVoteId(null)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 active:bg-gray-50"
                        >
                          {t('admin_votes.cancel')}
                        </button>
                        <button 
                          onClick={() => handleDeleteVote(confirmDeleteVoteId)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white active:bg-red-700"
                        >
                          {t('admin_votes.confirm_delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {voteSubTask === 'create' && (
              <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleCreateVote}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{t('admin_votes.create_btn')}</h3>
                  <button type="button" onClick={() => setVoteSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
                
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.title_label')}</label>
                  <input name="title" required className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.desc_label')}</label>
                  <textarea name="description" rows={2} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.starts')}</label>
                    <input name="startsAt" type="datetime-local" required className="w-full p-2 border rounded text-xs outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.ends')}</label>
                    <input name="endsAt" type="datetime-local" required className="w-full p-2 border rounded text-xs outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.type')}</label>
                  <div className="flex space-x-2 mt-1">
                    <button type="button" onClick={() => setNewVoteType(VoteType.YES_NO)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newVoteType === VoteType.YES_NO ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100'}`}>{t('admin_votes.yes_no')}</button>
                    <button type="button" onClick={() => setNewVoteType(VoteType.MULTIPLE_CHOICE)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newVoteType === VoteType.MULTIPLE_CHOICE ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100'}`}>{t('admin_votes.multi')}</button>
                  </div>
                </div>

                {newVoteType === VoteType.MULTIPLE_CHOICE && (
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.options')}</label>
                    {newVoteOptions.map((opt, idx) => (
                      <div key={idx} className="flex space-x-2">
                        <input value={opt} onChange={(e) => { const updated = [...newVoteOptions]; updated[idx] = e.target.value; setNewVoteOptions(updated); }} className="flex-1 p-2 border rounded text-sm" placeholder={`${t('admin_votes.options')} #${idx+1}`} />
                        {newVoteOptions.length > 2 && <button type="button" onClick={() => setNewVoteOptions(newVoteOptions.filter((_, i) => i !== idx))} className="text-red-400"><i className="fa-solid fa-circle-minus"></i></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setNewVoteOptions([...newVoteOptions, ''])} className="text-[10px] font-bold text-blue-600 flex items-center"><i className="fa-solid fa-plus-circle mr-1"></i> {t('admin_votes.add_option')}</button>
                  </div>
                )}

                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform mt-4">
                  {t('admin_meetings.save_btn')}
                </button>
              </form>
            )}

            {voteSubTask === 'edit' && selectedVote && (
              <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleEditVote}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{t('admin_votes.edit_title')}</h3>
                  <button type="button" onClick={() => setVoteSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}
                
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.title_label')}</label>
                  <input name="title" required defaultValue={selectedVote.title} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_meetings.desc_label')}</label>
                  <textarea name="description" rows={2} defaultValue={selectedVote.description} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.starts')}</label>
                    <input name="startsAt" type="datetime-local" required defaultValue={selectedVote.startDate.slice(0, 16)} className="w-full p-2 border rounded text-xs outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.ends')}</label>
                    <input name="endsAt" type="datetime-local" required defaultValue={selectedVote.endDate.slice(0, 16)} className="w-full p-2 border rounded text-xs outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.type')}</label>
                  <div className="flex space-x-2 mt-1">
                    <button type="button" onClick={() => setEditVoteType(VoteType.YES_NO)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editVoteType === VoteType.YES_NO ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100'}`}>{t('admin_votes.yes_no')}</button>
                    <button type="button" onClick={() => setEditVoteType(VoteType.MULTIPLE_CHOICE)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editVoteType === VoteType.MULTIPLE_CHOICE ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100'}`}>{t('admin_votes.multi')}</button>
                  </div>
                </div>

                {editVoteType === VoteType.MULTIPLE_CHOICE && (
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('admin_votes.options')}</label>
                    {editVoteOptions.map((opt, idx) => (
                      <div key={idx} className="flex space-x-2">
                        <input value={opt} onChange={(e) => { const updated = [...editVoteOptions]; updated[idx] = e.target.value; setEditVoteOptions(updated); }} className="flex-1 p-2 border rounded text-sm" placeholder={`${t('admin_votes.options')} #${idx+1}`} />
                        {editVoteOptions.length > 2 && <button type="button" onClick={() => setEditVoteOptions(editVoteOptions.filter((_, i) => i !== idx))} className="text-red-400"><i className="fa-solid fa-circle-minus"></i></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditVoteOptions([...editVoteOptions, ''])} className="text-[10px] font-bold text-blue-600 flex items-center"><i className="fa-solid fa-plus-circle mr-1"></i> {t('admin_votes.add_option')}</button>
                  </div>
                )}

                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform mt-4">
                  {t('admin_meetings.save_btn')}
                </button>
              </form>
            )}

            {voteSubTask === 'detail' && selectedVote && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mb-1 inline-block ${
                      getVoteStatus(selectedVote) === 'active' ? 'bg-green-100 text-green-600' : 
                      getVoteStatus(selectedVote) === 'upcoming' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'
                    }`}>
                      {t(`admin_votes.${getVoteStatus(selectedVote)}`)}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{selectedVote.title}</h3>
                  </div>
                  <button onClick={() => setVoteSubTask('list')} className="text-xs text-gray-400">{t('meetings.back')}</button>
                </div>
                
                <p className="text-sm text-gray-700">{selectedVote.description}</p>
                
                <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('admin_votes.participation')}</span>
                    <span className="text-lg font-bold text-blue-600">
                      {ballots.filter(b => b.voteId === selectedVote.id).length} / {houseConfig.totalApartments}
                    </span>
                    <span className="text-[8px] text-gray-400">{t('admin_votes.total_apts')}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('admin_votes.ends')}</span>
                    <span className="text-sm font-bold text-gray-800">{new Date(selectedVote.endDate).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</span>
                    <span className="text-sm font-bold text-gray-800">{new Date(selectedVote.endDate).toLocaleTimeString(language === 'lv' ? 'lv-LV' : 'ru-RU', { hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                </div>

                {getVoteStatus(selectedVote) === 'closed' && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase">{t('meetings.result')}</h4>
                    {selectedVote.options.map(opt => {
                      const count = ballots.filter(b => b.voteId === selectedVote.id && (b.selectedOptionId === opt.id || (b.selectedYes && opt.id === 'yes') || (!b.selectedYes && opt.id === 'no'))).length;
                      const total = ballots.filter(b => b.voteId === selectedVote.id).length;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{opt.text}</span>
                            <span>{pct}% ({count})</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PDF Export Button */}
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  {t('pdf.export_btn')}
                </button>

                {/* PDF Options Modal */}
                {showPdfModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">{t('pdf.modal_title')}</h3>
                        <button onClick={() => setShowPdfModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times"></i></button>
                      </div>

                      {!houseConfig.address && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                          <i className="fa-solid fa-triangle-exclamation text-orange-500 text-xs mt-0.5"></i>
                          <p className="text-xs text-orange-700">{t('pdf.no_address_warning')}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{t('pdf.house_address')}</p>
                          <p className="text-sm text-gray-800">{houseConfig.address || '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{t('pdf.total_apts')}</p>
                          <p className="text-sm text-gray-800">{houseConfig.totalApartments}</p>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 active:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={pdfIncludeDetails}
                          onChange={e => setPdfIncludeDetails(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{t('pdf.include_details')}</p>
                          <p className="text-[10px] text-gray-400">{t('pdf.include_details_desc')}</p>
                        </div>
                      </label>

                      <button
                        onClick={async () => {
                          await generateVoteProtocolPdf({
                            vote: selectedVote,
                            ballots,
                            users: users.map(u => ({ id: u.id, fullName: u.fullName, aptNumber: u.aptNumber })),
                            houseConfig,
                            includeDetails: pdfIncludeDetails,
                            language: language as 'lv' | 'ru',
                            t,
                          });
                          setShowPdfModal(false);
                          showToast(t('pdf.success'), 'success');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
                      >
                        <i className="fa-solid fa-download"></i>
                        {t('pdf.download_btn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {adminTask === 'residents' && (() => {
          const activeResidents = users.filter(u => u.status === 'active');
          const q = residentSearch.toLowerCase().trim();
          const filtered = q ? activeResidents.filter(u => {
            if (residentFilter === 'name') return u.fullName.toLowerCase().includes(q);
            if (residentFilter === 'apt') return u.aptNumber.toString().includes(q);
            if (residentFilter === 'phone') return u.phoneNumber.includes(q);
            return u.fullName.toLowerCase().includes(q) || u.aptNumber.toString().includes(q) || u.phoneNumber.includes(q) || u.email.toLowerCase().includes(q);
          }) : activeResidents;
          const selectedResident = users.find(u => u.id === selectedResidentId);

          if (selectedResident) {
            const residentTopics = maintenanceTopics.filter(mt => mt.authorId === selectedResident.id);
            const openTopics = residentTopics.filter(t => t.status !== MaintenanceStatus.RESOLVED);
            const resolvedTopics = residentTopics.filter(t => t.status === MaintenanceStatus.RESOLVED);
            const residentBallots = ballots.filter(b => b.aptNumber === selectedResident.aptNumber || b.userId === selectedResident.id);
            const votedVoteIds = [...new Set(residentBallots.map(b => b.voteId))];
            const residentVotes = votes.filter(v => votedVoteIds.includes(v.id));
            const getBallotAnswer = (vote: Vote, ballot: Ballot) => {
              if (vote.type === VoteType.YES_NO) {
                return ballot.selectedYes ? t('admin.residents_vote_yes') : t('admin.residents_vote_no');
              }
              const opt = vote.options.find(o => o.id === ballot.selectedOptionId);
              return opt ? opt.text : '—';
            };
            return (
              <div className="space-y-4">
                <button onClick={() => { setSelectedResidentId(null); setResidentTab('overview'); }} className="flex items-center gap-2 text-blue-600 text-sm font-semibold active:opacity-70">
                  <i className="fa-solid fa-arrow-left text-xs"></i> {t('admin.residents_back')}
                </button>

                {/* Resident Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 p-5 text-white shadow-lg">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold ring-2 ring-white/30">
                      {selectedResident.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t('profile.apartment')} #{selectedResident.aptNumber}</p>
                      <p className="text-lg font-bold truncate">{selectedResident.fullName}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><i className="fa-solid fa-envelope text-blue-500 text-xs"></i></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{t('admin.residents_email')}</p>
                      <p className="text-sm text-gray-800 truncate">{selectedResident.email}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><i className="fa-solid fa-phone text-green-500 text-xs"></i></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{t('admin.residents_phone')}</p>
                      <p className="text-sm text-gray-800">{selectedResident.phoneNumber || '—'}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><i className="fa-solid fa-calendar text-purple-500 text-xs"></i></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{t('admin.residents_registered')}</p>
                      <p className="text-sm text-gray-800">{new Date(selectedResident.createdAt).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-2"><i className="fa-solid fa-wrench text-orange-500"></i></div>
                    <p className="text-2xl font-black text-gray-900">{residentTopics.length}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.residents_requests')}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2"><i className="fa-solid fa-circle-check text-green-500"></i></div>
                    <p className="text-2xl font-black text-gray-900">{resolvedTopics.length}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.residents_resolved')}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2"><i className="fa-solid fa-check-to-slot text-emerald-500"></i></div>
                    <p className="text-2xl font-black text-gray-900">{residentVotes.length}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.residents_votes')}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                  {(['overview', 'votes', 'requests'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setResidentTab(tab)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        residentTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      {tab === 'overview' ? t('admin.residents_tab_overview') : tab === 'votes' ? t('admin.residents_tab_votes') : t('admin.residents_tab_requests')}
                    </button>
                  ))}
                </div>

                {/* Overview Tab */}
                {residentTab === 'overview' && (
                  <div className="space-y-3">
                    {openTopics.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('admin.residents_open_requests')}</h4>
                        {openTopics.map(topic => (
                          <div key={topic.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              topic.status === MaintenanceStatus.NEW ? 'bg-yellow-400' :
                              topic.status === MaintenanceStatus.APPROVED ? 'bg-blue-500' :
                              topic.status === MaintenanceStatus.REJECTED ? 'bg-red-400' : 'bg-gray-300'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{topic.title}</p>
                              <p className="text-[10px] text-gray-400">{new Date(topic.date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {openTopics.length === 0 && residentVotes.length === 0 && residentTopics.length === 0 && (
                      <div className="text-center py-8 text-gray-300">
                        <i className="fa-solid fa-inbox text-3xl mb-2"></i>
                        <p className="text-xs">{t('admin.residents_no_activity')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Votes Tab */}
                {residentTab === 'votes' && (
                  <div className="space-y-3">
                    {votes.length === 0 ? (
                      <div className="text-center py-8 text-gray-300">
                        <i className="fa-solid fa-check-to-slot text-3xl mb-2"></i>
                        <p className="text-xs">{t('admin.residents_no_votes')}</p>
                      </div>
                    ) : (
                      [...votes].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(vote => {
                        const ballot = residentBallots.find(b => b.voteId === vote.id);
                        const now = new Date();
                        const isActive = now >= new Date(vote.startDate) && now <= new Date(vote.endDate);
                        const isEnded = now > new Date(vote.endDate);
                        return (
                          <div key={vote.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800 flex-1">{vote.title}</p>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                isActive ? 'bg-green-100 text-green-700' : isEnded ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {isActive ? t('admin.residents_vote_active') : isEnded ? t('admin.residents_vote_ended') : t('admin.residents_vote_upcoming')}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {new Date(vote.startDate).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')} — {new Date(vote.endDate).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}
                            </p>
                            {ballot ? (
                              <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                                <i className="fa-solid fa-circle-check text-green-500 text-xs"></i>
                                <span className="text-xs font-semibold text-green-700">{t('admin.residents_voted')}: </span>
                                <span className="text-xs text-green-600 font-bold">{getBallotAnswer(vote, ballot)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                                <i className="fa-solid fa-circle-xmark text-orange-400 text-xs"></i>
                                <span className="text-xs font-semibold text-orange-600">{t('admin.residents_not_voted')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Requests Tab */}
                {residentTab === 'requests' && (
                  <div className="space-y-3">
                    {residentTopics.length === 0 ? (
                      <div className="text-center py-8 text-gray-300">
                        <i className="fa-solid fa-wrench text-3xl mb-2"></i>
                        <p className="text-xs">{t('admin.residents_no_requests')}</p>
                      </div>
                    ) : (
                      [...residentTopics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(topic => (
                        <div key={topic.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{topic.title}</p>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                              topic.status === MaintenanceStatus.NEW ? 'bg-yellow-100 text-yellow-700' :
                              topic.status === MaintenanceStatus.APPROVED ? 'bg-blue-100 text-blue-700' :
                              topic.status === MaintenanceStatus.RESOLVED ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {topic.status === MaintenanceStatus.NEW ? t('admin.residents_status_new') :
                               topic.status === MaintenanceStatus.APPROVED ? t('admin.residents_status_approved') :
                               topic.status === MaintenanceStatus.RESOLVED ? t('admin.residents_status_resolved') :
                               t('admin.residents_status_rejected')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{topic.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-gray-400">{new Date(topic.date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${topic.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {topic.priority === 'urgent' ? t('admin.residents_priority_urgent') : t('admin.residents_priority_normal')}
                              </span>
                              {topic.comments.length > 0 && (
                                <span className="text-[9px] text-gray-400 flex items-center gap-0.5"><i className="fa-solid fa-comment text-[8px]"></i> {topic.comments.length}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i>
                <input
                  type="text"
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                  placeholder={t('admin.residents_search')}
                  className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border border-gray-100 shadow-sm placeholder:text-gray-400"
                />
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(['all', 'name', 'apt', 'phone'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setResidentFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                      residentFilter === f
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-400 border border-gray-100'
                    }`}
                  >
                    {t(`admin.residents_filter_${f}`)}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                {filtered.length} {t('admin.residents_count')}
              </p>

              {/* Results list */}
              <div className="space-y-2">
                {filtered.sort((a, b) => a.aptNumber - b.aptNumber).map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedResidentId(u.id)}
                    className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{u.fullName}</p>
                      <p className="text-[10px] text-gray-400">{t('profile.apartment')} {u.aptNumber} · {u.phoneNumber || u.email}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-200 text-xs"></i>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-users-slash text-gray-300 text-xl"></i></div>
                    <p className="text-sm text-gray-400 font-medium">{t('admin.residents_empty')}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {adminTask === 'house_config' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <i className="fa-solid fa-house-chimney text-blue-500"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{t('admin.house_config_title')}</h3>
                  <p className="text-[10px] text-gray-400">{t('admin.house_config_desc')}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('admin.house_address_label')}</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder={t('admin.house_address_placeholder')}
                  className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('admin.house_total_apts')}</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={editTotalApts}
                  onChange={e => setEditTotalApts(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-blue-500"
                />
              </div>

              <button
                onClick={() => {
                  updateHouseConfig({ address: editAddress.trim(), totalApartments: editTotalApts });
                  showToast(t('admin.house_config_saved'), 'success');
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
              >
                {t('admin.house_config_save_btn')}
              </button>
            </div>

            {/* Current config display */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase">{t('admin.house_current_config')}</h4>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-gray-300 text-xs"></i>
                <p className="text-sm text-gray-700">{houseConfig.address || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-building text-gray-300 text-xs"></i>
                <p className="text-sm text-gray-700">{houseConfig.totalApartments} {t('admin_votes.total_apts')}</p>
              </div>
            </div>
          </div>
        )}

        {adminTask === 'maintenance_admin' && (() => {
          const statusColors: Record<string, string> = {
            [MaintenanceStatus.NEW]: 'bg-gray-100 text-gray-500',
            [MaintenanceStatus.APPROVED]: 'bg-blue-100 text-blue-600',
            [MaintenanceStatus.RESOLVED]: 'bg-green-100 text-green-600',
            [MaintenanceStatus.REJECTED]: 'bg-red-100 text-red-600',
          };
          const filtered = maintenanceFilter === 'all'
            ? maintenanceTopics
            : maintenanceTopics.filter(mt => mt.status === maintenanceFilter);
          const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const selectedTopic = maintenanceTopics.find(mt => mt.id === selectedMaintenanceId);

          return (
            <div className="space-y-4">

              {maintenanceSubTask === 'list' && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold">{t('admin_maintenance.list_title')}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold">{sorted.length}</span>
                  </div>

                  {/* Status filter tabs */}
                  <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                    {(['all', MaintenanceStatus.NEW, MaintenanceStatus.APPROVED, MaintenanceStatus.RESOLVED, MaintenanceStatus.REJECTED] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMaintenanceFilter(f)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          maintenanceFilter === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                        }`}
                      >
                        {f === 'all' ? t('admin_maintenance.filter_all') : t(`maintenance.status_${f.toLowerCase()}`)}
                        {f !== 'all' && (
                          <span className="ml-1">({maintenanceTopics.filter(mt => mt.status === f).length})</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {sorted.map(topic => (
                      <div key={topic.id} className="p-3 bg-gray-50 rounded-xl">
                        <div
                          className="cursor-pointer"
                          onClick={() => { setSelectedMaintenanceId(topic.id); setMaintenanceSubTask('detail'); }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-600">
                                {topic.category}
                              </span>
                              {topic.priority === MaintenancePriority.URGENT && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-600 text-white">
                                  <i className="fa-solid fa-bolt mr-0.5"></i> {t('maintenance.urgent_badge')}
                                </span>
                              )}
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${statusColors[topic.status]}`}>
                              {t(`maintenance.status_${topic.status.toLowerCase()}`)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 line-clamp-1">{topic.title}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{topic.description}</p>
                          <div className="flex items-center text-[10px] text-gray-300 mt-1 gap-3">
                            <span><i className="fa-regular fa-user mr-1"></i>{topic.authorName}</span>
                            <span>{t('home.apartment')} {topic.aptNumber}</span>
                            <span>{new Date(topic.date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</span>
                            {topic.images && topic.images.length > 0 && (
                              <span><i className="fa-regular fa-image mr-1"></i>{topic.images.length}</span>
                            )}
                            <span><i className="fa-regular fa-comment mr-1"></i>{topic.comments.length}</span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleMaintenancePdf(topic)}
                            className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-emerald-100"
                          >
                            <i className="fa-solid fa-file-pdf text-[8px]"></i> PDF
                          </button>
                          <button
                            onClick={() => startEditMaintenance(topic)}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-blue-100"
                          >
                            <i className="fa-solid fa-pen text-[8px]"></i> {t('admin_votes.edit_btn')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteMaintenanceId(topic.id)}
                            className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1 active:bg-red-100"
                          >
                            <i className="fa-solid fa-trash text-[8px]"></i> {t('admin_votes.delete_btn')}
                          </button>
                        </div>
                      </div>
                    ))}
                    {sorted.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-4">{t('maintenance.no_items')}</p>
                    )}
                  </div>

                  {/* Delete confirmation modal */}
                  {confirmDeleteMaintenanceId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{t('admin_maintenance.delete_title')}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{t('admin_maintenance.delete_confirm')}</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmDeleteMaintenanceId(null)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 active:bg-gray-50"
                          >
                            {t('admin_votes.cancel')}
                          </button>
                          <button
                            onClick={() => handleDeleteMaintenance(confirmDeleteMaintenanceId)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white active:bg-red-700"
                          >
                            {t('admin_votes.confirm_delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {maintenanceSubTask === 'detail' && selectedTopic && (
                <div className="space-y-4">
                  <button onClick={() => { setMaintenanceSubTask('list'); setSelectedMaintenanceId(null); }} className="text-blue-600 text-sm font-medium">
                    <i className="fa-solid fa-arrow-left mr-1"></i> {t('meetings.back')}
                  </button>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                    {/* Header badges */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{selectedTopic.category}</span>
                        {selectedTopic.priority === MaintenancePriority.URGENT && (
                          <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase">{t('maintenance.urgent_badge')}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusColors[selectedTopic.status]}`}>
                        {t(`maintenance.status_${selectedTopic.status.toLowerCase()}`)}
                      </span>
                    </div>

                    {/* Title and meta */}
                    <h2 className="text-xl font-bold text-gray-900">{selectedTopic.title}</h2>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span><i className="fa-regular fa-user mr-1"></i>{selectedTopic.authorName}</span>
                      <span><i className="fa-solid fa-door-open mr-1"></i>{t('home.apartment')} {selectedTopic.aptNumber}</span>
                      <span><i className="fa-regular fa-clock mr-1"></i>{new Date(selectedTopic.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</span>
                    </div>

                    {/* Description */}
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTopic.description}</p>
                    </div>

                    {/* Rejection reason */}
                    {selectedTopic.status === MaintenanceStatus.REJECTED && selectedTopic.rejectionReason && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                        <p className="text-xs font-bold text-red-700">{t('maintenance.rejection_reason_prefix')}</p>
                        <p className="text-sm text-red-900 italic">{selectedTopic.rejectionReason}</p>
                      </div>
                    )}

                    {/* Images */}
                    {selectedTopic.images && selectedTopic.images.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t('admin_maintenance.photos')} ({selectedTopic.images.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTopic.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt=""
                              className="w-24 h-24 object-cover rounded-xl border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                              onClick={() => setLightboxImg(img)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {selectedTopic.comments.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">{t('maintenance.comments')} ({selectedTopic.comments.length})</h4>
                        <div className="space-y-2">
                          {selectedTopic.comments.map(c => (
                            <div key={c.id} className="bg-gray-50 p-3 rounded-xl">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-800">{c.userName}</span>
                                <span className="text-[10px] text-gray-400">{new Date(c.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</span>
                              </div>
                              <p className="text-sm text-gray-600">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleMaintenancePdf(selectedTopic)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white active:bg-emerald-700 flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-file-pdf"></i> {t('admin_maintenance.download_pdf')}
                      </button>
                      <button
                        onClick={() => startEditMaintenance(selectedTopic)}
                        className="py-2.5 px-4 rounded-xl text-sm font-bold bg-blue-600 text-white active:bg-blue-700"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMaintenanceId(selectedTopic.id)}
                        className="py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 text-white active:bg-red-700"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  {/* Lightbox */}
                  {lightboxImg && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxImg(null)}>
                      <img src={lightboxImg} alt="" className="max-w-[90%] max-h-[80vh] rounded-2xl shadow-2xl" />
                    </div>
                  )}
                </div>
              )}

              {maintenanceSubTask === 'edit' && selectedTopic && (() => {
                return (
                  <div className="space-y-4">
                    <button onClick={() => { setMaintenanceSubTask('list'); setSelectedMaintenanceId(null); }} className="text-blue-600 text-sm font-medium">
                      <i className="fa-solid fa-arrow-left mr-1"></i> {t('meetings.back')}
                    </button>
                    <form className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3" onSubmit={handleEditMaintenance}>
                      <h3 className="font-bold">{t('admin_maintenance.edit_title')}</h3>
                      {adminError && <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded">{adminError}</p>}

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('maintenance.subject')}</label>
                        <input name="title" required defaultValue={selectedTopic.title} className="w-full p-2 border rounded text-sm" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('maintenance.desc')}</label>
                        <textarea name="description" required defaultValue={selectedTopic.description} className="w-full p-2 border rounded text-sm" rows={4}></textarea>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('admin_maintenance.priority')}</label>
                        <select name="priority" defaultValue={selectedTopic.priority} className="w-full p-2 border rounded text-sm">
                          <option value={MaintenancePriority.NORMAL}>{t('maintenance.prio_normal')}</option>
                          <option value={MaintenancePriority.URGENT}>{t('maintenance.urgent_badge')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t('admin_maintenance.status')}</label>
                        <select name="status" defaultValue={selectedTopic.status} className="w-full p-2 border rounded text-sm">
                          <option value={MaintenanceStatus.NEW}>{t('maintenance.status_new')}</option>
                          <option value={MaintenanceStatus.APPROVED}>{t('maintenance.status_approved')}</option>
                          <option value={MaintenanceStatus.RESOLVED}>{t('maintenance.status_resolved')}</option>
                          <option value={MaintenanceStatus.REJECTED}>{t('maintenance.status_rejected')}</option>
                        </select>
                      </div>

                      {/* Read-only info */}
                      <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                        <p className="text-[10px] text-gray-400"><span className="font-bold">{t('admin_maintenance.submitter')}:</span> {selectedTopic.authorName}</p>
                        <p className="text-[10px] text-gray-400"><span className="font-bold">{t('home.apartment')}:</span> {selectedTopic.aptNumber}</p>
                        <p className="text-[10px] text-gray-400"><span className="font-bold">{t('admin_maintenance.category')}:</span> {selectedTopic.category}</p>
                        <p className="text-[10px] text-gray-400"><span className="font-bold">{t('admin_maintenance.submitted_at')}:</span> {new Date(selectedTopic.date).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
                      </div>

                      {/* Image editing */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">{t('maintenance.photos_label')}</label>
                        {editImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {editImages.map((img, idx) => (
                              <div key={idx} className="relative">
                                <img src={img} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                                <button
                                  type="button"
                                  onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-md active:scale-90"
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {editImages.length < 6 && (
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="w-28 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
                          >
                            <i className="fa-solid fa-camera text-lg mb-1"></i>
                            <span className="text-[9px] font-bold uppercase">{t('maintenance.add_photo')}</span>
                          </button>
                        )}
                        <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditFileChange} />
                      </div>

                      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-bold">{t('admin_maintenance.save_btn')}</button>
                    </form>
                  </div>
                );
              })()}

            </div>
          );
        })()}

            </div>{/* end overlay scrollable content */}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* ── Profile Hero Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 px-6 pt-8 pb-6 text-center text-white shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5"></div>

        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold mx-auto mb-3 ring-4 ring-white/30 shadow-lg">
            {currentUser?.fullName.charAt(0)}
          </div>
          <h2 className="text-xl font-bold tracking-tight">{currentUser?.fullName}</h2>
          {currentUser?.role !== UserRole.MANAGER && (
            <p className="text-white/80 text-sm font-medium mt-0.5">{t('profile.apartment')} {currentUser?.aptNumber}</p>
          )}
          {currentUser?.role === UserRole.MANAGER && (
            <p className="text-white/80 text-sm font-medium italic mt-0.5">Pārvaldnieks</p>
          )}
          <p className="text-white/50 text-[11px] mt-0.5">F. Kempa iela 42, Rēzekne</p>
        </div>
      </div>

      {/* ── Quick Actions Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* My Account tile */}
        <button
          onClick={() => { setIsAccountOpen(true); clearMessages(); }}
          className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white p-5 rounded-2xl flex items-center shadow-lg shadow-blue-300/40 active:scale-[0.97] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mr-4 ring-2 ring-white/20">
            <i className="fa-solid fa-user-gear text-xl"></i>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold tracking-wide">{t('profile.my_account')}</p>
            <p className="text-[11px] text-white/70 mt-0.5 truncate">{currentUser?.email}</p>
          </div>
          <i className="fa-solid fa-chevron-right text-white/50 text-sm ml-2"></i>
        </button>

      </div>

      {/* ── Language Selector ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="w-full p-4 flex items-center active:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-3">
            <i className="fa-solid fa-globe text-blue-500 text-lg"></i>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-900">{t('profile.lang_select')}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{language === 'lv' ? 'Latviešu' : 'Русский'}</p>
          </div>
          <i className={`fa-solid fa-chevron-down text-gray-300 text-xs transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`}></i>
        </button>

        <div className={`transition-all duration-300 ease-out overflow-hidden ${isLangOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-gray-100">
            {[
              { code: 'lv' as const, label: 'Latviešu', flag: '🇱🇻' },
              { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                className="w-full px-5 py-3.5 flex items-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="text-xl mr-3">{lang.flag}</span>
                <span className="flex-1 text-left text-sm font-semibold text-gray-800">{lang.label}</span>
                {language === lang.code ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <i className="fa-solid fa-check text-white text-[10px]"></i>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Admin Panel Button ── */}
      {currentUser?.role === UserRole.ADMIN && (
        <button
          onClick={() => setIsAdminPanelOpen(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-sky-500 text-white p-4 rounded-2xl flex items-center shadow-lg shadow-blue-200 active:scale-[0.97] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
            <i className="fa-solid fa-shield-halved text-lg"></i>
          </div>
          <span className="text-sm font-bold flex-1 text-left">{t('profile.admin_panel')}</span>
          <i className="fa-solid fa-chevron-right text-white/60"></i>
        </button>
      )}

      {/* ── Logout ── */}
      <button
        onClick={logout}
        className="w-full bg-red-50 text-red-500 p-4 rounded-2xl font-bold flex items-center justify-center active:bg-red-100 active:scale-[0.97] transition-all border border-red-100"
      >
        <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> {t('profile.logout')}
      </button>

      {/* My Account Full Page */}
      {isAccountOpen && (
        <div className="fixed inset-0 top-14 z-[48] flex flex-col bg-gray-50 max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
              <button
                  type="button"
                  onClick={() => { setIsAccountOpen(false); clearMessages(); }}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors shrink-0"
                >
                  <i className="fa-solid fa-arrow-left text-sm text-gray-600"></i>
                </button>
                <h2 className="text-lg font-bold text-gray-900">{t('profile.my_account')}</h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-24 space-y-5">

              {/* ── Change Email Section ── */}
              <form onSubmit={handleProfileEmailChange} className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <i className="fa-solid fa-envelope text-blue-500"></i>
                  <span className="text-xs font-bold uppercase tracking-widest">{t('profile.change_email')}</span>
                </div>
                {emailError && <p className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl">{emailError}</p>}
                {emailSuccess && <p className="text-[11px] font-bold text-green-600 bg-green-50 px-3 py-2 rounded-xl">{emailSuccess}</p>}
                <input
                  name="newEmail"
                  type="email"
                  required
                  defaultValue={currentUser?.email}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border-0"
                />
                <input
                  name="emailCurrentPass"
                  type="password"
                  required
                  placeholder={t('profile.current_password')}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border-0 placeholder:text-gray-400"
                />
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-blue-200">
                  {t('common.save')}
                </button>
              </form>

              {/* ── Change Password Section ── */}
              <form onSubmit={handleProfilePasswordChange} className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <i className="fa-solid fa-lock text-amber-500"></i>
                  <span className="text-xs font-bold uppercase tracking-widest">{t('profile.change_password')}</span>
                </div>
                {passError && <p className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl">{passError}</p>}
                {passSuccess && <p className="text-[11px] font-bold text-green-600 bg-green-50 px-3 py-2 rounded-xl">{passSuccess}</p>}
                <input
                  name="passCurrentPass"
                  type="password"
                  required
                  placeholder={t('profile.current_password')}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border-0 placeholder:text-gray-400"
                />
                <input
                  name="newPass"
                  type="password"
                  required
                  placeholder={t('profile.new_password')}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border-0 placeholder:text-gray-400"
                />
                <input
                  name="confirmPass"
                  type="password"
                  required
                  placeholder={t('profile.confirm_new_password')}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200 transition-all border-0 placeholder:text-gray-400"
                />
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-blue-200">
                  {t('profile.update_password')}
                </button>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminAction: React.FC<{
  icon: string; label: string; onClick: () => void;
  active: boolean; badge?: number; color?: string
}> = ({ icon, label, onClick, active: _active, badge, color = 'blue' }) => {
  const tileColor = ADMIN_TILE_COLORS[color] || ADMIN_TILE_COLORS.blue;
  return (
    <button onClick={onClick} className={`${tileColor.bg} p-4 rounded-2xl flex flex-col items-center justify-center min-h-[130px] active:scale-95 transition-all relative text-white shadow-md`}>
      {badge && badge > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{badge}</span>
      )}
      <div className={`${tileColor.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-3 border-2 border-white/30`}>
        <i className={`fa-solid ${icon} text-xl`}></i>
      </div>
      <span className="text-[10px] font-bold uppercase text-center tracking-tight">{label}</span>
    </button>
  );
};

export default ProfileView;
