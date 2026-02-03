"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Send,
  Menu,
  Search,
  Check,
  CheckCheck,
  MoreVertical,
  Smile,
  Bell,
  User,
  Filter,
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
  isOnline?: boolean;
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
    isOnline: true,
  },
  {
    id: "2",
    name: "Meteor",
    avatar: "",
    lastMessage: "Saya mau beli UFO-nya 1",
    timestamp: "22:03",
    isOnline: true,
  },
  {
    id: "3",
    name: "John Wick",
    avatar: "",
    lastMessage: "I need a new pencil",
    timestamp: "Yesterday",
    isOnline: false,
  },
  {
    id: "4",
    name: "Endministrator",
    avatar: "",
    lastMessage: "Factory... Must... Grow... Up",
    timestamp: "Yesterday",
    isOnline: false,
  },
];

const messagesByContact: Record<string, Message[]> = {
  "1": [
    {
      id: "msg-1-1",
      senderId: "1",
      senderName: "John Doe",
      content: "Pagi, saya mau bertanya",
      timestamp: "10:45",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-1-2",
      senderId: "me",
      senderName: "You",
      content: "Siang, ada yang bisa saya bantu",
      timestamp: "12:00",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-1-3",
      senderId: "1",
      senderName: "John Doe",
      content: "Harga paket Starlingling berapa yah ?",
      timestamp: "12:03",
      isRead: false,
      isDelivered: true,
    },
  ],
  "2": [
    {
      id: "msg-2-1",
      senderId: "2",
      senderName: "Meteor",
      content: "Halo, saya tertarik dengan produk UFO",
      timestamp: "21:30",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-2-2",
      senderId: "me",
      senderName: "You",
      content: "Baik, ada yang bisa saya jelaskan?",
      timestamp: "21:45",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-2-3",
      senderId: "2",
      senderName: "Meteor",
      content: "Saya mau beli UFO-nya 1",
      timestamp: "22:03",
      isRead: true,
      isDelivered: true,
    },
  ],
  "3": [
    {
      id: "msg-3-1",
      senderId: "3",
      senderName: "John Wick",
      content: "I need a new pencil",
      timestamp: "Yesterday",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-3-2",
      senderId: "me",
      senderName: "You",
      content: "Which one ?",
      timestamp: "03:10",
      isRead: false,
      isDelivered: false,
    },
  ],
  "4": [
    {
      id: "msg-4-1",
      senderId: "4",
      senderName: "Endministrator",
      content: "Factory... Must... Grow... Up",
      timestamp: "Yesterday",
      isRead: true,
      isDelivered: true,
    },
    {
      id: "msg-4-2",
      senderId: "me",
      senderName: "You",
      content: "Get Some Help",
      timestamp: "10:15",
      isRead: true,
      isDelivered: true,
    },
  ],
};

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState("1");
  const [messagesByContactState, setMessagesByContactState] =
    useState<Record<string, Message[]>>(messagesByContact);
  const [inputMessage, setInputMessage] = useState("");
  const activeContact = dummyContacts.find((c) => c.id === activeContactId);
  const currentMessages = messagesByContactState[activeContactId] || [];

  // Helper function to get last message for a contact
  const getLastMessage = (contactId: string): string => {
    const messages = messagesByContactState[contactId] || [];
    if (messages.length === 0) return "No messages yet";
    return messages[messages.length - 1].content;
  };

  // Send message function
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: `msg-${activeContactId}-${Date.now()}`,
      senderId: "me",
      senderName: "You",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
      isDelivered: true,
    };

    setMessagesByContactState({
      ...messagesByContactState,
      [activeContactId]: [
        ...(messagesByContactState[activeContactId] || []),
        newMessage,
      ],
    });

    setInputMessage("");
  };

  return (
    <div className="flex h-screen bg-gray-50 pt-[57px]">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo/orange_logo_with_blue_text.png"
              alt="Chatrigo Logo"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User size={20} className="text-gray-700" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-40 lg:pt-0
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
              <span className="text-white font-semibold text-lg">Chat</span>
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

        {/* Filter Dropdown */}
        <div className="px-4 py-3">
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500"
              size={16}
            />
            <select className="w-full pl-9 pr-4 py-2.5 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent appearance-none cursor-pointer hover:border-orange-300 transition-all">
              <option value="all">All Chats</option>
              <option value="unread">Unread</option>
              <option value="ai">AI Only</option>
              <option value="human">Human Only</option>
              <option value="archived">Archived</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg
                className="w-4 h-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/*Contact List */}
        <div className="overflow-y-auto h-[calc(100vh-305px)]">
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
                    {getLastMessage(contact.id)}
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
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-gray-700" />
              </button>
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={activeContact?.avatar}
                  alt={activeContact?.name}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                  {activeContact?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {activeContact?.name}
                </h2>
                <p
                  className={`text-xs ${activeContact?.isOnline ? "text-green-600" : "text-gray-400"}`}
                >
                  {activeContact?.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {currentMessages.map((message) => {
            const isMe = message.senderId === "me";
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isMe && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs">
                        {message.senderName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    {!isMe && (
                      <p className="text-xs text-gray-600 mb-1 ml-1">
                        {message.senderName}
                      </p>
                    )}
                    <div
                      className={`
                rounded-2xl px-4 py-3 shadow-sm
                ${
                  isMe
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm"
                }
              `}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <span className="text-xs text-gray-500">
                        {message.timestamp}
                      </span>
                      {isMe && (
                        <span className="text-gray-500">
                          {message.isRead ? (
                            <CheckCheck size={14} className="text-blue-500" />
                          ) : message.isDelivered ? (
                            <CheckCheck size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-end gap-2">
            <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <Smile size={24} className="text-gray-600" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Enter Messages"
                rows={1}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className={`
                p-3 rounded-xl transition-all flex-shrink-0
                ${
                  inputMessage.trim()
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
