
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
    Send, Plus, MessageSquare, Trash2, Bot, 
    User, Menu, X, Sparkles, Settings 
} from 'lucide-react';

// --- Service Worker Registratsiyasi ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// --- Turlari ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
}

const PREDEFINED_RESPONSES = [
    "Salom! Sizga qanday yordam bera olaman?",
    "Ajoyib savol! Buni amalga oshirish juda oson.",
    "Xabaringiz qabul qilindi. Men har doim yordam berishga tayyorman!",
    "Tushunarlik. Keling, bu mavzuni chuqurroq ko'rib chiqamiz.",
    "Fikringiz juda qiziq. Men hozirda ma'lumotlarni tahlil qilyapman...",
    "Yana qanday savollaringiz bor? Men xizmatingizdaman.",
];

const App = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('webhub_final_chats');
        if (saved) {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
            if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
        } else {
            createNewChat();
        }
    }, []);

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('webhub_final_chats', JSON.stringify(sessions));
        }
    }, [sessions]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [sessions, currentSessionId, isTyping]);

    const createNewChat = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'Yangi suhbat',
            messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setIsSidebarOpen(false);
    };

    const getAIResponse = async (text: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: text,
                config: {
                    systemInstruction: "Siz aqlli va foydali yordamchisiz. O'zbek tilida, do'stona va professional suhbat quring. O'z ismingizni har bir gapda takrorlamang. Savollarga aniq va qisqa javob bering.",
                }
            });
            return response.text;
        } catch (e) {
            console.error("AI Error:", e);
            return PREDEFINED_RESPONSES[Math.floor(Math.random() * PREDEFINED_RESPONSES.length)];
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isTyping || !currentSessionId) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: Date.now()
        };

        setSessions(prev => prev.map(s => 
            s.id === currentSessionId ? { 
                ...s, 
                title: s.messages.length === 0 ? inputText.slice(0, 25) : s.title,
                messages: [...s.messages, userMsg] 
            } : s
        ));

        setInputText('');
        setIsTyping(true);

        const responseText = await getAIResponse(inputText);
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: responseText || "Kechirasiz, xatolik yuz berdi.",
            sender: 'ai',
            timestamp: Date.now()
        };

        setSessions(prev => prev.map(s => 
            s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s
        ));
        setIsTyping(false);
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden">
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full p-5">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Sparkles className="text-white w-6 h-6" />
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">WebHubAI</h1>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    <button onClick={createNewChat} className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-semibold mb-6 shadow-md">
                        <Plus size={18} />
                        Yangi suhbat
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Tarix</p>
                        {sessions.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => { setCurrentSessionId(s.id); setIsSidebarOpen(false); }}
                                className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare size={16} />
                                    <span className="truncate text-sm font-medium">{s.title}</span>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const filtered = sessions.filter(x => x.id !== s.id);
                                        setSessions(filtered);
                                        if (currentSessionId === s.id) setCurrentSessionId(filtered[0]?.id || null);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-5 border-t border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <User size={20} className="text-slate-500" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate">Foydalanuvchi</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Pro Plan</p>
                        </div>
                        <Settings size={16} className="text-slate-300 hover:text-slate-600 cursor-pointer" />
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative bg-white">
                <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 border border-slate-200 rounded-xl">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">{currentSession?.title || 'Bosh sahifa'}</h2>
                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                AKTIV TIZIM
                            </span>
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 custom-scrollbar">
                    {currentSession?.messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3">
                                <Bot size={40} />
                            </div>
                            <h2 className="text-2xl font-extrabold mb-3">Salom! Men sizning yordamchingizman</h2>
                            <p className="text-slate-500 text-sm">Menga xohlagan savolingizni bering.</p>
                        </div>
                    )}

                    {currentSession?.messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`flex gap-4 max-w-[85%] md:max-w-[70%] ${msg.sender === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                                <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${msg.sender === 'user' ? 'bg-white border border-slate-200 text-blue-600' : 'bg-slate-900 text-white'}`}>
                                    {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
                                </div>
                                <div className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}>
                                    <div className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed ${
                                        msg.sender === 'user' 
                                            ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm' 
                                            : 'bg-blue-600 text-white rounded-tr-none shadow-md'
                                    }`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-tighter">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-end">
                            <div className="flex gap-4 flex-row-reverse">
                                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                                    <Bot size={20} />
                                </div>
                                <div className="px-6 py-4 bg-slate-100 rounded-3xl rounded-tr-none flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 lg:p-10 pt-0">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Xabar yozing..."
                            className="w-full py-4 pl-7 pr-14 bg-slate-50 border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                        />
                        <button 
                            type="submit"
                            disabled={!inputText.trim() || isTyping}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg active:scale-95"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">&copy; 2025 WebHub AI</p>
                </div>
            </main>
        </div>
    );
};

createRoot(document.getElementById('root')!).render(<App />);
