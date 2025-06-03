const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // 기본 정보
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    // 이주민 특성 정보
    nationality: {
        type: String,
        required: true,
        enum: [
            'philippines', 'vietnam', 'thailand', 'indonesia', 'myanmar',
            'cambodia', 'laos', 'bangladesh', 'pakistan', 'nepal',
            'sri_lanka', 'uzbekistan', 'kazakhstan', 'mongolia',
            'china', 'japan', 'usa', 'canada', 'australia', 'others'
        ]
    },
    nativeLanguage: {
        type: String,
        required: true,
        enum: [
            'korean', 'english', 'tagalog', 'vietnamese', 'thai',
            'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
            'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
            'mongolian', 'chinese', 'japanese', 'others'
        ]
    },
    koreanLevel: {
        type: String,
        enum: ['beginner', 'elementary', 'intermediate', 'advanced', 'fluent'],
        default: 'beginner'
    },
    
    // 거주 정보
    region: {
        city: {
            type: String,
            required: true,
            enum: [
                'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
                'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
                'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
                'gyeongbuk', 'gyeongnam', 'jeju'
            ]
        },
        district: String,
        address: String
    },
    
    // 연락처 및 추가 정보
    phone: {
        type: String,
        required: true
    },
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },
    
    // 계정 상태
    role: {
        type: String,
        enum: ['user', 'volunteer', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // 프로필 정보
    profileImage: String,
    bio: String,
    interests: [{
        type: String,
        enum: [
            'church', 'education', 'job', 'medical', 'legal',
            'culture', 'language', 'food', 'travel', 'volunteer'
        ]
    }],
    
    // 서비스 사용 기록
    joinedDate: {
        type: Date,
        default: Date.now
    },
    lastLoginDate: Date,
    
    // 인증 관련
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // 통계
    postCount: {
        type: Number,
        default: 0
    },
    helpRequestCount: {
        type: Number,
        default: 0
    },
    volunteerHours: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.passwordResetToken;
            return ret;
        }
    }
});

// 인덱스 설정
userSchema.index({ email: 1 });
userSchema.index({ 'region.city': 1 });
userSchema.index({ nationality: 1 });
userSchema.index({ nativeLanguage: 1 });

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 이메일 인증 토큰 생성
userSchema.methods.createEmailVerificationToken = function() {
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    return verificationToken;
};

// 비밀번호 재설정 토큰 생성
userSchema.methods.createPasswordResetToken = function() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10분
    
    return resetToken;
};

module.exports = mongoose.model('User', userSchema); 