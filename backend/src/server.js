const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes (to be implemented)
app.use('/api/analyze', require('./routes/analysis.routes'));
app.use('/api/map', require('./routes/map.routes'));
// app.use('/api/history', require('./routes/history.routes'));
// app.use('/api/alerts', require('./routes/alerts.routes'));
// app.use('/api/farms', require('./routes/farm.routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Agriculture API is running.' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: 'SERVER_ERROR'
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
