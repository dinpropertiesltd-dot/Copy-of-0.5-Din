
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User as UserIcon, Loader2, Minus, Maximize2, Mic, MicOff } from 'lucide-react';
import { streamChatResponse } from '../AIService';
import { User, PropertyFile } from '../types';

interface Props {
  currentUser: User;
  userFiles: PropertyFile[];
  allFiles?: PropertyFile[];
}

const AIChatAssistant: React.FC<Props> = ({ currentUser, userFiles, allFiles = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { 
      role: 'model', 
      content: currentUser.role === 'ADMIN' 
        ? `AUTHORIZATION GRANTED. \n\nSupervisor ${currentUser.name}, I am synchronized with the global registry. I have access to ${allFiles.length} master records. How shall we proceed with the portfolio audit today?`
        : `REGISTRY CONNECTION ACTIVE. \n\nGreetings, ${currentUser.name}. I have audited your ${userFiles.length} property file(s). I can explain your ledger, identify due dates, or verify transactions. How can I assist you?` 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        // Silently handle 'no-speech' error to prevent UI flickering or console errors
        if (event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    const contextData = currentUser.role === 'ADMIN' ? allFiles : userFiles;

    try {
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);
      
      const stream = streamChatResponse(userMsg, currentUser.role, contextData);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const rest = prev.slice(0, -1);
          return [...rest, { role: 'model', content: fullResponse }];
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "SYSTEM ERROR: API Connection Timeout. Please verify your environment API key and network status." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const tableStyle = `
    .chat-table-container table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 10px; background: white; border: 1px solid #e2e8f0; }
    .chat-table-container th { background: #f8fafc; color: #64748b; font-weight: 800; text-transform: uppercase; padding: 10px; border: 1px solid #e2e8f0; text-align: left; }
    .chat-table-container td { padding: 10px; border: 1px solid #e2e8f0; color: #1e293b; }
    .chat-table-container tr:nth-child(even) { background: #fdfdfd; }
  `;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-16 h-16 ${currentUser.role === 'ADMIN' ? 'bg-indigo-900' : 'bg-slate-900'} text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[60] group border border-white/10`}
      >
        <div className={`absolute inset-0 ${currentUser.role === 'ADMIN' ? 'bg-indigo-500/20' : 'bg-emerald-500/20'} rounded-full animate-ping group-hover:animate-none`}></div>
        <Sparkles size={24} className="relative z-10" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[60] transition-all duration-500 ease-in-out ${isMinimized ? 'h-16 w-64' : 'h-[650px] w-[700px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'}`}>
      <style>{tableStyle}</style>
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 h-full flex flex-col overflow-hidden">
        <div className={`p-4 ${currentUser.role === 'ADMIN' ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${currentUser.role === 'ADMIN' ? 'bg-indigo-600' : 'bg-emerald-600'} rounded-xl flex items-center justify-center shadow-lg`}><Bot size={20} /></div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">{currentUser.role === 'ADMIN' ? 'Supervisor Node' : 'Registry Assistant'}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'ADMIN' ? 'bg-indigo-400' : 'bg-emerald-500'} animate-pulse`}></div>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-80">Synchronized</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Minimize">{isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}</button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Close"><X size={16} /></button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200' : (currentUser.role === 'ADMIN' ? 'bg-indigo-600' : 'bg-emerald-600') + ' text-white'}`}>
                      {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm chat-table-container ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'}`}>
                      <div className="whitespace-pre-wrap font-mono prose prose-slate max-w-none prose-xs overflow-x-auto">
                        {msg.content || (isTyping && i === messages.length - 1 ? "..." : "")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isListening && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                    <Mic size={10} /> Listening for voice input...
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    placeholder={isListening ? "Listening..." : "Ask the Registry Assistant..."}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all ${isListening ? 'border-emerald-300 ring-4 ring-emerald-500/10' : ''}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isListening ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    title={isListening ? "Stop listening" : "Voice Command"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={(!input.trim() && !isListening) || isTyping}
                  className={`w-12 h-12 ${currentUser.role === 'ADMIN' ? 'bg-indigo-900' : 'bg-slate-900'} text-white rounded-xl flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-90 disabled:opacity-20`}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIChatAssistant;
