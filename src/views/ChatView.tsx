
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import type { ChatTopic, ChatMessage } from '../types';

const ChatView: React.FC = () => {
  const { chatTopics, chatMessages, addChatTopic, addChatMessage, loadChatMessages, currentUser } = useStore();
  const { t } = useTranslation();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedTopic = chatTopics.find(t => t.id === selectedTopicId);
  const topicMessages = chatMessages.filter(m => m.topicId === selectedTopicId);

  // Load messages when a topic is selected
  useEffect(() => {
    if (selectedTopicId) {
      loadChatMessages(selectedTopicId);
    }
  }, [selectedTopicId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [topicMessages]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const topic: ChatTopic = {
      id: '',
      title: newTopicTitle,
      description: newTopicDesc,
      authorId: currentUser!.id,
      authorName: currentUser!.fullName,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };
    const newId = await addChatTopic(topic);
    setIsCreatingTopic(false);
    setNewTopicTitle('');
    setNewTopicDesc('');
    if (newId) {
      setSelectedTopicId(newId);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTopicId) return;

    const message: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      topicId: selectedTopicId,
      senderId: currentUser!.id,
      senderName: currentUser!.fullName,
      senderApt: currentUser?.aptNumber,
      text: newMessage,
      createdAt: new Date().toISOString()
    };
    addChatMessage(message);
    setNewMessage('');
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  if (selectedTopicId && selectedTopic) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] -mt-4 -mx-4">
        <div className="bg-white border-b p-4 flex items-center shadow-sm">
          <button onClick={() => setSelectedTopicId(null)} className="mr-3 text-blue-600 active:scale-90">
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{selectedTopic.title}</h3>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{selectedTopic.authorName}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {selectedTopic.description && (
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl text-xs text-blue-700 italic text-center mb-6">
              {selectedTopic.description}
            </div>
          )}
          
          {topicMessages.map(m => {
            const isOwn = m.senderId === currentUser?.id;
            return (
              <div key={m.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-[10px] font-bold text-gray-400 mb-1 ml-2">
                    {m.senderName} {m.senderApt ? `(Dz. ${m.senderApt})` : ''}
                  </span>
                )}
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                  isOwn ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {m.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1">{formatDate(m.createdAt)}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="bg-white border-t p-3 safe-bottom flex items-center space-x-2">
          <input 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-gray-900">{t('chat.title')}</h2>
        <button onClick={() => setIsCreatingTopic(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-transform">
          <i className="fa-solid fa-plus mr-1"></i> {t('chat.new_topic')}
        </button>
      </div>

      <div className="space-y-3">
        {chatTopics.map(topic => {
          const count = chatMessages.filter(m => m.topicId === topic.id).length;
          return (
            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)} className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 active:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-comments text-xl"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{topic.title}</h4>
                <p className="text-xs text-gray-400 truncate">{topic.description || topic.authorName}</p>
                <p className="text-[10px] text-gray-300 font-bold mt-1 uppercase">{formatDate(topic.lastMessageAt)}</p>
              </div>
              <div className="bg-gray-50 px-2 py-1 rounded-lg">
                <span className="text-xs font-bold text-gray-400">{count}</span>
              </div>
            </button>
          );
        })}
        {chatTopics.length === 0 && (
          <div className="text-center py-20 text-gray-300">
            <i className="fa-solid fa-comments text-4xl mb-4 opacity-20"></i>
            <p className="italic text-sm">{t('chat.no_topics')}</p>
          </div>
        )}
      </div>

      {isCreatingTopic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCreatingTopic(false)}></div>
          <form onSubmit={handleCreateTopic} className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in duration-200">
            <h3 className="font-bold text-lg">{t('chat.new_topic')}</h3>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">{t('chat.topic_title')}</label>
              <input 
                autoFocus
                required 
                value={newTopicTitle}
                onChange={e => setNewTopicTitle(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-blue-500" 
                placeholder="Piem., Sētas vārti"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">{t('chat.topic_desc')}</label>
              <textarea 
                value={newTopicDesc}
                onChange={e => setNewTopicDesc(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-blue-500" 
                rows={3}
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => setIsCreatingTopic(false)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl bg-gray-100 text-sm">{t('common.cancel')}</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg">Izveidot</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatView;
