# Metrics & Analytics

## Key Product Metrics

### 1. Acquisition Metrics
**Tracking user acquisition:**

```javascript
// Analytics event tracking
analytics.track('user_signed_up', {
  source: 'google_ads',
  campaign: 'spring_2026',
  user_id: userId,
  timestamp: new Date().toISOString()
});
```

**Key metrics:**
- **CAC (Customer Acquisition Cost)** = Marketing spend / New customers
- **Conversion rate** = Signups / Visitors × 100%
- **Time to convert** = Days from first visit to signup

### 2. Activation Metrics
**First-time user experience:**

```javascript
// Track activation milestones
const activationSteps = [
  'profile_completed',
  'first_project_created',
  'first_invite_sent',
  'aha_moment_reached'
];

activationSteps.forEach(step => {
  analytics.track(step, { user_id: userId });
});
```

**Metrics:**
- **Activation rate** = Users completing key actions / Total signups
- **Time to value** = Time to first "aha moment"
- **Setup completion rate** = Users finishing onboarding

### 3. Engagement Metrics

**DAU/MAU Ratio:**
```javascript
// Calculate stickiness
const dau = uniqueUsersToday.length;
const mau = uniqueUsersThisMonth.length;
const stickiness = (dau / mau) * 100; // Target: >20%
```

**Session metrics:**
- **Session duration** - Time spent per visit
- **Pages per session** - Depth of engagement
- **Feature adoption** - % using each feature

### 4. Retention Metrics

**Cohort analysis:**
```sql
-- Day 1, 7, 30 retention
SELECT
  DATE_TRUNC('day', created_at) as cohort_date,
  COUNT(DISTINCT user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN last_login >= created_at + INTERVAL '1 day'
    THEN user_id END) as day_1_retention,
  COUNT(DISTINCT CASE WHEN last_login >= created_at + INTERVAL '7 days'
    THEN user_id END) as day_7_retention,
  COUNT(DISTINCT CASE WHEN last_login >= created_at + INTERVAL '30 days'
    THEN user_id END) as day_30_retention
FROM users
GROUP BY cohort_date
ORDER BY cohort_date DESC;
```

**Retention curve:**
- Day 1: 40-50%
- Day 7: 20-30%
- Day 30: 10-15%

### 5. Revenue Metrics

**MRR tracking:**
```javascript
// Monthly Recurring Revenue
const mrr = subscriptions
  .filter(s => s.status === 'active')
  .reduce((sum, s) => sum + s.monthly_value, 0);

// MRR Growth Rate
const mrrGrowth = ((currentMRR - lastMonthMRR) / lastMonthMRR) * 100;
```

**Key metrics:**
- **ARPU** = Total revenue / Total users
- **LTV** = ARPU × Customer lifetime (months)
- **LTV:CAC ratio** = Target >3:1

### 6. Churn Metrics

**Churn rate calculation:**
```javascript
// Monthly churn
const churnRate = (
  (customersStartOfMonth - customersEndOfMonth) /
  customersStartOfMonth
) * 100;

// Revenue churn
const revenueChurn = (
  (mrrStartOfMonth - mrrEndOfMonth + newMRR) /
  mrrStartOfMonth
) * 100;
```

**Churn signals:**
- Decreased login frequency
- Feature usage drops
- Support tickets increase
- No activity in 7+ days

## Analytics Tools

### Google Analytics 4
```javascript
// GA4 event tracking
gtag('event', 'purchase', {
  transaction_id: orderId,
  value: total,
  currency: 'USD',
  items: [{
    item_id: productId,
    item_name: productName,
    price: price,
    quantity: qty
  }]
});
```

### Mixpanel
```javascript
// User properties
mixpanel.people.set({
  '$email': user.email,
  '$name': user.name,
  'Plan': 'Pro',
  'Signup Date': user.createdAt
});

// Track events
mixpanel.track('Feature Used', {
  'Feature Name': 'Export PDF',
  'Plan Type': 'Pro'
});
```

### Amplitude
```javascript
// Event with properties
amplitude.getInstance().logEvent('Button Clicked', {
  buttonName: 'Upgrade to Pro',
  location: 'Settings Page',
  timestamp: Date.now()
});
```

## Dashboard Design

### Executive Dashboard
```markdown
┌─────────────────────────────────────┐
│ Key Metrics Overview                │
├─────────────────────────────────────┤
│ MRR: $250K    ↑12% vs last month   │
│ Users: 5,432  ↑8% vs last month    │
│ Churn: 3.2%   ↓0.5% vs last month  │
│ NPS: 52       ↑5 vs last quarter   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Funnel Conversion                   │
├─────────────────────────────────────┤
│ Visitors     10,000  100%           │
│ Signups       1,500   15%  ↓        │
│ Activated       900   60%  ↓        │
│ Paid            270   30%  ↓        │
└─────────────────────────────────────┘
```

## SQL Queries for Analysis

### Active Users
```sql
-- DAU/WAU/MAU
SELECT
  COUNT(DISTINCT CASE WHEN last_active >= CURRENT_DATE
    THEN user_id END) as dau,
  COUNT(DISTINCT CASE WHEN last_active >= CURRENT_DATE - INTERVAL '7 days'
    THEN user_id END) as wau,
  COUNT(DISTINCT CASE WHEN last_active >= CURRENT_DATE - INTERVAL '30 days'
    THEN user_id END) as mau
FROM user_activity;
```

### Feature Adoption
```sql
-- % of users using each feature
SELECT
  feature_name,
  COUNT(DISTINCT user_id) as users,
  ROUND(100.0 * COUNT(DISTINCT user_id) /
    (SELECT COUNT(*) FROM users WHERE status='active'), 2) as adoption_rate
FROM feature_usage
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY feature_name
ORDER BY adoption_rate DESC;
```

## A/B Testing

### Test structure:
```javascript
// Split users into variants
const variant = experimentService.getVariant('checkout_flow_v2', userId);

if (variant === 'control') {
  // Show old checkout
  showCheckoutV1();
} else if (variant === 'treatment') {
  // Show new checkout
  showCheckoutV2();
}

// Track conversion
analytics.track('checkout_completed', {
  variant: variant,
  user_id: userId,
  revenue: total
});
```

### Statistical significance:
```python
# Python - chi-square test
from scipy.stats import chi2_contingency

# Control: 100 conversions / 1000 visitors = 10%
# Treatment: 130 conversions / 1000 visitors = 13%

observed = [[100, 900], [130, 870]]
chi2, p_value, dof, expected = chi2_contingency(observed)

if p_value < 0.05:
    print("Statistically significant")
else:
    print("Not significant - need more data")
```

## Metrics Framework: AARRR

1. **Acquisition** - How users find you
2. **Activation** - First great experience
3. **Retention** - Users come back
4. **Revenue** - Monetization
5. **Referral** - Users bring others

---

<p><a href="./03-prd-va-requirements.md">← PRD & Requirements</a> | <a href="./05-roadmap-planning.md">Tiếp: Roadmap Planning →</a></p>
