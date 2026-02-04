"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  isAI?: boolean;
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

export default function ChatPage() {
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");

  // Derive activeContact from sessions
  const activeContact = chatSessions.find(
    (session) => session.id === activeContactId,
  );

  // Get last message helper
  const getLastMessage = (sessionId: string): string => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (!session || !session.messages || session.messages.length === 0)
      return "No messages yet";
    return session.messages[0].content;
  };

  // Fetch messages when active contact changes
  useEffect(() => {
    if (activeContactId) fetchMessages(activeContactId);
  }, [activeContactId]);

  // Fetching on mount
  useEffect(() => {
    fetchChatSessions();
  }, []);
  const fetchChatSessions = async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      const data = await res.json();
      if (data.sessions) {
        setChatSessions(data.sessions);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch (session changes)
  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?chatSessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        setCurrentMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Send message function
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeContactId) return;
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: activeContactId,
          senderId: "user",
          senderName: "You",
          content: inputMessage,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setCurrentMessages([...currentMessages, data.message]);
        setInputMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 pt-[57px]">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo/white_logo_with_white_text.png"
              alt="Chatrigo Logo"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-orange-600 rounded-lg transition-colors relative">
              <Bell size={20} className="text-white" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-md"></span>
            </button>
            <Link
              href="/"
              className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
            >
              <User size={20} className="text-white" />
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
        <div className="bg-orange-500">
          <div className="flex items-center justify-between mb-4 px-4 pt-4">
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
          <div className="relative px-4 pb-4">
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
          {chatSessions.map((contact) => (
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
                <AvatarImage
                  src={contact.contactAvatar}
                  alt={contact.contactName}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                  {contact.contactName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {contact.contactName}
                    </h3>
                    {contact.isAI && (
                      <span className="px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-semibold rounded-full flex-shrink-0">
                        AI
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {new Date(contact.updatedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">
                    {getLastMessage(contact.id)}
                  </p>
                  {contact.messages?.[0]?.isRead === false && (
                    <span className="ml-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      1
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
                  src={activeContact?.contactAvatar}
                  alt={activeContact?.contactName}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                  {activeContact?.contactName
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">
                    {activeContact?.contactName}
                  </h2>
                  {activeContact?.isAI && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-semibold rounded-full">
                      AI
                    </span>
                  )}
                </div>
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
                          .map((n: string) => n[0])
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
          <div className="flex items-center gap-2">
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
                style={{ height: "48px", maxHeight: "120px" }}
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
