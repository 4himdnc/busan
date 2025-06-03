const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    // 기본 정보
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 10000
    },
    
    // 작성자 정보
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // 게시판 타입
    boardType: {
        type: String,
        required: true,
        enum: [
            'free_board',           // 자유게시판
            'info_sharing',         // 정보공유
            'qna',                  // Q&A
            'job_seeking',          // 구인구직
            'housing',              // 주거정보
            'marketplace',          // 중고나눔
            'language_exchange',    // 언어교환
            'cultural_exchange',    // 문화교류
            'emergency_help',       // 긴급도움
            'notice',               // 공지사항
            'event'                 // 행사정보
        ]
    },
    
    // 언어 및 대상
    language: {
        type: String,
        required: true,
        enum: [
            'korean', 'english', 'tagalog', 'vietnamese', 'thai',
            'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
            'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
            'mongolian', 'chinese', 'japanese', 'mixed'
        ]
    },
    
    targetNationalities: [{
        type: String,
        enum: [
            'philippines', 'vietnam', 'thailand', 'indonesia', 'myanmar',
            'cambodia', 'laos', 'bangladesh', 'pakistan', 'nepal',
            'sri_lanka', 'uzbekistan', 'kazakhstan', 'mongolia',
            'china', 'japan', 'usa', 'canada', 'australia', 'all'
        ]
    }],
    
    // 지역 정보
    region: {
        city: {
            type: String,
            enum: [
                'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
                'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
                'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
                'gyeongbuk', 'gyeongnam', 'jeju', 'all'
            ]
        },
        district: String
    },
    
    // 게시글 속성
    isUrgent: {
        type: Boolean,
        default: false
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    
    // 첨부 파일
    attachments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String
    }],
    
    // 이미지
    images: [{
        url: String,
        description: String
    }],
    
    // 태그
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    
    // 통계
    viewCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    
    // 상태
    status: {
        type: String,
        enum: ['active', 'closed', 'hidden', 'deleted'],
        default: 'active'
    },
    
    // 해결 상태 (Q&A, 긴급도움 등에 사용)
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // 중고나눔 전용 필드
    marketplace: {
        price: {
            type: Number,
            min: 0
        },
        condition: {
            type: String,
            enum: ['new', 'like_new', 'good', 'fair', 'poor']
        },
        category: {
            type: String,
            enum: [
                'electronics', 'furniture', 'clothing', 'books',
                'kitchen', 'baby_items', 'sports', 'others'
            ]
        },
        isSold: {
            type: Boolean,
            default: false
        },
        soldAt: Date
    },
    
    // 구인구직 전용 필드
    jobPosting: {
        jobType: {
            type: String,
            enum: ['full_time', 'part_time', 'contract', 'freelance']
        },
        industry: String,
        salaryRange: String,
        experienceLevel: {
            type: String,
            enum: ['entry', 'junior', 'senior', 'expert']
        },
        languageRequirements: [{
            type: String,
            enum: [
                'korean', 'english', 'tagalog', 'vietnamese', 'thai',
                'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
                'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
                'mongolian', 'chinese', 'japanese'
            ]
        }],
        deadline: Date,
        contactMethod: {
            type: String,
            enum: ['email', 'phone', 'message', 'kakao']
        }
    },
    
    // 신고 관련
    reportCount: {
        type: Number,
        default: 0
    },
    isReported: {
        type: Boolean,
        default: false
    },
    
    // 추천/비추천
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // 즐겨찾기
    bookmarks: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // 마지막 수정 정보
    lastEditedAt: Date,
    editHistory: [{
        editedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }]
}, {
    timestamps: true
});

// 인덱스 설정
postSchema.index({ boardType: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ 'region.city': 1 });
postSchema.index({ language: 1 });
postSchema.index({ targetNationalities: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ status: 1 });
postSchema.index({ isPinned: -1, createdAt: -1 });
postSchema.index({ isUrgent: -1, createdAt: -1 });
postSchema.index({ 'marketplace.category': 1, 'marketplace.isSold': 1 });
postSchema.index({ title: 'text', content: 'text' });

// 조회수 증가 메서드
postSchema.methods.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
};

// 좋아요 토글 메서드
postSchema.methods.toggleLike = function(userId) {
    const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
    
    if (existingLike) {
        this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
        this.likeCount = Math.max(0, this.likeCount - 1);
    } else {
        this.likes.push({ user: userId });
        this.likeCount += 1;
    }
    
    return this.save();
};

// 북마크 토글 메서드
postSchema.methods.toggleBookmark = function(userId) {
    const existingBookmark = this.bookmarks.find(bookmark => bookmark.user.toString() === userId.toString());
    
    if (existingBookmark) {
        this.bookmarks = this.bookmarks.filter(bookmark => bookmark.user.toString() !== userId.toString());
    } else {
        this.bookmarks.push({ user: userId });
    }
    
    return this.save();
};

// 댓글 수 업데이트 메서드
postSchema.methods.updateCommentCount = async function() {
    const Comment = mongoose.model('Comment');
    const count = await Comment.countDocuments({ post: this._id, status: 'active' });
    this.commentCount = count;
    return this.save();
};

module.exports = mongoose.model('Post', postSchema); 