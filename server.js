const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Mock database for users and earnings
const users = {};
const reviews = [];

// Retailer commission rates
const retailers = {
  amazon: { name: 'Amazon', commission: 5 },
  bestbuy: { name: 'Best Buy', commission: 4 },
  walmart: { name: 'Walmart', commission: 3.50 },
  newegg: { name: 'Newegg', commission: 4.50 },
  target: { name: 'Target', commission: 3 },
  adorama: { name: 'Adorama', commission: 5 },
  bhphotovideo: { name: 'B&H Photo Video', commission: 4 },
  ebay: { name: 'eBay', commission: 2.50 }
};

// Routes

// Get all reviews
app.get('/api/reviews', (req, res) => {
  res.json(reviews);
});

// Submit a review
app.post('/api/reviews', (req, res) => {
  const { productName, productLink, rating, userId, retailer, affiliateLink } = req.body;

  if (!productName || !rating || !userId || !retailer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const review = {
    id: reviews.length + 1,
    productName,
    productLink,
    rating,
    userId,
    retailer,
    affiliateLink,
    timestamp: new Date(),
    aiReview: null
  };

  reviews.push(review);
  res.json({ success: true, review });
});

// Generate AI review
app.post('/api/generate-review', async (req, res) => {
  const { rating, productName, productType, retailer } = req.body;

  if (!rating || !productName) {
    return res.status(400).json({ error: 'Missing rating or product name' });
  }

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `Write a short, professional product review for a ${productType || 'electronics'} called "${productName}" with a ${rating}/5 star rating available on ${retailer || 'online'}. Keep it to 2-3 sentences. Focus on features, performance, and value.`;

    const message = await openai.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const aiReview = message.content[0].type === 'text' ? message.content[0].text : 'Could not generate review';
    res.json({ success: true, aiReview });
  } catch (error) {
    console.error('Error generating review:', error);
    res.status(500).json({ error: 'Failed to generate review', details: error.message });
  }
});

// User earnings tracking
app.post('/api/users', (req, res) => {
  const { userId, email } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (!users[userId]) {
    users[userId] = {
      userId,
      email: email || 'unknown@example.com',
      totalEarnings: 0,
      affiliateClicks: 0,
      retailerStats: {},
      withdrawalRequests: []
    };
  }

  res.json({ success: true, user: users[userId] });
});

// Get user earnings
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;

  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(users[userId]);
});

// Track affiliate link click
app.post('/api/affiliate-click', (req, res) => {
  const { userId, retailer, productLink, commission } = req.body;

  if (!userId || !retailer) {
    return res.status(400).json({ error: 'Missing userId or retailer' });
  }

  if (!users[userId]) {
    users[userId] = {
      userId,
      email: 'unknown@example.com',
      totalEarnings: 0,
      affiliateClicks: 0,
      retailerStats: {},
      withdrawalRequests: []
    };
  }

  const commissionAmount = commission || retailers[retailer]?.commission || 5;
  users[userId].totalEarnings += commissionAmount;
  users[userId].affiliateClicks += 1;

  // Track by retailer
  if (!users[userId].retailerStats[retailer]) {
    users[userId].retailerStats[retailer] = 0;
  }
  users[userId].retailerStats[retailer] += 1;

  res.json({
    success: true,
    message: 'Affiliate click tracked',
    retailer: retailers[retailer]?.name || 'Unknown',
    commission: commissionAmount,
    userEarnings: users[userId].totalEarnings
  });
});

// Request withdrawal
app.post('/api/withdraw', (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing userId or amount' });
  }

  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (users[userId].totalEarnings < amount) {
    return res.status(400).json({ error: 'Insufficient earnings' });
  }

  const withdrawal = {
    id: users[userId].withdrawalRequests.length + 1,
    amount,
    status: 'pending',
    requestedDate: new Date()
  };

  users[userId].withdrawalRequests.push(withdrawal);
  users[userId].totalEarnings -= amount;

  res.json({ success: true, withdrawal });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Supported retailers: ${Object.values(retailers).map(r => r.name).join(', ')}`);
});
