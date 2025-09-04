import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const LibreChatEmbed = ({ 
  isOpen = false, 
  onToggle, 
  dashboardData = null,
  onDataRequest 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  // Send dashboard data to LibreChat when it loads
  useEffect(() => {
    if (isOpen && iframeRef.current && dashboardData) {
      const iframe = iframeRef.current;
      iframe.onload = () => {
        // Send data to LibreChat iframe
        iframe.contentWindow.postMessage({
          type: 'DASHBOARD_DATA',
          data: dashboardData
        }, '*');
      };
    }
  }, [isOpen, dashboardData]);

  // Listen for messages from LibreChat
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'REQUEST_DASHBOARD_DATA') {
        onDataRequest?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onDataRequest]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl border-2">
      <div className="flex items-center justify-between p-3 border-b bg-zinc-50 dark:bg-zinc-800">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-sm">AI Coach Assistant</span>
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
        <div className="h-[540px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="http://localhost:3090/"
            className="w-full h-full border-0"
            title="LibreChat"
            onLoad={() => setIsLoading(false)}
            onLoadStart={() => setIsLoading(true)}
          />
        </div>
      )}
    </Card>
  );
};

export default LibreChatEmbed;
