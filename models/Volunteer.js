const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    // 신청자 정보
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // 기본 정보
    personalInfo: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            required: true,
            min: 18,
            max: 80
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            required: true
        }
    },
    
    // 거주지 정보
    address: {
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
        fullAddress: String
    },
    
    // 언어 능력
    languages: [{
        language: {
            type: String,
            required: true,
            enum: [
                'korean', 'english', 'tagalog', 'vietnamese', 'thai',
                'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
                'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
                'mongolian', 'chinese', 'japanese'
            ]
        },
        proficiency: {
            type: String,
            enum: ['basic', 'intermediate', 'advanced', 'native'],
            required: true
        },
        certification: String // 관련 자격증이 있다면
    }],
    
    // 봉사 희망 분야
    preferredServices: [{
        type: String,
        enum: [
            'translation',          // 번역
            'interpretation',       // 통역
            'legal_assistance',     // 법률 상담
            'medical_support',      // 의료 지원
            'job_placement',        // 취업 지원
            'korean_teaching',      // 한국어 교육
            'cultural_orientation', // 문화 적응
            'emergency_support',    // 긴급 지원
            'housing_assistance',   // 주거 지원
            'childcare',           // 육아 지원
            'counseling',          // 상담
            'visa_support',        // 비자 지원
            'document_help',       // 서류 작성
            'transportation',      // 교통 지원
            'mentoring',           // 멘토링
            'community_events'     // 커뮤니티 행사
        ],
        required: true
    }],
    
    // 전문성 및 경험
    expertise: {
        education: {
            level: {
                type: String,
                enum: ['high_school', 'bachelor', 'master', 'phd'],
                required: true
            },
            field: String,
            institution: String
        },
        profession: {
            current: String,
            experience: Number, // 경력 년수
            industry: String
        },
        certifications: [{
            name: String,
            issuer: String,
            date: Date,
            expiryDate: Date
        }],
        volunteerExperience: [{
            organization: String,
            role: String,
            duration: String,
            description: String
        }]
    },
    
    // 봉사 가능 시간
    availability: {
        daysOfWeek: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        timeSlots: [{
            day: {
                type: String,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            startTime: String, // "09:00" 형식
            endTime: String    // "18:00" 형식
        }],
        preferredDuration: {
            type: String,
            enum: ['1-2_hours', '3-4_hours', '5-8_hours', 'full_day'],
            required: true
        },
        maxHoursPerWeek: {
            type: Number,
            min: 1,
            max: 40
        }
    },
    
    // 동기 및 추가 정보
    motivation: {
        type: String,
        required: true,
        maxlength: 1000
    },
    additionalMessage: {
        type: String,
        maxlength: 500
    },
    
    // 참고인 정보
    references: [{
        name: String,
        relationship: String,
        phone: String,
        email: String
    }],
    
    // 신청 상태
    status: {
        type: String,
        enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'on_hold'],
        default: 'pending'
    },
    
    // 심사 과정
    reviewProcess: {
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewDate: Date,
        reviewNotes: String,
        interviewDate: Date,
        interviewNotes: String,
        backgroundCheckCompleted: {
            type: Boolean,
            default: false
        },
        orientationCompleted: {
            type: Boolean,
            default: false
        }
    },
    
    // 승인 후 정보
    approvedInfo: {
        approvedDate: Date,
        volunteerId: String, // 봉사자 고유 번호
        assignedCoordinator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        startDate: Date,
        trainingCompleted: {
            type: Boolean,
            default: false
        },
        trainingDate: Date
    },
    
    // 봉사 활동 기록
    volunteerRecord: {
        totalHours: {
            type: Number,
            default: 0
        },
        activitiesCount: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        feedback: [{
            fromUser: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comment: String,
            date: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    // 상태 정보
    isActive: {
        type: Boolean,
        default: false
    },
    lastActivityDate: Date,
    
    // 특별 요청사항
    specialRequirements: String,
    hasTransportation: {
        type: Boolean,
        default: false
    },
    
    // 첨부 서류
    documents: [{
        type: {
            type: String,
            enum: ['resume', 'certificate', 'id_copy', 'background_check', 'other']
        },
        filename: String,
        originalName: String,
        url: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// 인덱스 설정
volunteerSchema.index({ applicant: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ 'address.city': 1 });
volunteerSchema.index({ preferredServices: 1 });
volunteerSchema.index({ 'languages.language': 1 });
volunteerSchema.index({ createdAt: -1 });

// 봉사자 ID 자동 생성
volunteerSchema.pre('save', function(next) {
    if (this.status === 'approved' && !this.approvedInfo.volunteerId) {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.approvedInfo.volunteerId = `VL${year}${randomNum}`;
    }
    next();
});

// 평점 업데이트 메서드
volunteerSchema.methods.updateRating = function() {
    if (this.volunteerRecord.feedback.length > 0) {
        const totalRating = this.volunteerRecord.feedback.reduce((sum, feedback) => sum + feedback.rating, 0);
        this.volunteerRecord.rating = Math.round((totalRating / this.volunteerRecord.feedback.length) * 10) / 10;
    }
    return this.save();
};

// 봉사 시간 추가 메서드
volunteerSchema.methods.addVolunteerHours = function(hours) {
    this.volunteerRecord.totalHours += hours;
    this.volunteerRecord.activitiesCount += 1;
    this.lastActivityDate = new Date();
    return this.save();
};

// 피드백 추가 메서드
volunteerSchema.methods.addFeedback = function(fromUser, rating, comment) {
    this.volunteerRecord.feedback.push({
        fromUser,
        rating,
        comment
    });
    return this.updateRating();
};

module.exports = mongoose.model('Volunteer', volunteerSchema); 