
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { askAiAssistant } from '../services/geminiService';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

export const AiAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: "Xin chào! Tôi là trợ lý HR & Vận hành của bạn. Tôi có thể giúp bạn lên lịch làm việc, soạn thông báo hoặc phân tích tình hình chấm công." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Mock context data representing state of the restaurant
    const contextData = `
      Vai trò: Quản lý nhà hàng.
      Số lượng nhân viên: 16.
      Vấn đề hiện tại: 2 nhân viên đi muộn hôm nay (Phục vụ).
      Sự kiện sắp tới: Quốc khánh 2/9.
      Lương trung bình: 25.000đ/giờ.
      Giờ mở cửa: 10h sáng - 10h tối.
    `;

    const aiResponseText = await askAiAssistant(input, contextData);
    
    const aiMsg: Message = { id: Date.now() + 1, sender: 'ai', text: aiResponseText };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-indigo-50 flex items-center space-x-2">
        <Bot className="text-indigo-600" />
        <h3 className="font-semibold text-indigo-900">Trợ lý AI Nhân sự</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
              }`}
            >
               <div className="flex items-center space-x-2 mb-1 opacity-70 text-xs">
                 {msg.sender === 'ai' ? <Bot size={12}/> : <User size={12}/>}
                 <span>{msg.sender === 'ai' ? 'Trợ lý AI' : 'Bạn'}</span>
               </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
              <Loader2 className="animate-spin text-indigo-600" size={16} />
              <span className="text-gray-500 text-sm">Đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Hỏi về cách chia ca, luật lao động, hoặc soạn thông báo..."
            className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">AI có thể mắc sai lầm. Hãy kiểm tra thông tin quan trọng.</p>
      </div>
    </div>
  );
};
