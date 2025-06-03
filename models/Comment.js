const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    // 기본 정보
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    
    // 작성자
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // 관련 게시글
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    
    // 대댓글 지원
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    
    // 댓글 깊이 (0: 원댓글, 1: 대댓글, 2: 대대댓글...)
    depth: {
        type: Number,
        default: 0,
        max: 3 // 최대 3단계까지
    },
    
    // 언어
    language: {
        type: String,
        enum: [
            'korean', 'english', 'tagalog', 'vietnamese', 'thai',
            'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
            'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
            'mongolian', 'chinese', 'japanese', 'mixed'
        ],
        default: 'korean'
    },
    
    // 상태
    status: {
        type: String,
        enum: ['active', 'hidden', 'deleted', 'reported'],
        default: 'active'
    },
    
    // 익명 여부
    isAnonymous: {
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
    
    likeCount: {
        type: Number,
        default: 0
    },
    
    // 신고 관련
    reports: [{
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['spam', 'abuse', 'inappropriate', 'harassment', 'other']
        },
        description: String,
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    reportCount: {
        type: Number,
        default: 0
    },
    
    // 수정 이력
    isEdited: {
        type: Boolean,
        default: false
    },
    
    lastEditedAt: Date,
    
    editHistory: [{
        editedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    
    // 첨부 파일 (이미지만 허용)
    images: [{
        url: String,
        description: String
    }],
    
    // 멘션된 사용자들
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // 하위 댓글 수 (대댓글 개수)
    replyCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// 인덱스 설정
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ createdAt: -1 });

// 가상 필드: 하위 댓글들
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment'
});

// 좋아요 토글 메서드
commentSchema.methods.toggleLike = function(userId) {
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

// 신고 추가 메서드
commentSchema.methods.addReport = function(reportedBy, reason, description) {
    const existingReport = this.reports.find(report => 
        report.reportedBy.toString() === reportedBy.toString()
    );
    
    if (!existingReport) {
        this.reports.push({
            reportedBy,
            reason,
            description
        });
        this.reportCount += 1;
        
        // 신고 수가 5개 이상이면 자동으로 숨김 처리
        if (this.reportCount >= 5) {
            this.status = 'reported';
        }
    }
    
    return this.save();
};

// 하위 댓글 수 업데이트 메서드
commentSchema.methods.updateReplyCount = async function() {
    const count = await this.constructor.countDocuments({
        parentComment: this._id,
        status: 'active'
    });
    this.replyCount = count;
    return this.save();
};

// 게시글의 댓글 수 업데이트를 위한 미들웨어
commentSchema.post('save', async function() {
    if (this.status === 'active') {
        const Post = mongoose.model('Post');
        await Post.findByIdAndUpdate(this.post, {
            $inc: { commentCount: 1 }
        });
        
        // 부모 댓글의 대댓글 수 업데이트
        if (this.parentComment) {
            const parentComment = await this.constructor.findById(this.parentComment);
            if (parentComment) {
                await parentComment.updateReplyCount();
            }
        }
    }
});

commentSchema.post('remove', async function() {
    const Post = mongoose.model('Post');
    await Post.findByIdAndUpdate(this.post, {
        $inc: { commentCount: -1 }
    });
    
    // 부모 댓글의 대댓글 수 업데이트
    if (this.parentComment) {
        const parentComment = await this.constructor.findById(this.parentComment);
        if (parentComment) {
            await parentComment.updateReplyCount();
        }
    }
});

module.exports = mongoose.model('Comment', commentSchema); 