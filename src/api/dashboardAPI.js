// Dashboard API for LibreChat integration
class DashboardAPI {
  constructor() {
    this.baseURL = 'http://localhost:3080/api';
  }

  // Get current dashboard metrics
  async getMetrics(attempts) {
    const total = attempts.length;
    const makes = attempts.filter(a => a.hit).length;
    const accuracy = total > 0 ? (makes / total) * 100 : 0;
    const meanError = attempts.reduce((sum, a) => sum + a.err, 0) / total;
    const releaseAngles = attempts.map(a => a.releaseDeg).filter(angle => angle > 0);
    const avgReleaseAngle = releaseAngles.length > 0 
      ? releaseAngles.reduce((sum, angle) => sum + angle, 0) / releaseAngles.length 
      : 0;

    return {
      totalAttempts: total,
      successfulShots: makes,
      accuracy: Math.round(accuracy * 10) / 10,
      meanRadialError: Math.round(meanError * 100) / 100,
      averageReleaseAngle: Math.round(avgReleaseAngle * 100) / 100,
      sport: 'basketball', // This would be dynamic
      lastUpdated: new Date().toISOString()
    };
  }

  // Get accuracy trend data
  async getAccuracyTrend(attempts, windowSize = 10) {
    const trend = [];
    for (let i = 0; i < attempts.length; i++) {
      const from = Math.max(0, i - windowSize + 1);
      const slice = attempts.slice(from, i + 1);
      const accuracy = slice.length > 0 ? (slice.filter(d => d.hit).length / slice.length) * 100 : 0;
      trend.push({
        attempt: i + 1,
        accuracy: Math.round(accuracy * 10) / 10,
        windowSize: slice.length
      });
    }
    return trend;
  }

  // Get shot grouping analysis
  async getShotGrouping(attempts) {
    const hits = attempts.filter(a => a.hit);
    const misses = attempts.filter(a => !a.hit);
    
    const hitPositions = hits.map(a => ({ x: a.x, y: a.y }));
    const missPositions = misses.map(a => ({ x: a.x, y: a.y }));

    // Calculate center of mass for hits
    const hitCenterX = hitPositions.length > 0 
      ? hitPositions.reduce((sum, pos) => sum + pos.x, 0) / hitPositions.length 
      : 0;
    const hitCenterY = hitPositions.length > 0 
      ? hitPositions.reduce((sum, pos) => sum + pos.y, 0) / hitPositions.length 
      : 0;

    return {
      totalShots: attempts.length,
      hits: hits.length,
      misses: misses.length,
      hitCenter: { x: Math.round(hitCenterX * 100) / 100, y: Math.round(hitCenterY * 100) / 100 },
      hitPositions,
      missPositions,
      groupingTightness: this.calculateGroupingTightness(hitPositions)
    };
  }

  // Calculate how tight the shot grouping is
  calculateGroupingTightness(positions) {
    if (positions.length < 2) return 0;
    
    const centerX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
    const centerY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
    
    const distances = positions.map(pos => 
      Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2)
    );
    
    const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    return Math.round(avgDistance * 100) / 100;
  }

  // Get coaching recommendations based on data
  async getCoachingRecommendations(metrics, shotGrouping) {
    const recommendations = [];

    if (metrics.accuracy < 70) {
      recommendations.push({
        priority: 'high',
        category: 'accuracy',
        title: 'Improve Shot Accuracy',
        description: 'Focus on fundamental shooting mechanics and form consistency.',
        exercises: [
          'Practice slow, controlled shots with proper form',
          'Use video analysis to check shooting mechanics',
          'Work on follow-through and wrist snap'
        ]
      });
    }

    if (metrics.meanRadialError > 8) {
      recommendations.push({
        priority: 'high',
        category: 'precision',
        title: 'Tighten Shot Grouping',
        description: 'Reduce shot dispersion by improving stability and consistency.',
        exercises: [
          'Core stability exercises',
          'Wrist and forearm strengthening',
          'Balance and footwork drills'
        ]
      });
    }

    if (shotGrouping.groupingTightness > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'consistency',
        title: 'Improve Shot Consistency',
        description: 'Work on reducing shot-to-shot variation.',
        exercises: [
          'Repetitive shooting drills',
          'Consistent pre-shot routine',
          'Mental focus and concentration exercises'
        ]
      });
    }

    if (Math.abs(metrics.averageReleaseAngle - 52) > 2) {
      recommendations.push({
        priority: 'medium',
        category: 'technique',
        title: 'Optimize Release Angle',
        description: `Current angle: ${metrics.averageReleaseAngle}°. Target: 52°.`,
        exercises: [
          'Release angle practice with angle measurement',
          'Pause-and-hold drill at peak of shot',
          'Arc visualization exercises'
        ]
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintenance',
        title: 'Maintain Current Performance',
        description: 'Your shooting is performing well. Focus on maintaining consistency.',
        exercises: [
          'Regular practice to maintain form',
          'Add pressure situations to training',
          'Track progress over time'
        ]
      });
    }

    return recommendations;
  }

  // Export data for LibreChat analysis
  async exportDataForAnalysis(attempts, metrics, shotGrouping) {
    return {
      summary: {
        sessionDate: new Date().toISOString(),
        totalShots: attempts.length,
        accuracy: metrics.accuracy,
        meanError: metrics.meanRadialError,
        sport: 'basketball'
      },
      rawData: attempts.map(attempt => ({
        attempt: attempt.t,
        hit: attempt.hit,
        error: attempt.err,
        x: attempt.x,
        y: attempt.y,
        releaseAngle: attempt.releaseDeg,
        speed: attempt.speed
      })),
      analysis: {
        shotGrouping,
        trends: await this.getAccuracyTrend(attempts),
        recommendations: await this.getCoachingRecommendations(metrics, shotGrouping)
      }
    };
  }
}

export default DashboardAPI;
