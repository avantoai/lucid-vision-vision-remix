require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const meditationRoutes = require('./routes/meditation');
const visionRoutes = require('./routes/vision');
const giftRoutes = require('./routes/gift');
const subscriptionRoutes = require('./routes/subscription');
const playerRoutes = require('./routes/player');
const whisperRoutes = require('./routes/whisper');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/gift', giftRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/whisper', whisperRoutes);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/gift/:giftId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gift-player.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lucid Vision API is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧘 Lucid Vision API running on port ${PORT}`);
});
