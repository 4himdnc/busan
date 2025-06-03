const mongoose = require('mongoose');

const churchSchema = new mongoose.Schema({
    // 기본 정보
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameTranslations: {
        english: String,
        korean: String,
        native: String // 해당 교회의 주요 사용 언어로 번역된 이름
    },
    
    // 연락처 정보
    contact: {
        phone: {
            type: String,
            required: true
        },
        email: String,
        website: String,
        kakaoTalk: String,
        facebook: String,
        instagram: String
    },
    
    // 주소 정보
    address: {
        fullAddress: {
            type: String,
            required: true
        },
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
        coordinates: {
            latitude: {
                type: Number,
                required: true
            },
            longitude: {
                type: Number,
                required: true
            }
        }
    },
    
    // 예배 정보
    services: [{
        type: {
            type: String,
            enum: ['main_service', 'evening_service', 'dawn_prayer', 'bible_study', 'special_service'],
            required: true
        },
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
        dayOfWeek: {
            type: String,
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            required: true
        },
        time: {
            type: String,
            required: true // "09:00", "19:30" 형식
        },
        description: String,
        hasTranslation: {
            type: Boolean,
            default: false
        },
        translationLanguages: [{
            type: String,
            enum: [
                'korean', 'english', 'tagalog', 'vietnamese', 'thai',
                'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
                'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
                'mongolian', 'chinese', 'japanese'
            ]
        }]
    }],
    
    // 지원 대상 국가/언어
    supportedNationalities: [{
        type: String,
        enum: [
            'philippines', 'vietnam', 'thailand', 'indonesia', 'myanmar',
            'cambodia', 'laos', 'bangladesh', 'pakistan', 'nepal',
            'sri_lanka', 'uzbekistan', 'kazakhstan', 'mongolia',
            'china', 'japan', 'usa', 'canada', 'australia', 'all'
        ]
    }],
    
    supportedLanguages: [{
        type: String,
        enum: [
            'korean', 'english', 'tagalog', 'vietnamese', 'thai',
            'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
            'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
            'mongolian', 'chinese', 'japanese'
        ]
    }],
    
    // 교회 특성
    denomination: {
        type: String,
        enum: [
            'presbyterian', 'methodist', 'baptist', 'pentecostal',
            'lutheran', 'anglican', 'catholic', 'orthodox',
            'assemblies_of_god', 'full_gospel', 'others'
        ]
    },
    
    size: {
        type: String,
        enum: ['small', 'medium', 'large', 'mega'],
        default: 'medium'
    },
    
    // 이주민 지원 서비스
    immigrantServices: [{
        type: {
            type: String,
            enum: [
                'translation', 'legal_assistance', 'medical_support',
                'job_placement', 'korean_class', 'cultural_orientation',
                'emergency_support', 'housing_assistance', 'childcare',
                'counseling', 'visa_support', 'document_help'
            ]
        },
        description: String,
        contactPerson: String,
        contactPhone: String,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    
    // 시설 정보
    facilities: [{
        type: String,
        enum: [
            'parking', 'wheelchair_access', 'nursery', 'cafe',
            'library', 'meeting_rooms', 'kitchen', 'playground',
            'computer_room', 'prayer_room', 'rest_area'
        ]
    }],
    
    // 목회진 정보
    pastors: [{
        name: String,
        position: {
            type: String,
            enum: ['senior_pastor', 'associate_pastor', 'youth_pastor', 'immigrant_ministry']
        },
        languages: [{
            type: String,
            enum: [
                'korean', 'english', 'tagalog', 'vietnamese', 'thai',
                'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
                'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
                'mongolian', 'chinese', 'japanese'
            ]
        }],
        phone: String,
        email: String
    }],
    
    // 상태 정보
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    // 통계
    memberCount: {
        type: Number,
        default: 0
    },
    immigrantMemberCount: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    
    // 이미지
    images: [{
        url: String,
        description: String,
        type: {
            type: String,
            enum: ['exterior', 'interior', 'service', 'activity'],
            default: 'exterior'
        }
    }],
    
    // 추가 정보
    description: String,
    specialPrograms: String,
    transportation: String, // 교통편 안내
    
    // 등록 정보
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    registeredDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 인덱스 설정
churchSchema.index({ 'address.city': 1 });
churchSchema.index({ 'address.coordinates': '2dsphere' });
churchSchema.index({ supportedNationalities: 1 });
churchSchema.index({ supportedLanguages: 1 });
churchSchema.index({ 'services.language': 1 });
churchSchema.index({ isActive: 1, isVerified: 1 });
churchSchema.index({ averageRating: -1 });

// 가까운 교회 찾기 메서드
churchSchema.methods.findNearby = function(latitude, longitude, maxDistance = 10000) {
    return this.constructor.find({
        'address.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistance
            }
        },
        isActive: true,
        isVerified: true
    });
};

// 평점 업데이트 메서드
churchSchema.methods.updateRating = async function() {
    const Review = mongoose.model('Review');
    const stats = await Review.aggregate([
        { $match: { church: this._id } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);
    
    if (stats.length > 0) {
        this.averageRating = Math.round(stats[0].averageRating * 10) / 10;
        this.reviewCount = stats[0].reviewCount;
    } else {
        this.averageRating = 0;
        this.reviewCount = 0;
    }
    
    await this.save();
};

module.exports = mongoose.model('Church', churchSchema); 