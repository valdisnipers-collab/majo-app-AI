import { supabase } from './supabase';
import type { ChatTopic, ChatMessage } from '../types';

export async function fetchChatTopics(): Promise<ChatTopic[]> {
  const { data, error } = await supabase
    .from('chat_topics')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  }));
}

export async function addChatTopic(topic: ChatTopic): Promise<string | null> {
  const { data, error } = await supabase.from('chat_topics').insert([{
    title: topic.title,
    description: topic.description || '',
    author_id: topic.authorId,
    author_name: topic.authorName,
  }]).select();
  if (error || !data || data.length === 0) return null;
  return data[0].id;
}

export async function fetchChatMessages(topicId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    topicId: row.topic_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderApt: row.sender_apt,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function addChatMessage(message: ChatMessage): Promise<boolean> {
  const { error } = await supabase.from('chat_messages').insert([{
    topic_id: message.topicId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    sender_apt: message.senderApt ?? null,
    text: message.text,
  }]);
  if (error) return false;

  // Update last_message_at on the parent topic
  await supabase
    .from('chat_topics')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', message.topicId);

  return true;
}
