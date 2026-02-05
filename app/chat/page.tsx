"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  ChevronDown,
  Plus,
  MessageSquareOff,
  Bot,
  ChevronRight,
  MessageSquarePlus,
  Trash2,
  Edit,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Chat State
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showBotModal, setShowBotModal] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: "clear" | "delete" | "edit-prompt" | null;
  }>({ isOpen: false, type: null });

  const [newSystemPrompt, setNewSystemPrompt] = useState("");

  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "info" });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [availableBots, setAvailableBots] = useState<any[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          router.push("/auth/signin");
        } else {
          setUser(user);
          fetchChatSessions();
          fetchBots();
          setIsAuthChecking(false);
        }
      } catch (error) {
        console.error("Auth check failed", error);
        router.push("/auth/signin");
      }
    };
    checkUser();
  }, [supabase, router]);

  const fetchBots = async () => {
    try {
      setLoadingBots(true);
      const res = await fetch("/api/bots");
      if (res.ok) {
        const data = await res.json();
        setAvailableBots(data.bots || []);
      }
    } catch (error) {
      console.error("Failed to fetch bots", error);
    } finally {
      setLoadingBots(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Modal Action
  const handleConfirmAction = async () => {
    setIsProcessing(true);
    if (modalConfig.type === "clear") {
      await handleClearChat();
    } else if (modalConfig.type === "delete") {
      await handleDeleteSession();
    } else if (modalConfig.type === "edit-prompt") {
      if (activeContact?.botId) {
        try {
          await fetch(`/api/bots/${activeContact.botId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ systemPrompt: newSystemPrompt }),
          });
          showNotification("System prompt updated!", "success");
        } catch (e) {
          showNotification("Failed to update prompt", "error");
        }
      }
    }
    setIsProcessing(false);
    setModalConfig({ isOpen: false, type: null });
  };

  // Clear Chat Function
  const handleClearChat = async () => {
    if (!activeContactId) return;
    try {
      const res = await fetch(
        `/api/chat/messages?chatSessionId=${activeContactId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setCurrentMessages([]);
        setShowMenu(false);
        showNotification("Chat cleared successfully", "success");
        fetchChatSessions();
      }
    } catch (error) {
      showNotification("Failed to clear chat", "error");
    }
  };

  // Delete Session Function
  const handleDeleteSession = async () => {
    if (!activeContactId) return;
    const idToDelete = activeContactId;

    try {
      const res = await fetch(`/api/chat/sessions?id=${idToDelete}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeletingId(idToDelete);
        await new Promise((resolve) => setTimeout(resolve, 300));

        setActiveContactId(null);
        setChatSessions((prev) => prev.filter((s) => s.id !== idToDelete));
        setDeletingId(null);

        showNotification("Conversation deleted", "success");
      }
    } catch (error) {
      showNotification("Failed to delete session", "error");
    }
  };

  // Scroll to bottom
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
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
          botId: bot.id,
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

  const markAsRead = async (sessionId: string) => {
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId && session.messages?.length > 0) {
          const updatedMessages = [...session.messages];
          updatedMessages[0] = { ...updatedMessages[0], isRead: true };
          return { ...session, messages: updatedMessages };
        }
        return session;
      }),
    );
    try {
      await fetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatSessionId: sessionId }),
      });
    } catch (error) {
      console.error("Failed to mark as read on server", error);
    }
  };

  useEffect(() => {
    if (activeContactId) {
      fetchMessages(activeContactId);
      markAsRead(activeContactId);
    }
  }, [activeContactId]);

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
      setLoadingMessages(false);
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

    setCurrentMessages((prev) => [...prev, tempMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");

    // Update session list order immediately (move to top)
    setChatSessions((prev) => {
      const existing = prev.find((s) => s.id === activeContactId);
      if (!existing) return prev;
      const others = prev.filter((s) => s.id !== activeContactId);
      return [
        {
          ...existing,
          updatedAt: new Date().toISOString(),
          messages: [
            { content: messageToSend, createdAt: new Date().toISOString() },
          ], // optimistic last message
        },
        ...others,
      ];
    });

    const isAISession = activeContact?.isAI;

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

      const data = await res.json();

      let actualMessageId = tempMessage.id;

      if (data.message) {
        actualMessageId = data.message.id;
        // Update temp message with real one (shows 2 ticks)
        setCurrentMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id
              ? { ...data.message, isDelivered: true }
              : msg,
          ),
        );
      }

      if (isAISession) {
        setIsAITyping(true);
        setTimeout(async () => {
          try {
            const aiRes = await fetch("/api/chat/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatSessionId: activeContactId }),
            });

            const aiData = await aiRes.json();

            if (aiData.aiMessage) {
              setCurrentMessages((prev) =>
                prev
                  .map((msg) =>
                    msg.id === actualMessageId ? { ...msg, isRead: true } : msg,
                  )
                  .concat(aiData.aiMessage),
              );
              // Update session preview again with AI response
              setChatSessions((prev) => {
                const existing = prev.find((s) => s.id === activeContactId);
                if (!existing) return prev;
                const others = prev.filter((s) => s.id !== activeContactId);
                return [
                  {
                    ...existing,
                    updatedAt: new Date().toISOString(),
                    messages: [
                      {
                        content: aiData.aiMessage.content,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  },
                  ...others,
                ];
              });
            }
          } catch (err) {
            console.error("AI trigger failed", err);
          } finally {
            setIsAITyping(false);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      showNotification("Failed to send message", "error");
      setIsAITyping(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex h-screen bg-white pt-[60px] overflow-hidden">
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 shadow-md h-[60px]">
        <div className="flex items-center justify-between px-4 h-full">
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
        flex flex-col h-full 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Sidebar Header */}
        <div className="bg-white px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-gray-900 font-bold text-lg">Chats</span>
            </div>
            <button
              className="lg:hidden text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 ..."
            />
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="px-4 py-2 flex-shrink-0">
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              size={16}
            />
            <select className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 hover:border-orange-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer transition-all">
              <option value="all">All Chats</option>
              <option value="unread">Unread</option>
              <option value="ai">AI Only</option>
              <option value="human">Human Only</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        {/* New AI Chat Button */}
        <div className="px-4 pb-3 mt-1 flex-shrink-0">
          <button
            onClick={() => setShowBotModal(true)}
            className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <MessageSquarePlus size={20} />
            New AI Chat
          </button>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquareOff className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">No chats yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Start a new AI chat to begin
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {chatSessions
                .filter((contact) =>
                  contact.contactName
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                )
                .map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setActiveContactId(contact.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                    w-full p-4 flex items-start gap-3 border-l-4 transition-all duration-300 ease-in-out
                    ${
                      activeContactId === contact.id
                        ? "bg-orange-50 border-l-orange-500"
                        : "hover:bg-gray-50 border-l-transparent"
                    }
                    ${
                      deletingId === contact.id
                        ? "opacity-0 scale-95 -translate-x-full max-h-0 p-0 overflow-hidden"
                        : "opacity-100 max-h-24"
                    }
                  `}
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0 border border-gray-100">
                      <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold text-sm">
                        {getInitials(contact.contactName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3
                            className={`font-medium text-sm truncate ${activeContactId === contact.id ? "text-orange-900" : "text-gray-900"}`}
                          >
                            {contact.contactName}
                          </h3>
                          {contact.isAI && (
                            <span className="px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-semibold rounded-full flex-shrink-0">
                              AI
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {new Date(contact.updatedAt).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      {/* Unread Message Counter */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate flex-1">
                          {getLastMessage(contact.id)}
                        </p>
                        {contact._count?.messages > 0 &&
                          contact.id !== activeContactId && (
                            <span className="ml-2 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {contact._count.messages > 99
                                ? "99+"
                                : contact._count.messages}
                            </span>
                          )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Bot Modal */}
      {showBotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                New Conversation
              </h2>
              <button
                onClick={() => setShowBotModal(false)}
                disabled={creatingBot}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {loadingBots ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                  </div>
                ) : availableBots.length === 0 ? (
                  <p className="text-gray-500 text-center">No bots available</p>
                ) : (
                  availableBots.map((bot) => {
                    const isExisting = chatSessions.some(
                      (session) =>
                        session.contactName === bot.name &&
                        session.isAI === true,
                    );
                    return (
                      <button
                        key={bot.id}
                        onClick={() => handleCreateBot(bot)}
                        disabled={creatingBot}
                        className="group p-4 border border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/50 transition-all text-left disabled:opacity-50 flex items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                          {creatingBot ? (
                            <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                          ) : (
                            <span className="text-orange-600 font-bold text-lg">
                              {getInitials(bot.name)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="font-semibold text-gray-900">
                            {bot.name}
                          </h3>
                          <p className="text-gray-500 text-sm truncate">
                            {bot.description}
                          </p>
                        </div>

                        {isExisting && (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
                            <Check size={12} /> Added
                          </span>
                        )}

                        <ChevronRight
                          className="text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0"
                          size={20}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      {!activeContactId ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50/50 relative">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <Menu size={24} />
          </button>

          <div className="text-center max-w-sm px-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-orange-500">
              <Bot size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Select a conversation
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Choose a contact from the sidebar or start a new AI chat to begin
              messaging
            </p>
            <button
              onClick={() => setShowBotModal(true)}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Start New Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Chat Header */}
          <div className="h-[73px] px-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-gray-600" />
              </button>
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold text-sm">
                  {getInitials(activeContact?.contactName || "")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">
                    {activeContact?.contactName}
                  </h2>
                  {activeContact?.isAI && (
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-semibold rounded-full">
                      AI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${activeContact?.isOnline || activeContact?.isAI ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  {isAITyping ? (
                    <p className="text-xs text-orange-500 font-medium animate-pulse">
                      Typing...
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {activeContact?.isAI
                        ? "Online"
                        : activeContact?.isOnline
                          ? "Online"
                          : "Offline"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown Menu Container */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2 rounded-full transition-all ${
                  showMenu
                    ? "bg-orange-50 text-orange-500 shadow-sm"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <MoreVertical size={20} />
              </button>

              {/* The Dropdown Bubble */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-2 mb-1 border-b border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Chat Options
                    </p>
                  </div>

                  {/* Clear Chat Button*/}
                  <button
                    disabled={currentMessages.length === 0}
                    onClick={() => {
                      setShowMenu(false);
                      setModalConfig({ isOpen: true, type: "clear" });
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 group transition-colors ${
                      currentMessages.length === 0
                        ? "opacity-40 cursor-not-allowed bg-gray-50"
                        : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        currentMessages.length === 0
                          ? "bg-gray-200"
                          : "bg-gray-50 group-hover:bg-orange-100"
                      }`}
                    >
                      <MessageSquareOff
                        size={16}
                        className={
                          currentMessages.length === 0
                            ? "text-gray-400"
                            : "text-gray-500 group-hover:text-orange-600"
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">Clear Chat</span>
                      {currentMessages.length === 0 && (
                        <span className="text-[10px] text-gray-400">
                          No messages to clear
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setModalConfig({ isOpen: true, type: "delete" });
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                      <Trash2 size={16} className="text-red-500" />
                    </div>
                    <span className="font-medium">Delete Session</span>
                  </button>
                  {activeContact?.isAI && (
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        setModalConfig({ isOpen: true, type: "edit-prompt" });
                        setNewSystemPrompt("Loading...");
                        if (activeContact?.botId) {
                          try {
                            const res = await fetch(
                              `/api/bots/${activeContact.botId}`,
                            );
                            if (res.ok) {
                              const data = await res.json();
                              setNewSystemPrompt(data.bot.systemPrompt || "");
                            } else {
                              setNewSystemPrompt("");
                            }
                          } catch (e) {
                            console.error(e);
                            setNewSystemPrompt("");
                          }
                        }
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-orange-100">
                        <Edit
                          size={16}
                          className="text-gray-500 group-hover:text-orange-600"
                        />
                      </div>
                      <span className="font-medium">Edit System Prompt</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-white scroll-smooth min-h-0">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <MessageSquareOff size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  No messages yet
                </h3>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  Send a message to start the conversation.
                </p>
              </div>
            ) : (
              <>
                {currentMessages.map((message) => {
                  const isMe = message.senderId === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                    >
                      <div
                        className={`flex gap-3 max-w-[85%] lg:max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {!isMe && (
                          <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-orange-100 text-orange-600 text-[10px] font-bold">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          {!isMe && (
                            <p className="text-[11px] font-medium text-gray-500 mb-1 ml-1">
                              {message.senderName}
                            </p>
                          )}
                          <div
                            className={`
                            rounded-2xl px-5 py-3 shadow-sm text-[15px] leading-relaxed relative group-hover:shadow-md transition-shadow
                            ${
                              isMe
                                ? "bg-orange-500 text-white rounded-tr-sm"
                                : "bg-gray-100 text-gray-800 rounded-tl-sm"
                            }
                          `}
                          >
                            <p>{message.content}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <span className="text-[10px] text-gray-400 font-medium">
                              {new Date(message.createdAt).toLocaleTimeString(
                                "id-ID",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            {isMe && (
                              <span className="text-gray-400">
                                {message.isRead ? (
                                  <CheckCheck
                                    size={14}
                                    className="text-blue-500"
                                  />
                                ) : message.isDelivered ? (
                                  <CheckCheck
                                    size={14}
                                    className="text-gray-400"
                                  />
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
                {isAITyping && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
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
      {/* Confirmation Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() =>
              !isProcessing && setModalConfig({ isOpen: false, type: null })
            }
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  modalConfig.type === "delete"
                    ? "bg-red-50 text-red-500"
                    : "bg-orange-50 text-orange-500"
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : modalConfig.type === "delete" ? (
                  <Trash2 size={28} />
                ) : modalConfig.type === "edit-prompt" ? (
                  <Edit size={28} />
                ) : (
                  <MessageSquareOff size={28} />
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {modalConfig.type === "delete"
                  ? "Delete Conversation?"
                  : modalConfig.type === "edit-prompt"
                    ? "Change Prompt"
                    : "Clear Chat History?"}
              </h3>

              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {isProcessing
                  ? "Processing..."
                  : modalConfig.type === "edit-prompt"
                    ? `Update the behavior for ${activeContact?.contactName}`
                    : modalConfig.type === "delete"
                      ? `This will permanently delete your conversation with ${activeContact?.contactName}.`
                      : "Are you sure you want to delete all messages? History will be gone."}
              </p>

              {modalConfig.type === "edit-prompt" && (
                <div className="w-full mb-6">
                  <textarea
                    value={newSystemPrompt}
                    onChange={(e) => setNewSystemPrompt(e.target.value)}
                    placeholder="Enter new system prompt..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                  />
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  disabled={isProcessing}
                  onClick={() => setModalConfig({ isOpen: false, type: null })}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isProcessing}
                  onClick={handleConfirmAction}
                  className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                    modalConfig.type === "delete"
                      ? "bg-red-500 hover:bg-red-600 shadow-red-100"
                      : "bg-orange-500 hover:bg-orange-600 shadow-orange-100"
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {isProcessing && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
                  {isProcessing ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
