"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatPage() {
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showBotModal, setShowBotModal] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "info" });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableBots = [
    {
      id: "support",
      name: "Customer Support Bot",
      description: "Help with product questions and issues",
      avatar: "💬",
    },
    {
      id: "chatrigo",
      name: "ChatRigo Bot",
      description: "Chatrigo assistant bot",
      avatar: "🤖",
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info",
  ) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const handleCreateBot = async (bot: (typeof availableBots)[0]) => {
    try {
      const existingBot = chatSessions.find(
        (session) => session.contactName === bot.name && session.isAI === true,
      );

      if (existingBot) {
        showNotification(`${bot.name} is already in your contacts!`, "info");
        setActiveContactId(existingBot.id);
        setShowBotModal(false);
        return;
      }

      setCreatingBot(true);

      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: bot.name,
          isAI: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create session: ${res.status}`);
      }

      const data = await res.json();

      if (data.session) {
        await fetchChatSessions();
        await new Promise((resolve) => setTimeout(resolve, 300));
        setActiveContactId(data.session.id);
        setShowBotModal(false);
        showNotification(`${bot.name} added successfully!`, "success");
      }
    } catch (error) {
      console.error("Error creating bot:", error);
      showNotification("Failed to add bot. Please try again.", "error");
    } finally {
      setCreatingBot(false);
    }
  };

  const activeContact = chatSessions.find(
    (session) => session.id === activeContactId,
  );

  const getLastMessage = (sessionId: string): string => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (!session || !session.messages || session.messages.length === 0)
      return "No messages yet";
    return session.messages[0].content;
  };

  useEffect(() => {
    if (activeContactId) fetchMessages(activeContactId);
  }, [activeContactId]);

  useEffect(() => {
    fetchChatSessions();
  }, []);

  const fetchChatSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chat/sessions");

      if (!res.ok) {
        console.error("Failed to fetch sessions:", res.status);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON");
        return;
      }

      const data = await res.json();
      if (data.sessions) {
        setChatSessions(data.sessions);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      showNotification("Failed to load chats", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      setCurrentMessages([]);

      const res = await fetch(`/api/chat/messages?chatSessionId=${sessionId}`);

      if (res.status === 404) {
        setCurrentMessages([]);
        return;
      }

      if (!res.ok) {
        console.error("Failed to fetch messages:", res.status);
        setCurrentMessages([]);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON");
        setCurrentMessages([]);
        return;
      }

      const data = await res.json();
      if (data.messages) {
        setCurrentMessages(data.messages);
      } else {
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setCurrentMessages([]);
    } finally {
      setLoadingMessages(false); // End loading
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeContactId) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      chatSessionId: activeContactId,
      senderId: "user",
      senderName: "You",
      content: inputMessage,
      isDelivered: false,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update - show message immediately
    setCurrentMessages([...currentMessages, tempMessage]);
    const messageToSend = inputMessage;
    setInputMessage(""); // Clear input immediately

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: activeContactId,
          senderId: "user",
          senderName: "You",
          content: messageToSend,
        }),
      });

      if (!res.ok) {
        // Rollback on error
        setCurrentMessages(currentMessages);
        setInputMessage(messageToSend);
        showNotification("Failed to send message", "error");
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setCurrentMessages(currentMessages);
        setInputMessage(messageToSend);
        showNotification("Invalid server response", "error");
        return;
      }

      const data = await res.json();
      if (data.message) {
        // Replace temp message with real one
        setCurrentMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? data.message : msg)),
        );

        // Update session timestamp without refetching
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === activeContactId
              ? {
                  ...session,
                  updatedAt: new Date(),
                  messages: [data.message],
                }
              : session,
          ),
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setCurrentMessages(currentMessages);
      setInputMessage(messageToSend);
      showNotification("Failed to send message", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 pt-[57px]">
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-20 right-4 z-[70] animate-in slide-in-from-top-2">
          <div
            className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
            ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : notification.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-blue-500 text-white"
            }
          `}
          >
            <AlertCircle size={20} />
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

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
              className="absolute left-7 top-1/2 transform -translate-y-1/2 text-gray-400"
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

        {/* New AI Chat Button */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowBotModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New AI Chat
          </button>
        </div>

        {/*Contact List */}
        <div className="overflow-y-auto h-[calc(100vh-305px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <svg
                  className="w-8 h-8 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-sm">No chats yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Start a new AI chat to begin
              </p>
            </div>
          ) : (
            chatSessions.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  setActiveContactId(contact.id);
                  setIsSidebarOpen(false);
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
            ))
          )}
        </div>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Bot Modal */}
      {showBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Start New AI Chat
              </h2>
              <button
                onClick={() => setShowBotModal(false)}
                disabled={creatingBot}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-4">
                {availableBots.map((bot) => {
                  const isExisting = chatSessions.some(
                    (session) =>
                      session.contactName === bot.name && session.isAI === true,
                  );
                  return (
                    <button
                      key={bot.id}
                      onClick={() => handleCreateBot(bot)}
                      disabled={creatingBot}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed relative"
                    >
                      {isExisting && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Added
                        </span>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl flex-shrink-0">
                          {creatingBot ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          ) : (
                            bot.avatar
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {bot.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {bot.description}
                          </p>
                        </div>
                        <div className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      {!activeContactId ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Select a chat to start messaging
            </h2>
            <p className="text-gray-600 mb-6">
              Choose a conversation from the sidebar or start a new AI chat to
              begin
            </p>
            <button
              onClick={() => setShowBotModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
            >
              Start New AI Chat
            </button>
          </div>
        </div>
      ) : (
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
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-8 h-8 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    No messages yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Start the conversation by sending a message
                  </p>
                </div>
              </div>
            ) : (
              <>
                {currentMessages.map((message) => {
                  const isMe = message.senderId === "user";
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
                              {new Date(message.createdAt).toLocaleTimeString(
                                "id-ID",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            {isMe && (
                              <span className="text-gray-500">
                                {message.isRead ? (
                                  <CheckCheck
                                    size={14}
                                    className="text-blue-500"
                                  />
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
                <div ref={messagesEndRef} />
              </>
            )}
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
      )}
    </div>
  );
}
