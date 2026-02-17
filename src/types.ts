export enum UserRole {
  RESIDENT = 'RESIDENT',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export enum NotificationType {
  INFO = 'info',
  MEETING = 'meeting',
  MAINTENANCE = 'maintenance',
  VOTE = 'vote',
  EMERGENCY = 'emergency',
  NEW_REQUEST = 'new_request'
}

export enum MaintenancePriority {
  NORMAL = 'normal',
  URGENT = 'urgent'
}

export enum MaintenanceStatus {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export enum VoteType {
  YES_NO = 'YES_NO',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  aptNumber: number;
  role: UserRole;
  createdAt: string;
  phoneNumber: string;
  status: UserStatus;
}

export type UserStatus = 'active' | 'pending';

export type EmergencyStatus = 'active' | 'in_progress' | 'resolved';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  date: string;
  isEmergency: boolean;
  emergencyStatus?: EmergencyStatus;
  resolvedAt?: string;
  targetRoles?: UserRole[];
  relatedId?: string;
  createdBy?: string;
}

export interface AgendaItem {
  id: string;
  text: string;
  order: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  agenda: AgendaItem[];
}

export interface MaintenanceComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  date: string;
}

export interface MaintenanceTopic {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  rejectionReason?: string;
  authorId: string;
  authorName: string;
  aptNumber: number;
  date: string;
  comments: MaintenanceComment[];
  images?: string[];
  statusChangedAt?: string;
}

export interface VoteOption {
  id: string;
  text: string;
}

export interface Vote {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  startDate: string;
  endDate: string;
  type: VoteType;
  createdBy?: string;
  createdAt?: string;
}

export interface Ballot {
  id: string;
  voteId: string;
  aptNumber: number;
  optionIds: string[];
  selectedYes?: boolean;
  selectedOptionId?: string;
  submittedAt?: string;
  userId?: string;
}

export interface ChatTopic {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  topicId: string;
  senderId: string;
  senderName: string;
  senderApt?: number;
  text: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'maintenance' | 'announcement' | 'meeting' | 'vote' | 'chat';
  message: string;
  createdAt: string;
  userId?: string;
}