# 🎬 DichVideo - Multi-Speaker Video Dubbing SaaS

Tự động dịch và lồng tiếng video với nhiều nhân vật, sử dụng AI để phát hiện và gán giọng nói riêng cho từng người.

## ✨ Tính năng

- 🎯 **Speaker Diarization**: Tự động phát hiện số người nói trong video
- 🗣️ **Multi-Voice TTS**: Gán giọng ElevenLabs riêng cho từng nhân vật
- 🌍 **17+ Ngôn ngữ**: Hỗ trợ dịch đa ngôn ngữ
- ⚡ **Đồng bộ thông minh**: Căn chỉnh audio theo thời gian gốc
- 🎨 **UI Đẹp**: Giao diện hiện đại, dễ sử dụng

## 🏗️ Kiến trúc (Vercel + Supabase + Railway)

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│              Next.js + Realtime subscriptions                │
│                  https://dichvideo.vercel.app                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                       SUPABASE                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │   Storage   │  │     Realtime        │  │
│  │  (Projects, │  │  (Videos)   │  │  (Status updates)   │  │
│  │   Speakers) │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              RAILWAY (Processing Server)                     │
│         FastAPI + PyVideoTrans + FFmpeg + Whisper           │
│              https://dichvideo.up.railway.app               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Guide

### 1. Setup Supabase

1. Tạo project tại [supabase.com](https://supabase.com)
2. Chạy SQL migration trong `frontend/supabase/migrations/001_initial_schema.sql`
3. Tạo Storage bucket tên `videos` (public)
4. Chạy `frontend/supabase/storage_setup.sql`
5. Lấy credentials:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Deploy Processing Server (Railway)

1. Fork repo này
2. Tạo project tại [railway.app](https://railway.app)
3. Connect GitHub repo
4. Chọn thư mục `backend`
5. Thêm environment variables:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJxxx...
   ELEVENLABS_API_KEY=xxx
   WHISPER_MODEL=medium
   ```
6. Deploy và lấy URL (e.g., `https://dichvideo.up.railway.app`)

### 3. Deploy Frontend (Vercel)

1. Import repo vào [vercel.com](https://vercel.com)
2. Chọn thư mục `frontend`
3. Thêm environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   NEXT_PUBLIC_PROCESSING_SERVER_URL=https://dichvideo.up.railway.app
   ```
4. Deploy!

## 📁 Project Structure

```
dichvideo/
├── frontend/                 # Next.js (Vercel)
│   ├── app/
│   │   ├── page.tsx         # Landing + Upload
│   │   └── project/[id]/    # Project management
│   ├── components/
│   ├── lib/
│   │   ├── api.ts           # API functions
│   │   ├── supabase.ts      # Supabase client
│   │   └── database.types.ts
│   ├── supabase/
│   │   └── migrations/      # SQL schemas
│   └── vercel.json
│
├── backend/                  # FastAPI (Railway)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/
│   │   └── services/
│   │       ├── video_processor.py
│   │       ├── supabase_client.py
│   │       └── elevenlabs_service.py
│   ├── Dockerfile
│   └── railway.json
│
└── pyvideotrans/            # Core engine (submodule)
```

## 💰 Chi phí ước tính

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/month | $20/month |
| Supabase | 500MB DB, 1GB Storage | $25/month |
| Railway | $5 credit/month | ~$5-20/month |
| ElevenLabs | 10k chars/month | $5-22/month |

**Chi phí/video 10 phút**: ~$1-3 (chủ yếu ElevenLabs)

## 🔧 Local Development

```bash
# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

## 📝 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_PROCESSING_SERVER_URL=http://localhost:8000
```

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ELEVENLABS_API_KEY=
WHISPER_MODEL=medium
USE_CUDA=false
```

## 📄 License

MIT License

## 🙏 Credits

- [PyVideoTrans](https://github.com/jianchang512/pyvideotrans)
- [ElevenLabs](https://elevenlabs.io/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Railway](https://railway.app/)

---

Made with ❤️ for Vietnamese content creators
