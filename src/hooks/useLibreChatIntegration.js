import { useState, useEffect, useCallback } from 'react';
import DashboardAPI from '../api/dashboardAPI';

const useLibreChatIntegration = (attempts, metrics) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const api = new DashboardAPI();

  // Update dashboard data when attempts or metrics change
  useEffect(() => {
    const updateDashboardData = async () => {
      if (attempts.length > 0) {
        setIsLoading(true);
        try {
          const shotGrouping = await api.getShotGrouping(attempts);
          const trendData = await api.getAccuracyTrend(attempts);
          const recommendations = await api.getCoachingRecommendations(metrics, shotGrouping);
          
          const data = {
            metrics,
            shotGrouping,
            trendData,
            recommendations,
            lastUpdated: new Date().toISOString()
          };
          
          setDashboardData(data);
        } catch (error) {
          console.error('Error updating dashboard data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    updateDashboardData();
  }, [attempts, metrics]);

  // Toggle chat visibility
  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  // Handle data requests from LibreChat
  const handleDataRequest = useCallback(async () => {
    if (attempts.length > 0) {
      try {
        const shotGrouping = await api.getShotGrouping(attempts);
        const exportData = await api.exportDataForAnalysis(attempts, metrics, shotGrouping);
        
        // Send data to LibreChat iframe
        const iframe = document.querySelector('iframe[title="LibreChat"]');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'DASHBOARD_DATA_UPDATE',
            data: exportData
          }, '*');
        }
      } catch (error) {
        console.error('Error handling data request:', error);
      }
    }
  }, [attempts, metrics]);

  // Get coaching insights for chat
  const getCoachingInsights = useCallback(() => {
    if (!dashboardData) return null;

    const insights = [];
    
    // Accuracy insights
    if (metrics.acc < 70) {
      insights.push(`Your current accuracy is ${metrics.acc}%. Focus on fundamental shooting mechanics.`);
    } else if (metrics.acc > 85) {
      insights.push(`Excellent accuracy at ${metrics.acc}%! Keep maintaining your form.`);
    }

    // Error insights
    if (metrics.mre > 8) {
      insights.push(`Mean radial error is ${metrics.mre}cm. Work on tightening your shot grouping.`);
    } else if (metrics.mre < 4) {
      insights.push(`Great precision with ${metrics.mre}cm mean error!`);
    }

    // Release angle insights
    if (Math.abs(metrics.releaseAvg - 52) > 2) {
      insights.push(`Release angle is ${metrics.releaseAvg}°. Target 52° for optimal arc.`);
    }

    return insights.join(' ');
  }, [dashboardData, metrics]);

  // Get practice recommendations
  const getPracticeRecommendations = useCallback(() => {
    if (!dashboardData?.recommendations) return [];

    return dashboardData.recommendations.map(rec => ({
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      exercises: rec.exercises
    }));
  }, [dashboardData]);

  return {
    isChatOpen,
    toggleChat,
    dashboardData,
    isLoading,
    handleDataRequest,
    getCoachingInsights,
    getPracticeRecommendations
  };
};

export default useLibreChatIntegration;
