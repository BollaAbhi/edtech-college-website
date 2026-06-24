const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('DNS servers configured to Google DNS');
} catch (err) {
  console.error('Failed to configure DNS servers:', err);
}

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('MONGO_URI is set:', !!process.env.MONGO_URI);

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/principal', require('./routes/principal'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/student', require('./routes/student'));
app.use('/api/students', require('./routes/students'));
app.use('/api/staff-members', require('./routes/staffMembers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/leave', require('./routes/leaves'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
