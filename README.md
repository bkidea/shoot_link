# shoot_link
Link to reduce in one shot

## 🚀 URL Shortener MVP

A minimal URL shortener built with Next.js, TypeScript, and Redis.

### Features
- Create short links from long URLs
- Track clicks and referrer information
- Advanced referrer analysis (Slack, KakaoTalk, UTM parameters)
- Mobile-first responsive design

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Edge Runtime
- **Database**: Upstash Redis
- **Deployment**: Vercel

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   PUBLIC_BASE_URL=http://localhost:3000
   ```
4. Run development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

### API Endpoints
- `POST /api/links` - Create short link
- `GET /r/[slug]` - Redirect to original URL
- `GET /api/links/[slug]/stats` - Get link statistics
- `GET /api/click` - Record click manually

### Environment Variables
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token
- `PUBLIC_BASE_URL`: Base URL for your application
