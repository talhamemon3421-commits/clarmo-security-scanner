# Clarmo Module Test Results

Here are the exact results of the tests I ran for all 9 endpoints using the `POST /api/fraud/check/<type>` URLs. I've also included a 10th test with a completely clean input to demonstrate the `approved` status.

---

## 1. Check User (`/user`)
**Input Payload:**
```json
{
  "entityType": "User",
  "id": "user_123",
  "name": "John Doe",
  "email": "john@mailinator.com",
  "phone": "+1234567890",
  "bio": "Click here to win free prizes! Visit www.paypa1.com",
  "address": "123 Street, City",
  "reputation": 4.5,
  "joinedDate": "2024-01-01",
  "verified": false
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Suspicious spam keywords detected in user profile",
  "severity": "medium",
  "moderationStatus": "pending_review",
  "confidence": 0.85,
  "checks": [
    "spam_keywords",
    "phishing_keywords",
    "fraud_keywords",
    "email_pattern",
    "phishing_links"
  ]
}
```

---

## 2. Check Post (`/post`)
**Input Payload:**
```json
{
  "entityType": "Post",
  "id": "post_456",
  "authorId": "user_123",
  "content": "Check out this amazing deal! Click here to buy now",
  "image": "https://example.com/image.jpg",
  "category": "general",
  "likes": 12,
  "likedBy": ["user_1", "user_2"]
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Suspicious spam content detected in post",
  "severity": "medium",
  "moderationStatus": "pending_review",
  "confidence": 0.9,
  "checks": [
    "spam_keywords",
    "phishing_keywords",
    "hate_speech_keywords",
    "phishing_links"
  ]
}
```

---

## 3. Check Marketplace Item (`/marketplace-item`)
**Input Payload:**
```json
{
  "entityType": "MarketplaceItem",
  "id": "item_789",
  "sellerId": "user_123",
  "title": "iPhone 15 Pro",
  "description": "Brand new sealed box",
  "price": 50,
  "condition": "new",
  "category": "electronics",
  "status": "active"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Suspicious spam keywords detected in marketplace listing",
  "severity": "low",
  "moderationStatus": "pending_review",
  "confidence": 0.43,
  "checks": [
    "spam_keywords",
    "fraud_keywords",
    "phishing_links",
    "price_anomaly"
  ]
}
```

---

## 4. Check Event (`/event`)
**Input Payload:**
```json
{
  "entityType": "Event",
  "id": "event_321",
  "organizerId": "user_123",
  "title": "Free iPhone Giveaway!",
  "description": "Join now and win prizes",
  "date": "2026-06-01",
  "location": "Lahore",
  "category": "social",
  "attendees": ["user_1", "user_2"]
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Giveaway scam bait detected in event",
  "severity": "low",
  "moderationStatus": "pending_review",
  "confidence": 0.75,
  "checks": [
    "spam_keywords",
    "fraud_keywords",
    "phishing_keywords",
    "phishing_links"
  ]
}
```

---

## 5. Check Alert (`/alert`)
**Input Payload:**
```json
{
  "entityType": "Alert",
  "id": "alert_654",
  "authorId": "user_123",
  "type": "safety",
  "title": "URGENT WARNING!!!",
  "description": "Alert description text",
  "severity": "critical"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Fear-mongering and panic bait language detected",
  "severity": "low",
  "moderationStatus": "pending_review",
  "confidence": 1,
  "checks": [
    "panic_bait_keywords",
    "spam_keywords",
    "phishing_keywords",
    "phishing_links"
  ]
}
```

---

## 6. Check Review (`/review`)
**Input Payload:**
```json
{
  "entityType": "Review",
  "id": "review_111",
  "reviewerId": "user_123",
  "targetId": "item_789",
  "rating": 5,
  "comment": "Best product ever!!! Amazing!!!"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Fake or incentivized review pattern detected",
  "severity": "low",
  "moderationStatus": "pending_review",
  "confidence": 0.75,
  "checks": [
    "fake_review_keywords",
    "spam_keywords",
    "phishing_links"
  ]
}
```

---

## 7. Check Comment (`/comment`)
**Input Payload:**
```json
{
  "entityType": "Comment",
  "id": "comment_222",
  "authorId": "user_123",
  "postId": "post_456",
  "content": "Click here to win: http://win.free.xyz",
  "time": "2026-05-01T10:00:00Z"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Suspicious spam content detected in comment",
  "severity": "medium",
  "moderationStatus": "pending_review",
  "confidence": 1,
  "checks": [
    "spam_keywords",
    "phishing_keywords",
    "hate_speech_keywords",
    "phishing_links"
  ]
}
```

---

## 8. Check Service (`/service`)
**Input Payload:**
```json
{
  "entityType": "Service",
  "id": "svc_333",
  "providerId": "user_123",
  "title": "Make $500 per day from home",
  "description": "Easy money guaranteed",
  "rating": 5.0,
  "price": 1,
  "availability": "always"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Price anomaly — too low for category. Expected range: $5-$5000, got: $1",
  "severity": "high",
  "moderationStatus": "pending_review",
  "confidence": 0.95,
  "checks": [
    "fraud_keywords",
    "spam_keywords",
    "phishing_keywords",
    "phishing_links",
    "price_anomaly"
  ]
}
```

---

## 9. Check Message (`/message`)
**Input Payload:**
```json
{
  "entityType": "Message",
  "id": "msg_444",
  "conversationId": "conv_999",
  "senderId": "user_123",
  "content": "Please send me your bank account details",
  "timestamp": "2026-05-01T11:00:00Z"
}
```
**API Response:**
```json
{
  "isFlagged": true,
  "flagReason": "Financial phishing attempt detected in message",
  "severity": "high",
  "moderationStatus": "pending_review",
  "confidence": 0.43,
  "checks": [
    "phishing_keywords",
    "fraud_keywords",
    "spam_keywords",
    "phishing_links"
  ]
}
```

---

## 10. Clean Data Test (No Fraud Detected)
**Input Payload:**
```json
{
  "entityType": "Post",
  "id": "post_clean",
  "authorId": "user_456",
  "content": "I went to the park today and had a great time with my family. The weather was beautiful.",
  "category": "general"
}
```
**API Response:**
```json
{
  "isFlagged": false,
  "flagReason": null,
  "severity": "none",
  "moderationStatus": "approved",
  "confidence": 0.97,
  "checks": [
    "spam_keywords",
    "phishing_keywords",
    "hate_speech_keywords",
    "phishing_links"
  ]
}
```
