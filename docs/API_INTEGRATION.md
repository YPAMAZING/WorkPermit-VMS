# MIS Work Permit System - API Integration Guide

## Overview

This document provides comprehensive API documentation for integrating the MIS Work Permit System with your existing MIS web application.

**Base URL**: `http://your-domain.com/api`

**Copyright**: © 2025 YP SECURITY SERVICES PVT LTD. All Rights Reserved.

---

## Authentication Methods

### 1. Standard JWT Authentication

For direct login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "permissions": ["dashboard.view", "permits.create", ...]
  }
}
```

### 2. SSO Integration (Recommended for MIS)

#### Flow 1: Token-based SSO (Server-to-Server)

**Step 1: Generate SSO Token (from your MIS backend)**

```http
POST /api/sso/generate
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SITE_ENGINEER",
  "externalUserId": "mis-user-123",
  "externalSystem": "MIS"
}
```

**Response:**
```json
{
  "ssoToken": "abc123def456...",
  "expiresAt": "2024-12-25T12:05:00.000Z",
  "redirectUrl": "/auth/sso/verify?token=abc123def456..."
}
```

**Step 2: Redirect user to Work Permit System**

```
https://your-permit-domain.com/auth/sso/callback?token=abc123def456...
```

The system will verify the token and establish a session automatically.

#### Flow 2: External JWT Validation (Embedded/iframe)

For embedding Work Permit System within your MIS:

```http
POST /api/sso/validate-external
Content-Type: application/json

{
  "externalToken": "your-mis-jwt-token",
  "secret": "your-jwt-secret",
  "algorithm": "HS256"
}
```

**Response:**
```json
{
  "message": "External token validated",
  "token": "internal-jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "SITE_ENGINEER"
  }
}
```

---

## User Roles

| Role | Code | Access |
|------|------|--------|
| Administrator | `ADMIN` | Full system access, user management, role configuration |
| Safety Officer | `SAFETY_OFFICER` | Approve/reject permits, manage workers, view all permits |
| Requestor | `REQUESTOR` | Create permits, view own permits |
| Site Engineer | `SITE_ENGINEER` | Meter readings, OCR upload, analytics dashboard |

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### SSO

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sso/config` | Get SSO configuration |
| POST | `/api/sso/generate` | Generate SSO token |
| GET | `/api/sso/verify` | Verify SSO token |
| POST | `/api/sso/validate-external` | Validate external JWT |

### Permits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/permits` | List permits (paginated, filtered) |
| GET | `/api/permits/:id` | Get permit details |
| POST | `/api/permits` | Create permit |
| PUT | `/api/permits/:id` | Update permit |
| DELETE | `/api/permits/:id` | Delete permit |
| GET | `/api/permits/work-types` | Get permit types |
| POST | `/api/permits/:id/extend` | Extend permit |
| POST | `/api/permits/:id/revoke` | Revoke permit |
| POST | `/api/permits/:id/close` | Close permit |
| POST | `/api/permits/:id/transfer` | Transfer permit |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals` | List pending approvals |
| GET | `/api/approvals/:id` | Get approval details |
| PUT | `/api/approvals/:id/decision` | Submit approval decision |
| GET | `/api/approvals/pending-count` | Get pending count |
| GET | `/api/approvals/stats` | Get approval statistics |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get user details |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Deactivate user |

### Roles (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List roles |
| GET | `/api/roles/:id` | Get role details |
| POST | `/api/roles` | Create role |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |
| GET | `/api/roles/permissions` | Get all permissions |
| POST | `/api/roles/assign` | Assign role to user |

### Meter Readings (Site Engineer)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meters` | List readings (paginated) |
| GET | `/api/meters/:id` | Get reading details |
| POST | `/api/meters` | Create reading |
| PUT | `/api/meters/:id` | Update reading |
| DELETE | `/api/meters/:id` | Delete reading |
| PATCH | `/api/meters/:id/verify` | Verify reading |
| GET | `/api/meters/types` | Get meter types |
| GET | `/api/meters/analytics` | Get analytics data |
| GET | `/api/meters/export` | Export readings (CSV/JSON) |
| POST | `/api/meters/bulk-import` | Bulk import readings |

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers` | List workers |
| POST | `/api/workers` | Create worker |
| GET | `/api/workers/qr/:permitId` | Generate QR code |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/dashboard/activity` | Get recent activity |

---

## Creating Meter Readings with OCR

### Request

```http
POST /api/meters
Authorization: Bearer <token>
Content-Type: application/json

{
  "meterType": "electricity",
  "meterName": "Main Building Meter",
  "meterSerial": "MTR-12345",
  "location": "Building A, Floor 1",
  "readingValue": 12345.67,
  "unit": "kWh",
  "imageUrl": "https://storage.example.com/meter-image.jpg",
  "ocrRawText": "12345.67 kWh",
  "ocrConfidence": 0.95,
  "notes": "Monthly reading",
  "readingDate": "2024-12-25T10:00:00Z"
}
```

### Response

```json
{
  "message": "Reading created successfully",
  "reading": {
    "id": "uuid",
    "meterType": "electricity",
    "meterName": "Main Building Meter",
    "readingValue": 12345.67,
    "previousReading": 12000.00,
    "consumption": 345.67
  },
  "consumption": 345.67,
  "previousReading": 12000.00
}
```

---

## Export Data for Power BI

### CSV Export

```http
GET /api/meters/export?format=csv&meterType=electricity&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### JSON Export (Power BI Compatible)

```http
GET /api/meters/export?format=json&meterType=electricity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "exportDate": "2024-12-25T12:00:00.000Z",
  "totalRecords": 150,
  "data": [
    {
      "id": "uuid",
      "date": "2024-12-25T10:00:00.000Z",
      "meterType": "electricity",
      "meterName": "Main Building Meter",
      "readingValue": 12345.67,
      "unit": "kWh",
      "consumption": 345.67,
      "isVerified": true
    }
  ]
}
```

---

## Integration Code Examples

### React MIS Integration

```jsx
// src/components/WorkPermitModule.jsx
import { useEffect, useState } from 'react';

const WorkPermitModule = ({ misToken, misUser }) => {
  const [workPermitToken, setWorkPermitToken] = useState(null);

  useEffect(() => {
    // Validate MIS token and get Work Permit token
    const validateToken = async () => {
      const response = await fetch('/api/sso/validate-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalToken: misToken,
          secret: process.env.JWT_SECRET,
          algorithm: 'HS256'
        })
      });
      
      const data = await response.json();
      setWorkPermitToken(data.token);
      localStorage.setItem('work_permit_token', data.token);
    };

    validateToken();
  }, [misToken]);

  if (!workPermitToken) {
    return <div>Loading Work Permit Module...</div>;
  }

  return (
    <iframe
      src={`/work-permit?token=${workPermitToken}`}
      style={{ width: '100%', height: '800px', border: 'none' }}
      title="Work Permit System"
    />
  );
};

export default WorkPermitModule;
```

### Node.js Backend SSO Generation

```javascript
// routes/sso.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const WORK_PERMIT_API = process.env.WORK_PERMIT_API_URL;

router.post('/redirect-to-work-permit', async (req, res) => {
  try {
    // Get current MIS user
    const misUser = req.user;

    // Generate SSO token from Work Permit System
    const response = await axios.post(`${WORK_PERMIT_API}/sso/generate`, {
      email: misUser.email,
      firstName: misUser.firstName,
      lastName: misUser.lastName,
      role: mapMISRoleToPermitRole(misUser.role),
      externalUserId: misUser.id,
      externalSystem: 'MIS'
    });

    // Redirect user to Work Permit System
    res.redirect(`${WORK_PERMIT_API.replace('/api', '')}/auth/sso/callback?token=${response.data.ssoToken}`);
  } catch (error) {
    console.error('SSO redirect error:', error);
    res.status(500).json({ error: 'SSO redirect failed' });
  }
});

function mapMISRoleToPermitRole(misRole) {
  const roleMap = {
    'admin': 'ADMIN',
    'engineer': 'SITE_ENGINEER',
    'safety': 'SAFETY_OFFICER',
    'user': 'REQUESTOR'
  };
  return roleMap[misRole] || 'REQUESTOR';
}

module.exports = router;
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/mis_permit"

# JWT
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN="24h"

# External MIS JWT (for SSO validation)
EXTERNAL_JWT_SECRET="your-mis-jwt-secret"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Node Environment
NODE_ENV="production"
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Support

For technical support or integration assistance:
- Email: support@ypsecurity.com
- Documentation: https://docs.yourpermitsystem.com

---

© 2025 YP SECURITY SERVICES PVT LTD. All Rights Reserved.
