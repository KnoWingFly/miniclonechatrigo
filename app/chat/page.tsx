'use client';

import {useState} from 'react';
import {
    Send, Menu, Search,
    Check, CheckCheck, MoreVertical,
    Phone, Video, Smile
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// TS interface
interface Contact{
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isDelivered: boolean;
}

// DUMMY DATA
const dummyContacts: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    avatar: '',
    lastMessage: 'Harga paket Starlingling berapa yah ?',
    timestamp: '12:03',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Meteor',
    avatar: '',
    lastMessage: 'Saya mau beli UFO-nya 1',
    timestamp: '22:03',
  },
  {
    id: '3',
    name: 'John Wick',
    avatar: '',
    lastMessage: 'I need a new pencil',
    timestamp: 'Yesterday',
  },
  {
    id: '4',
    name: 'Endministrator',
    avatar: '',
    lastMessage: 'Factory... Must... Grow... Up',
    timestamp: 'Yesterday',
  },
];

const dummyMessages: Message[] = [
  {
    id: '1',
    senderId: '1',
    senderName: 'John Doe',
    content: 'Pagi, saya mau bertanya',
    timestamp: '10:45',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '1',
    senderId: 'me',
    senderName: 'You',
    content: 'Siang, ada yang bisa saya bantu',
    timestamp: '12:00',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '1',
    senderId: '1',
    senderName: 'John Doe',
    content: 'Harga paket Starlingling berapa yah ?',
    timestamp: '12:03',
    isRead: false,
    isDelivered: true,
  },
  {
    id: '2',
    senderId: '2',
    senderName: 'Meteor',
    content: 'Saya mau beli ufonya 1',
    timestamp: '22:03',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '3',
    senderId: '3',
    senderName: 'John Wick',
    content: 'I need a new pencil',
    timestamp: 'Yesterday',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '3',
    senderId: 'me',
    senderName: 'You',
    content: 'Which one ?',
    timestamp: '03.10',
    isRead: false,
    isDelivered: false,
  },
  {
    id: '4',
    senderId: '4',
    senderName: 'Endministrator',
    content: 'Factory... Must... Grow... Up',
    timestamp: 'Yesterday',
    isRead: true,
    isDelivered: true,
  },
];


export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <h1>Chat Page</h1>
    </div>
  );
}