# Production Deployment Guide

This guide covers the deployment and production optimization of the Restaurant ERP System.

## 🚀 Pre-Deployment Checklist

Run the deployment check script before deploying:

```bash
npm run deploy:check
```

This will verify:

- ✅ Environment variables are set
- ✅ Build artifacts exist
- ✅ Required package.json scripts
- ✅ Security configuration
- ✅ Database optimization utilities

## 📋 Environment Variables

### Required Variables

Copy `.env.production.example` to `.env.production` and configure:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/restaurant-erp-prod

# Authentication
BETTER_AUTH_SECRET=your-super-secure-secret-key-minimum-32-characters
BETTER_AUTH_URL=https://your-domain.com

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

### Optional Performance Variables

```bash
# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT=30000

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL_DEFAULT=300

# Monitoring
ENABLE_ERROR_MONITORING=true
LOG_LEVEL=error
SENTRY_DSN=your-sentry-dsn

# Performance
ENABLE_COMPRESSION=true
ENABLE_STATIC_OPTIMIZATION=true
```

## 🏗️ Build Process

### 1. Install Dependencies

```bash
npm ci --production=false
```

### 2. Run Tests

```bash
npm run test
npm run test:e2e
```

### 3. Build Application

```bash
npm run build
```

### 4. Analyze Bundle (Optional)

```bash
npm run analyze
```

## 🗄️ Database Setup

### 1. Database Indexes

The application automatically creates optimized indexes on first connection:

- Product search and filtering indexes
- Sales transaction analytics indexes
- Stock transaction audit indexes
- Cost operation financial indexes
- Notification real-time indexes

### 2. Manual Index Creation

If needed, you can manually create indexes:

```javascript
// Connect to MongoDB and run:
db.products.createIndex({ name: "text" });
db.products.createIndex({ groupId: 1, type: 1 });
db.salestransactions.createIndex({ createdAt: -1, paymentMethod: 1 });
```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t restaurant-erp .
docker run -p 3000:3000 --env-file .env.production restaurant-erp
```

### Option 3: Traditional Server

```bash
# On your server
git clone <your-repo>
cd restaurant-erp
npm ci --production=false
npm run build
npm start
```

## 📊 Performance Monitoring

### 1. Built-in Monitoring

Access monitoring endpoints:

- Health check: `GET /api/health`
- System monitoring: `GET /api/system/monitoring`
- Performance metrics: `GET /api/system/monitoring?type=performance`
- Error logs: `GET /api/system/monitoring?type=errors`
- Cache statistics: `GET /api/system/monitoring?type=cache`

### 2. External Monitoring

Configure external monitoring services:

```bash
# Sentry for error tracking
SENTRY_DSN=your-sentry-dsn

# Custom monitoring webhook
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

## 🔧 Performance Optimizations

### 1. Database Optimizations

- ✅ Optimized connection pooling
- ✅ Automatic index creation
- ✅ Query performance monitoring
- ✅ Aggregation pipeline optimization

### 2. API Optimizations

- ✅ Response caching with TTL
- ✅ Rate limiting by endpoint
- ✅ Compression enabled
- ✅ Error monitoring and logging

### 3. Frontend Optimizations

- ✅ Code splitting and lazy loading
- ✅ Bundle size optimization
- ✅ Image optimization
- ✅ Static asset caching

### 4. Caching Strategy

```typescript
// Cache TTL by endpoint
dashboard: 60 seconds
productGroups: 5 minutes
analytics: 2 minutes
stockLevels: 30 seconds
notifications: 15 seconds
```

## 🔒 Security Configuration

### 1. Security Headers

Configured in `next.config.ts`:

- Content Security Policy
- HSTS headers
- CORS configuration
- Compression settings

### 2. Rate Limiting

Different limits by endpoint type:

- API endpoints: 100 requests/15 minutes
- Authentication: 10 requests/15 minutes
- Sales: 50 requests/5 minutes
- Analytics: 30 requests/minute

### 3. Environment Security

- Use strong secrets (minimum 32 characters)
- Enable HTTPS in production
- Configure proper CORS origins
- Use environment-specific database URLs

## 📈 Scaling Considerations

### 1. Database Scaling

- Use MongoDB Atlas for automatic scaling
- Configure read replicas for analytics queries
- Implement database sharding for large datasets

### 2. Application Scaling

- Use horizontal scaling with load balancers
- Implement Redis for distributed caching
- Consider CDN for static assets

### 3. Monitoring Scaling

- Set up alerts for performance thresholds
- Monitor memory and CPU usage
- Track database query performance

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Check MongoDB URI format
   # Verify network access
   # Check authentication credentials
   ```

2. **Build Failures**

   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

3. **Performance Issues**

   ```bash
   # Check monitoring endpoint
   curl https://your-domain.com/api/system/monitoring

   # Analyze bundle size
   npm run analyze
   ```

4. **Memory Issues**

   ```bash
   # Monitor memory usage
   curl https://your-domain.com/api/health

   # Check for memory leaks in logs
   ```

### Health Checks

The application provides comprehensive health checks:

```bash
# Basic health check
curl https://your-domain.com/api/health

# Detailed monitoring
curl https://your-domain.com/api/system/monitoring?type=all
```

## 📝 Maintenance

### Regular Tasks

1. **Monitor Performance**

   - Check response times weekly
   - Review error logs daily
   - Monitor cache hit rates

2. **Database Maintenance**

   - Review slow queries monthly
   - Update indexes as needed
   - Clean up old audit logs

3. **Security Updates**
   - Update dependencies monthly
   - Review security headers quarterly
   - Rotate secrets annually

### Backup Strategy

1. **Database Backups**

   - Daily automated backups
   - Weekly full backups
   - Monthly backup testing

2. **Application Backups**
   - Git repository backups
   - Environment configuration backups
   - Documentation backups

## 📞 Support

For production issues:

1. Check health endpoints first
2. Review error monitoring logs
3. Check database connection status
4. Verify environment variables
5. Review recent deployments

Remember to never expose sensitive information in logs or error messages in production.
