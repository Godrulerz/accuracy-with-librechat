#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏀 Setting up LibreChat integration for Sports Aiming Dashboard...\n');

// Check if LibreChat directory exists
const librechatPath = path.join(__dirname, '..', '..', 'LibreChat');
const librechatExists = fs.existsSync(librechatPath);

if (!librechatExists) {
  console.log('📥 Cloning LibreChat repository...');
  try {
    execSync('git clone https://github.com/danny-avila/LibreChat.git ../../LibreChat', { 
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('✅ LibreChat cloned successfully!');
  } catch (error) {
    console.error('❌ Failed to clone LibreChat:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ LibreChat directory already exists');
}

// Navigate to LibreChat directory
process.chdir(librechatPath);

// Install dependencies
console.log('\n📦 Installing LibreChat dependencies...');
try {
  execSync('npm ci', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(librechatPath, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n⚙️  Creating .env file...');
  const envContent = `# LibreChat Configuration
MONGO_URI=mongodb://localhost:27017/librechat
HOST=localhost
PORT=3080
DOMAIN_CLIENT=http://localhost:3090
DOMAIN_SERVER=http://localhost:3080

# Dashboard Integration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
DASHBOARD_INTEGRATION=true
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created!');
} else {
  console.log('✅ .env file already exists');
}

// Create dashboard integration route
console.log('\n🔧 Setting up dashboard integration...');
const dashboardRoutePath = path.join(librechatPath, 'api', 'routes', 'dashboard.js');
const dashboardRouteDir = path.dirname(dashboardRoutePath);

if (!fs.existsSync(dashboardRouteDir)) {
  fs.mkdirSync(dashboardRouteDir, { recursive: true });
}

const dashboardRouteContent = `const express = require('express');
const router = express.Router();

// Dashboard data endpoint
router.post('/dashboard-data', (req, res) => {
  try {
    const { metrics, attempts, sport, shotGrouping } = req.body;
    
    // Process dashboard data
    const analysis = generateAnalysis(metrics, attempts);
    const recommendations = generateRecommendations(metrics, sport, shotGrouping);
    
    const response = {
      success: true,
      data: {
        analysis,
        recommendations,
        timestamp: new Date().toISOString(),
        sport: sport || 'basketball'
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Dashboard data processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

function generateAnalysis(metrics, attempts) {
  const totalShots = attempts.length;
  const successfulShots = attempts.filter(a => a.hit).length;
  const accuracy = totalShots > 0 ? (successfulShots / totalShots) * 100 : 0;
  
  // Calculate trends
  const recentShots = attempts.slice(-10);
  const recentAccuracy = recentShots.length > 0 
    ? (recentShots.filter(a => a.hit).length / recentShots.length) * 100 
    : 0;
  
  return {
    totalShots,
    successfulShots,
    accuracy: Math.round(accuracy * 10) / 10,
    recentAccuracy: Math.round(recentAccuracy * 10) / 10,
    meanError: metrics.mre || 0,
    releaseAngle: metrics.releaseAvg || 0,
    trends: {
      improving: recentAccuracy > accuracy,
      stable: Math.abs(recentAccuracy - accuracy) < 5,
      declining: recentAccuracy < accuracy - 5
    }
  };
}

function generateRecommendations(metrics, sport, shotGrouping) {
  const recommendations = [];
  
  // Accuracy recommendations
  if (metrics.acc < 70) {
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
  
  // Precision recommendations
  if (metrics.mre > 8) {
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
  
  // Release angle recommendations
  if (Math.abs(metrics.releaseAvg - 52) > 2) {
    recommendations.push({
      priority: 'medium',
      category: 'technique',
      title: 'Optimize Release Angle',
      description: \`Current angle: \${metrics.releaseAvg}°. Target: 52°.\`,
      exercises: [
        'Release angle practice with angle measurement',
        'Pause-and-hold drill at peak of shot',
        'Arc visualization exercises'
      ]
    });
  }
  
  // Sport-specific recommendations
  if (sport === 'basketball') {
    recommendations.push({
      priority: 'low',
      category: 'sport-specific',
      title: 'Basketball-Specific Tips',
      description: 'Additional basketball shooting techniques.',
      exercises: [
        'Free throw routine practice',
        'Game-speed shooting drills',
        'Pressure situation practice'
      ]
    });
  }
  
  return recommendations;
}

module.exports = router;
`;

fs.writeFileSync(dashboardRoutePath, dashboardRouteContent);
console.log('✅ Dashboard route created!');

// Update main server file to include dashboard routes
const serverPath = path.join(librechatPath, 'api', 'server', 'index.js');
if (fs.existsSync(serverPath)) {
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Add dashboard route import if not already present
  if (!serverContent.includes('dashboard')) {
    const importLine = "const dashboardRoutes = require('../routes/dashboard');";
    const appUseLine = "app.use('/api', dashboardRoutes);";
    
    // Find where to insert the import
    const importIndex = serverContent.indexOf('const express = require(');
    if (importIndex !== -1) {
      const nextLineIndex = serverContent.indexOf('\n', importIndex);
      serverContent = serverContent.slice(0, nextLineIndex) + '\n' + importLine + serverContent.slice(nextLineIndex);
    }
    
    // Find where to insert the route usage
    const appUseIndex = serverContent.lastIndexOf('app.use(');
    if (appUseIndex !== -1) {
      const endOfLineIndex = serverContent.indexOf('\n', appUseIndex);
      serverContent = serverContent.slice(0, endOfLineIndex) + '\n' + appUseLine + serverContent.slice(endOfLineIndex);
    }
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✅ Server configuration updated!');
  }
}

console.log('\n🎉 LibreChat integration setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Start MongoDB: mongod');
console.log('2. Start LibreChat backend: cd ../LibreChat && npm run backend');
console.log('3. Start LibreChat frontend: cd ../LibreChat && npm run frontend');
console.log('4. Start your dashboard: npm run dev');
console.log('\n🌐 Access points:');
console.log('- Dashboard: http://localhost:5173');
console.log('- LibreChat: http://localhost:3090');
console.log('- LibreChat API: http://localhost:3080');
