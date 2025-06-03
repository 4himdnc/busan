const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

// 라우터 가져오기
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const churchRoutes = require('./routes/churches');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const volunteerRoutes = require('./routes/volunteers');
const uploadRoutes = require('./routes/upload');

// Express 앱 생성
const app = express();

// 기본 미들웨어 설정
app.use(helmet()); // 보안 헤더 설정
app.use(compression()); // Gzip 압축
app.use(morgan('combined')); // 로그 기록

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15분
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 요청 제한
    message: {
        error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
app.use('/api/', limiter);

// CORS 설정
app.use(cors({
    origin: function(origin, callback) {
        // 개발 환경에서는 모든 origin 허용
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // 프로덕션에서는 허용된 도메인만
        const allowedOrigins = [
            'https://shalomhouse.kr',
            'https://www.shalomhouse.kr',
            'http://localhost:3000',
            'http://localhost:3001'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 정책에 의해 차단된 요청입니다.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// 기본 HTML 파일 제공
app.use(express.static('.'));

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB 연결 성공');
})
.catch((err) => {
    console.error('❌ MongoDB 연결 실패:', err.message);
    process.exit(1);
});

// 몽고DB 연결 이벤트 리스너
mongoose.connection.on('connected', () => {
    console.log('📊 MongoDB 연결됨');
});

mongoose.connection.on('error', (err) => {
    console.error('💥 MongoDB 오류:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('📴 MongoDB 연결 해제됨');
});

// API 라우터 설정
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/upload', uploadRoutes);

// 기본 라우트 - HTML 파일 제공
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/busan_index.html');
});

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: require('./package.json').version
    });
});

// API 문서 엔드포인트
app.get('/api', (req, res) => {
    res.json({
        message: '샬롬하우스 API 서버',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth - 인증 관련',
            users: '/api/users - 사용자 관리',
            churches: '/api/churches - 교회 정보',
            posts: '/api/posts - 게시글',
            comments: '/api/comments - 댓글',
            volunteers: '/api/volunteers - 봉사자',
            upload: '/api/upload - 파일 업로드'
        },
        documentation: 'API 문서는 개발 중입니다.'
    });
});

// 404 처리
app.use('*', (req, res) => {
    res.status(404).json({
        error: '요청하신 리소스를 찾을 수 없습니다.',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
    console.error('💥 서버 에러:', err);
    
    // MongoDB 중복 키 에러
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            error: `${field} 값이 이미 존재합니다.`,
            code: 'DUPLICATE_FIELD'
        });
    }
    
    // Mongoose 유효성 검사 에러
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            error: '입력 데이터가 올바르지 않습니다.',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }
    
    // JWT 에러
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: '유효하지 않은 토큰입니다.',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: '토큰이 만료되었습니다.',
            code: 'TOKEN_EXPIRED'
        });
    }
    
    // 기본 에러 응답
    res.status(err.status || 500).json({
        error: err.message || '서버 내부 오류가 발생했습니다.',
        code: err.code || 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`🌐 웹사이트: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🎯 환경: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM 신호를 받았습니다. 서버를 종료합니다.');
    server.close(() => {
        console.log('💤 HTTP 서버가 종료되었습니다.');
        mongoose.connection.close(false, () => {
            console.log('📴 MongoDB 연결이 종료되었습니다.');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT 신호를 받았습니다. 서버를 종료합니다.');
    server.close(() => {
        console.log('💤 HTTP 서버가 종료되었습니다.');
        mongoose.connection.close(false, () => {
            console.log('📴 MongoDB 연결이 종료되었습니다.');
            process.exit(0);
        });
    });
});

module.exports = app; 