import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MockLibreChat = ({ 
  isOpen = false, 
  onToggle, 
  dashboardData = null,
  onDataRequest 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI Sports Coach Assistant. I can help analyze your shooting performance and provide personalized recommendations.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-generate insights when dashboard data changes
  useEffect(() => {
    if (dashboardData && dashboardData.metrics) {
      const insights = generateInsights(dashboardData);
      if (insights) {
        addBotMessage(insights);
      }
    }
  }, [dashboardData]);

  const generateInsights = (data) => {
    const { metrics } = data;
    let insight = '';

    if (metrics.acc < 70) {
      insight = `I notice your accuracy is ${metrics.acc}%. Let's work on improving your shooting fundamentals. Focus on proper form and follow-through.`;
    } else if (metrics.acc > 85) {
      insight = `Excellent accuracy at ${metrics.acc}%! You're performing very well. Keep maintaining your current technique.`;
    } else {
      insight = `Your accuracy is ${metrics.acc}%, which is solid. There's room for improvement with focused practice.`;
    }

    if (metrics.mre > 8) {
      insight += ` I also see your mean radial error is ${metrics.mre}cm. Work on tightening your shot grouping with stability exercises.`;
    }

    return insight;
  };

  const addBotMessage = (content) => {
    const newMessage = {
      id: Date.now(),
      type: 'bot',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (content) => {
    const newMessage = {
      id: Date.now(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    addUserMessage(inputMessage);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(inputMessage);
      addBotMessage(response);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('accuracy') || message.includes('shooting')) {
      return `Based on your current data, your accuracy is ${dashboardData?.metrics?.acc || 'unknown'}%. I recommend focusing on fundamental shooting mechanics and consistent form.`;
    }
    
    if (message.includes('error') || message.includes('grouping')) {
      return `Your mean radial error is ${dashboardData?.metrics?.mre || 'unknown'}cm. To improve grouping, try core stability exercises and wrist strengthening drills.`;
    }
    
    if (message.includes('angle') || message.includes('release')) {
      return `Your release angle is ${dashboardData?.metrics?.releaseAvg || 'unknown'}°. The optimal angle is around 52°. Practice the pause-and-hold drill at the peak of your shot.`;
    }
    
    if (message.includes('practice') || message.includes('drill')) {
      return `Here are some effective practice drills:\n1. Slow, controlled shots with proper form\n2. 10x10 drill with 2-minute rest between sets\n3. Video analysis from front and side angles\n4. Pressure situation practice with timers`;
    }
    
    if (message.includes('help') || message.includes('advice')) {
      return `I can help you with:\n• Shooting accuracy analysis\n• Technique recommendations\n• Practice drill suggestions\n• Performance tracking\n• Goal setting\n\nWhat would you like to know about your shooting performance?`;
    }
    
    return `I understand you're asking about "${userMessage}". Based on your current performance data, I'd recommend focusing on consistent practice and proper form. Would you like specific advice on any particular aspect of your shooting?`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl border-2">
      <div className="flex items-center justify-between p-3 border-b bg-blue-50 dark:bg-blue-900">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-sm">AI Sports Coach</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="flex flex-col h-[540px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {message.type === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your shooting performance..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MockLibreChat;
