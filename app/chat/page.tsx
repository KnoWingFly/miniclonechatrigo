"use client";

import { useState } from "react";
import {
  Send,
  Menu,
  Search,
  Check,
  CheckCheck,
  MoreVertical,
  Phone,
  Video,
  Smile,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// TS interface
interface Contact {
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
    id: "1",
    name: "John Doe",
    avatar: "",
    lastMessage: "Harga paket Starlingling berapa yah ?",
    timestamp: "12:03",
    unreadCount: 1,
  },
  {
    id: "2",
    name: "Meteor",
    avatar: "",
    lastMessage: "Saya mau beli UFO-nya 1",
    timestamp: "22:03",
  },
  {
    id: "3",
    name: "John Wick",
    avatar: "",
    lastMessage: "I need a new pencil",
    timestamp: "Yesterday",
  },
  {
    id: "4",
    name: "Endministrator",
    avatar: "",
    lastMessage: "Factory... Must... Grow... Up",
    timestamp: "Yesterday",
  },
];

const dummyMessages: Message[] = [
  {
    id: "1",
    senderId: "1",
    senderName: "John Doe",
    content: "Pagi, saya mau bertanya",
    timestamp: "10:45",
    isRead: true,
    isDelivered: true,
  },
  {
    id: "1",
    senderId: "me",
    senderName: "You",
    content: "Siang, ada yang bisa saya bantu",
    timestamp: "12:00",
    isRead: true,
    isDelivered: true,
  },
  {
    id: "1",
    senderId: "1",
    senderName: "John Doe",
    content: "Harga paket Starlingling berapa yah ?",
    timestamp: "12:03",
    isRead: false,
    isDelivered: true,
  },
  {
    id: "2",
    senderId: "2",
    senderName: "Meteor",
    content: "Saya mau beli ufonya 1",
    timestamp: "22:03",
    isRead: true,
    isDelivered: true,
  },
  {
    id: "3",
    senderId: "3",
    senderName: "John Wick",
    content: "I need a new pencil",
    timestamp: "Yesterday",
    isRead: true,
    isDelivered: true,
  },
  {
    id: "3",
    senderId: "me",
    senderName: "You",
    content: "Which one ?",
    timestamp: "03.10",
    isRead: false,
    isDelivered: false,
  },
  {
    id: "4",
    senderId: "4",
    senderName: "Endministrator",
    content: "Factory... Must... Grow... Up",
    timestamp: "Yesterday",
    isRead: true,
    isDelivered: true,
  },
];

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState("1");
  const [messages, setMessages] = useState<Message[]>(dummyMessages);
  const [inputMessage, setInputMessage] = useState("");
  const activeContact = dummyContacts.find((c) => c.id === activeContactId);
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-80 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold text-xl">C</span>
              </div>
              <span className="text-white font-semibold text-lg">Chatrigo</span>
            </div>
            <button className="lg:hidden text-white p-2 hover:bg-orange-600 rounded-lg transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search contact or messages"
              className="w-full pl-10 pr-4 py-2.5 bg-white/90 backdrop-blur-sm border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent placeholder-gray-500"
            />
          </div>
        </div>
        {/*Contact List */}
        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          {dummyContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => {
                setActiveContactId(contact.id);
                setIsSidebarOpen(false); // Close sidebar on mobile (Hamburger Icon)
              }}
              className={`
        w-full p-4 flex items-start gap-3 border-b border-gray-100
        hover:bg-gray-50 transition-colors text-left
        ${activeContactId === contact.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""}
      `}
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                  {contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {contact.name}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {contact.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">
                    {contact.lastMessage}
                  </p>
                  {contact.unreadCount && (
                    <span className="ml-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          <p className="p-4">Contact list will go here</p>
        </div>
      </div>
      {/* TO-DO: Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        <p>Area Chat</p>
      </div>
    </div>
  );
}
