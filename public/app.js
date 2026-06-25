// User ID (in real app, this would come from authentication)
const userId = 'user_' + Math.random().toString(36).substr(2, 9);

// Retailer information
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

// Show/Hide sections
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from all nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Add active class to clicked button
  event.target.classList.add('active');

  // Load data when switching to earnings
  if (sectionId === 'earnings') {
    loadUserEarnings();
  }

  // Load reviews when switching to reviews
  if (sectionId === 'reviews') {
    loadReviews();
  }
}

// Load all reviews
async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    const reviews = await response.json();

    const reviewsList = document.getElementById('reviews-list');
    reviewsList.innerHTML = '';

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No reviews yet. Be the first to review!</p>';
      return;
    }

    reviews.forEach(review => {
      const retailerName = retailers[review.retailer]?.name || 'Unknown Retailer';
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="retailer-badge">${retailerName}</div>
        <h3>${review.productName}</h3>
        <div class="rating">${'⭐'.repeat(review.rating)}</div>
        <p><strong>Review:</strong></p>
        <p>${review.aiReview || 'No review text available'}</p>
        <a href="${review.productLink}" target="_blank" class="review-link" onclick="trackAffiliateClick('${review.retailer}', '${review.productLink}')">View on ${retailerName}</a>
      `;
      reviewsList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading reviews:', error);
    alert('Failed to load reviews');
  }
}

// Generate AI Review
async function generateAIReview() {
  const productName = document.getElementById('productName').value;
  const productType = document.getElementById('productType').value;
  const rating = document.querySelector('input[name="rating"]:checked');
  const retailer = document.getElementById('retailer').value;

  if (!productName || !productType || !rating || !retailer) {
    alert('Please fill in all fields');
    return;
  }

  const button = event.target;
  button.disabled = true;
  button.textContent = 'Generating...';

  try {
    const response = await fetch('/api/generate-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: productName,
        productType: productType,
        rating: parseInt(rating.value),
        retailer: retailers[retailer].name
      })
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('aiReviewPreview').value = data.aiReview;
    } else {
      alert('Error: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error generating review:', error);
    alert('Failed to generate review. Make sure your OpenAI API key is set!');
  } finally {
    button.disabled = false;
    button.textContent = 'Generate AI Review';
  }
}

// Submit Review
document.getElementById('review-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const productName = document.getElementById('productName').value;
  const productLink = document.getElementById('productLink').value;
  const rating = document.querySelector('input[name="rating"]:checked').value;
  const retailer = document.getElementById('retailer').value;
  const aiReview = document.getElementById('aiReviewPreview').value;

  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName,
        productLink,
        rating: parseInt(rating),
        retailer,
        userId,
        affiliateLink: productLink
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Review submitted successfully!');
      document.getElementById('review-form').reset();
      document.getElementById('aiReviewPreview').value = '';
    } else {
      alert('Error: ' + (data.error || 'Failed to submit review'));
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('Failed to submit review');
  }
});

// Track Affiliate Click
async function trackAffiliateClick(retailer, affiliateLink) {
  try {
    const commission = retailers[retailer]?.commission || 5;
    await fetch('/api/affiliate-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        retailer,
        productLink: affiliateLink,
        commission: commission
      })
    });
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
  }
}

// Load User Earnings
async function loadUserEarnings() {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();

    if (response.ok) {
      document.getElementById('total-earnings').textContent = `$${user.totalEarnings.toFixed(2)}`;
      document.getElementById('affiliate-clicks').textContent = user.affiliateClicks;

      // Retailer breakdown
      const breakdownDiv = document.getElementById('retailer-breakdown');
      breakdownDiv.innerHTML = '';

      if (user.retailerStats && Object.keys(user.retailerStats).length > 0) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'retailer-breakdown';

        Object.entries(user.retailerStats).forEach(([retailer, clicks]) => {
          const statDiv = document.createElement('div');
          statDiv.className = 'retailer-stat';
          statDiv.innerHTML = `
            <p><strong>${retailers[retailer]?.name || retailer}</strong></p>
            <p class="count">${clicks}</p>
            <p>clicks</p>
          `;
          statsContainer.appendChild(statDiv);
        });

        breakdownDiv.appendChild(statsContainer);
      } else {
        breakdownDiv.innerHTML = '<p style="text-align: center; color: #999;">No clicks yet</p>';
      }

      // Withdrawal history
      const historyDiv = document.getElementById('withdrawal-history');
      historyDiv.innerHTML = '<h3>Withdrawal History</h3>';

      if (user.withdrawalRequests.length === 0) {
        historyDiv.innerHTML += '<p style="color: #999;">No withdrawals yet</p>';
      } else {
        user.withdrawalRequests.forEach(withdrawal => {
          const item = document.createElement('div');
          item.className = 'withdrawal-item';
          item.innerHTML = `
            <p><strong>Amount:</strong> $${withdrawal.amount.toFixed(2)}</p>
            <p><strong>Status:</strong> <span style="color: ${withdrawal.status === 'completed' ? '#48bb78' : '#f59e0b'}">${withdrawal.status.toUpperCase()}</span></p>
            <p><strong>Date:</strong> ${new Date(withdrawal.requestedDate).toLocaleDateString()}</p>
          `;
          historyDiv.appendChild(item);
        });
      }
    } else {
      console.log('User not found, initializing...');
      // Create user if doesn't exist
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      loadUserEarnings();
    }
  } catch (error) {
    console.error('Error loading earnings:', error);
  }
}

// Request Withdrawal
async function requestWithdrawal() {
  const amount = parseFloat(document.getElementById('withdrawAmount').value);

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  try {
    const response = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount })
    });

    const data = await response.json();

    if (data.success) {
      alert('Withdrawal request submitted!');
      document.getElementById('withdrawAmount').value = '';
      loadUserEarnings();
    } else {
      alert('Error: ' + (data.error || 'Failed to request withdrawal'));
    }
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    alert('Failed to request withdrawal');
  }
}

// Initialize - load reviews on page load
document.addEventListener('DOMContentLoaded', () => {
  loadReviews();
});
