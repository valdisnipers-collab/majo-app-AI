
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import { MaintenanceStatus, MaintenancePriority, UserRole } from '../types';
import type { MaintenanceTopic } from '../types';

interface MaintenanceViewProps {
  initialTopicId?: string | null;
  onTopicConsumed?: () => void;
}

const MaintenanceView: React.FC<MaintenanceViewProps> = ({ initialTopicId, onTopicConsumed }) => {
  const { maintenanceTopics, addMaintenanceTopic, addMaintenanceComment, updateMaintenanceStatus, currentUser } = useStore();
  const { t, language } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<MaintenanceTopic | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newPrio, setNewPrio] = useState(MaintenancePriority.NORMAL);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddMoreDialog, setShowAddMoreDialog] = useState(false);

  // Status Change State (Admin and Manager only)
  const [isAdminChangingStatus, setIsAdminChangingStatus] = useState(false);
  const [targetStatus, setTargetStatus] = useState<MaintenanceStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState('');

  const isManager = currentUser?.role === UserRole.MANAGER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    if (initialTopicId) {
      const topic = maintenanceTopics.find(t => t.id === initialTopicId);
      if (topic) {
        setSelectedTopic(topic);
        onTopicConsumed?.();
      }
    }
  }, [initialTopicId, maintenanceTopics, onTopicConsumed]);

  const formatDateTime = (d: string) => new Date(d).toLocaleString(language === 'lv' ? 'lv-LV' : 'ru-RU');

  const getStatusLabel = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.NEW: return t('maintenance.status_new');
      case MaintenanceStatus.APPROVED: return t('maintenance.status_approved');
      case MaintenanceStatus.RESOLVED: return t('maintenance.status_resolved');
      case MaintenanceStatus.REJECTED: return t('maintenance.status_rejected');
      default: return status;
    }
  };

  const shrinkImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(t('request.photos.captureError')));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error(t('request.photos.captureError')));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;
          if (width > height) {
            if (width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (attachedPhotos.length >= 6) {
      setFormError(t('request.photos.limitError'));
      return;
    }

    try {
      const base64 = await shrinkImage(files[0]);
      setAttachedPhotos(prev => [...prev, base64]);
      setFormError(null);
      // Success capture: show "Add more" prompt
      setShowAddMoreDialog(true);
    } catch (err) {
      setFormError(t('request.photos.captureError'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setAttachedPhotos(prev => prev.filter((_, i) => i !== index));
    if (attachedPhotos.length <= 6) setFormError(null);
  };

  const handleAddMore = () => {
    setShowAddMoreDialog(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const categoryGroups = [
    { label: t('maintenance.cat_group_shared'), icon: 'fa-building', items: [
      { key: 'stairs', label: t('maintenance.cat_stairs'), icon: 'fa-stairs' },
      { key: 'basement', label: t('maintenance.cat_basement'), icon: 'fa-warehouse' },
      { key: 'attic', label: t('maintenance.cat_attic'), icon: 'fa-arrow-up' },
      { key: 'elevator', label: t('maintenance.cat_elevator'), icon: 'fa-elevator' },
    ]},
    { label: t('maintenance.cat_group_exterior'), icon: 'fa-house-chimney', items: [
      { key: 'roof', label: t('maintenance.cat_roof'), icon: 'fa-tent' },
      { key: 'facade', label: t('maintenance.cat_facade'), icon: 'fa-building-columns' },
      { key: 'yard', label: t('maintenance.cat_yard'), icon: 'fa-tree' },
      { key: 'parking', label: t('maintenance.cat_parking'), icon: 'fa-square-parking' },
    ]},
    { label: t('maintenance.cat_group_engineering'), icon: 'fa-gear', items: [
      { key: 'water', label: t('maintenance.cat_water'), icon: 'fa-droplet' },
      { key: 'heating', label: t('maintenance.cat_heating'), icon: 'fa-temperature-high' },
      { key: 'electrical', label: t('maintenance.cat_electrical'), icon: 'fa-bolt' },
      { key: 'ventilation', label: t('maintenance.cat_ventilation'), icon: 'fa-wind' },
    ]},
    { label: t('maintenance.cat_group_other'), icon: 'fa-ellipsis', items: [
      { key: 'other', label: t('maintenance.cat_other'), icon: 'fa-circle-question' },
    ]},
  ];

  const selectedCatLabel = categoryGroups.flatMap(g => g.items).find(i => i.key === newCat)?.label || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isManager) return;
    if (!newCat) {
      setFormError(t('maintenance.cat_required'));
      return;
    }

    const topic: MaintenanceTopic = {
      id: Math.random().toString(36).substring(7),
      title: newTitle,
      description: newDesc,
      category: selectedCatLabel,
      priority: newPrio,
      status: MaintenanceStatus.NEW,
      authorId: currentUser!.id,
      authorName: currentUser!.fullName,
      aptNumber: currentUser!.aptNumber,
      date: new Date().toISOString(),
      comments: [],
      images: attachedPhotos
    };
    addMaintenanceTopic(topic);
    setIsCreating(false);
    setNewTitle('');
    setNewDesc('');
    setNewCat('');
    setIsCatOpen(false);
    setAttachedPhotos([]);
    setFormError(null);
  };

  const handleStatusUpdate = () => {
    if (!selectedTopic || !targetStatus) return;
    if (targetStatus === MaintenanceStatus.REJECTED && !rejectionReason.trim()) return;

    updateMaintenanceStatus(selectedTopic.id, targetStatus, rejectionReason.trim());
    setSelectedTopic({ 
      ...selectedTopic, 
      status: targetStatus, 
      rejectionReason: targetStatus === MaintenanceStatus.REJECTED ? rejectionReason.trim() : undefined 
    });
    setIsAdminChangingStatus(false);
    setTargetStatus(null);
    setRejectionReason('');
  };

  const postComment = () => {
    if (!commentText.trim() || !selectedTopic || isManager) return;
    const comment = {
      id: Math.random().toString(36).substring(7),
      userId: currentUser!.id,
      userName: currentUser!.fullName,
      text: commentText,
      date: new Date().toISOString()
    };
    addMaintenanceComment(selectedTopic.id, comment);
    setCommentText('');
    setSelectedTopic({ ...selectedTopic, comments: [...selectedTopic.comments, comment] });
  };

  if (isCreating) {
    return (
      <div className="space-y-6 relative">
        <header className="flex justify-between items-center">
            <h2 className="text-2xl font-light text-gray-900">{t('maintenance.new_ticket')}</h2>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times text-xl"></i></button>
        </header>
        {formError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex items-center">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('maintenance.cat_label')}</label>
            <button
              type="button"
              onClick={() => setIsCatOpen(!isCatOpen)}
              className={`w-full bg-white border p-3 rounded-xl text-left flex items-center justify-between transition-all ${
                isCatOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
              }`}
            >
              {newCat ? (
                <span className="text-sm text-gray-800 font-medium">{selectedCatLabel}</span>
              ) : (
                <span className="text-sm text-gray-300">{t('maintenance.cat_placeholder')}</span>
              )}
              <i className={`fa-solid fa-chevron-down text-xs text-gray-300 transition-transform ${isCatOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isCatOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-1">
                <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                  {categoryGroups.map(group => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                        <i className={`fa-solid ${group.icon} text-[10px] text-gray-300`}></i>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{group.label}</span>
                      </div>
                      {group.items.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => { setNewCat(item.key); setIsCatOpen(false); setFormError(null); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                            newCat === item.key
                              ? 'bg-blue-50 text-blue-600'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            newCat === item.key ? 'bg-blue-100' : 'bg-gray-50'
                          }`}>
                            <i className={`fa-solid ${item.icon} text-xs ${newCat === item.key ? 'text-blue-500' : 'text-gray-400'}`}></i>
                          </div>
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {newCat === item.key && <i className="fa-solid fa-check text-blue-500 text-xs"></i>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('maintenance.priority')}</label>
            <div className="flex space-x-2">
              <button type="button" onClick={() => setNewPrio(MaintenancePriority.NORMAL)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${newPrio === MaintenancePriority.NORMAL ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}>{t('maintenance.prio_normal')}</button>
              <button type="button" onClick={() => setNewPrio(MaintenancePriority.URGENT)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${newPrio === MaintenancePriority.URGENT ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 text-gray-500'}`}>{t('maintenance.prio_urgent')}</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('maintenance.subject')}</label>
            <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} type="text" placeholder={t('maintenance.subject_placeholder')} className="w-full bg-white border border-gray-200 p-3 rounded-xl outline-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('maintenance.desc')}</label>
            <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={4} placeholder={t('maintenance.desc_placeholder')} className="w-full bg-white border border-gray-200 p-3 rounded-xl outline-blue-500"></textarea>
          </div>
          
          {/* PHOTO ATTACHMENT SECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('maintenance.photos_label')}</label>
            <div className="flex flex-wrap gap-2 mb-1">
              {attachedPhotos.map((photo, index) => (
                <div key={index} className="relative w-20 h-20 group">
                  <img src={photo} alt="" className="w-full h-full object-cover rounded-xl shadow-sm" />
                  <button 
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md active:scale-90"
                  >
                    <i className="fa-solid fa-times text-[10px]"></i>
                  </button>
                </div>
              ))}
              {attachedPhotos.length < 6 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
                >
                  <i className="fa-solid fa-camera mb-1"></i>
                  <span className="text-[8px] font-bold uppercase text-center px-1">{t('maintenance.add_photo')}</span>
                </button>
              )}
            </div>
            {/* HIDDEN CAMERA INPUT */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">{t('maintenance.submit')}</button>
        </form>

        {/* Post-Capture Add More Prompt */}
        {showAddMoreDialog && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-8 px-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddMoreDialog(false)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                  <i className="fa-solid fa-check text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{t('request.photos.addedTitle')}</p>
                  <p className="text-[10px] text-gray-400">{attachedPhotos.length} / 6</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => setShowAddMoreDialog(false)}
                    className="py-2 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-gray-200 text-xs"
                  >
                    {t('common.done')}
                  </button>
                  {attachedPhotos.length < 6 && (
                    <button 
                      onClick={handleAddMore}
                      className="py-2 px-4 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 text-xs"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>{t('request.photos.addMore')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedTopic) {
    const isTopicRejected = selectedTopic.status === MaintenanceStatus.REJECTED;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTopic(null)} className="text-blue-600 text-sm font-medium"><i className="fa-solid fa-arrow-left"></i> {t('maintenance.back')}</button>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
             <div className="flex flex-wrap gap-2">
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{selectedTopic.category}</span>
                {selectedTopic.priority === MaintenancePriority.URGENT && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase">{t('maintenance.urgent_badge')}</span>}
             </div>
             <div className="flex flex-col items-end">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                   selectedTopic.status === MaintenanceStatus.RESOLVED ? 'bg-green-100 text-green-600' : 
                   selectedTopic.status === MaintenanceStatus.REJECTED ? 'bg-red-100 text-red-600' : 
                   selectedTopic.status === MaintenanceStatus.APPROVED ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                   {getStatusLabel(selectedTopic.status)}
                </span>
                {(isAdmin || isManager) && (
                   <button 
                      onClick={() => {
                         setIsAdminChangingStatus(true);
                         setTargetStatus(selectedTopic.status);
                         setRejectionReason(selectedTopic.rejectionReason || '');
                      }} 
                      className="text-[10px] text-blue-600 font-bold underline mt-1"
                   >
                      {t('maintenance.change_status')}
                   </button>
                )}
             </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h2>
          <p className="text-sm text-gray-400 mb-4">{selectedTopic.authorName} {selectedTopic.aptNumber > 0 ? `(${t('home.apartment')} ${selectedTopic.aptNumber})` : ''} • {new Date(selectedTopic.date).toLocaleDateString(language === 'lv' ? 'lv-LV' : 'ru-RU')}</p>
          <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{selectedTopic.description}</p>
          
          {isTopicRejected && selectedTopic.rejectionReason && (
             <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                <p className="text-xs font-bold text-red-700">{t('maintenance.rejection_reason_prefix')}</p>
                <p className="text-sm text-red-900 italic">{selectedTopic.rejectionReason}</p>
             </div>
          )}

          {selectedTopic.images && selectedTopic.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedTopic.images.map((img, idx) => (
                <img key={idx} src={img} alt="" className="w-24 h-24 object-cover rounded-xl border border-gray-100" />
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-4">{t('maintenance.comments')} ({selectedTopic.comments.length})</h3>
            <div className="space-y-4 mb-6">
              {selectedTopic.comments.map(c => (
                <div key={c.id} className="bg-gray-50 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-800">{c.userName}</span>
                    <span className="text-[10px] text-gray-400">{formatDateTime(c.date)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.text}</p>
                </div>
              ))}
              {selectedTopic.comments.length === 0 && <p className="text-xs text-gray-400 italic">{t('maintenance.no_comments')}</p>}
            </div>
            {!isManager && (
              <div className="flex space-x-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} type="text" placeholder={t('maintenance.comment_placeholder')} className="flex-1 bg-gray-100 p-3 rounded-xl text-sm outline-blue-500" />
                <button onClick={postComment} className="bg-blue-600 text-white p-3 rounded-xl active:scale-95"><i className="fa-solid fa-paper-plane"></i></button>
              </div>
            )}
          </div>
        </div>

        {/* Admin/Manager Status Change Modal */}
        {isAdminChangingStatus && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAdminChangingStatus(false)}></div>
              <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden">
                 <h3 className="text-lg font-bold text-gray-900 mb-4">{t('maintenance.change_status')}</h3>
                 <div className="space-y-3">
                    {[MaintenanceStatus.NEW, MaintenanceStatus.APPROVED, MaintenanceStatus.RESOLVED, MaintenanceStatus.REJECTED].map(s => (
                       <button 
                          key={s} 
                          onClick={() => setTargetStatus(s)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all font-bold text-sm flex justify-between items-center ${
                             targetStatus === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-600'
                          }`}
                       >
                          {getStatusLabel(s)}
                          {targetStatus === s && <i className="fa-solid fa-check-circle"></i>}
                       </button>
                    ))}

                    {targetStatus === MaintenanceStatus.REJECTED && (
                       <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('maintenance.rejection_reason_label')}</label>
                          <textarea 
                             autoFocus
                             maxLength={200}
                             value={rejectionReason}
                             onChange={e => setRejectionReason(e.target.value)}
                             placeholder={t('maintenance.desc_placeholder')}
                             className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-blue-500 min-h-[80px]"
                          ></textarea>
                          {!rejectionReason.trim() && <p className="text-[10px] text-red-500 font-bold mt-1">{t('maintenance.rejection_reason_required')}</p>}
                       </div>
                    )}

                    <div className="flex space-x-3 pt-4">
                       <button 
                          onClick={() => setIsAdminChangingStatus(false)}
                          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-gray-200 transition-colors text-sm"
                       >
                          {t('maintenance.back')}
                       </button>
                       <button 
                          onClick={handleStatusUpdate}
                          disabled={targetStatus === MaintenanceStatus.REJECTED && !rejectionReason.trim()}
                          className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-all text-sm ${
                             targetStatus === MaintenanceStatus.REJECTED && !rejectionReason.trim() ? 'bg-gray-300' : 'bg-blue-600 active:bg-blue-700'
                          }`}
                       >
                          {t('maintenance.save_status')}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-gray-900">{t('maintenance.title')}</h2>
        {!isManager && (
          <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <i className="fa-solid fa-plus"></i>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {maintenanceTopics.map(tData => (
          <button key={tData.id} onClick={() => setSelectedTopic(tData)} className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{tData.category}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                 tData.status === MaintenanceStatus.RESOLVED ? 'bg-green-100 text-green-600' : 
                 tData.status === MaintenanceStatus.REJECTED ? 'bg-red-100 text-red-600' : 
                 tData.status === MaintenanceStatus.APPROVED ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                 {getStatusLabel(tData.status)}
              </span>
            </div>
            <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">{tData.title}</h4>
            <div className="flex items-center text-[10px] text-gray-400 font-bold space-x-3">
              <span><i className="fa-regular fa-user mr-1"></i> {tData.authorName}</span>
              <span><i className="fa-regular fa-comment mr-1"></i> {tData.comments.length}</span>
              {tData.priority === MaintenancePriority.URGENT && <span className="text-red-500"><i className="fa-solid fa-bolt mr-1"></i> {t('maintenance.urgent_badge')}</span>}
            </div>
          </button>
        ))}
        {maintenanceTopics.length === 0 && <p className="text-center py-10 text-gray-400 italic">{t('maintenance.no_items')}</p>}
      </div>
    </div>
  );
};

export default MaintenanceView;
