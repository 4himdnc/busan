const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Church = require('../models/Church');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');

const router = express.Router();

// 교회 목록 조회 (필터링 및 검색 지원)
router.get('/', optionalAuth, [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('city').optional().isIn([
        'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
        'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
        'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
        'gyeongbuk', 'gyeongnam', 'jeju'
    ]),
    query('language').optional().isIn([
        'korean', 'english', 'tagalog', 'vietnamese', 'thai',
        'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
        'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
        'mongolian', 'chinese', 'japanese'
    ]),
    query('nationality').optional().isIn([
        'philippines', 'vietnam', 'thailand', 'indonesia', 'myanmar',
        'cambodia', 'laos', 'bangladesh', 'pakistan', 'nepal',
        'sri_lanka', 'uzbekistan', 'kazakhstan', 'mongolia',
        'china', 'japan', 'usa', 'canada', 'australia'
    ]),
    query('denomination').optional().isIn([
        'presbyterian', 'methodist', 'baptist', 'pentecostal',
        'lutheran', 'anglican', 'catholic', 'orthodox',
        'assemblies_of_god', 'full_gospel', 'others'
    ]),
    query('hasService').optional().isIn([
        'translation', 'legal_assistance', 'medical_support',
        'job_placement', 'korean_class', 'cultural_orientation',
        'emergency_support', 'housing_assistance', 'childcare',
        'counseling', 'visa_support', 'document_help'
    ]),
    query('latitude').optional().isFloat({ min: -90, max: 90 }),
    query('longitude').optional().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 1, max: 50000 }).toInt(),
    query('search').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '잘못된 쿼리 파라미터입니다.',
                code: 'INVALID_QUERY_PARAMS',
                details: errors.array()
            });
        }

        const {
            page = 1,
            limit = 20,
            city,
            language,
            nationality,
            denomination,
            hasService,
            latitude,
            longitude,
            radius = 10000, // 기본 10km
            search,
            sort = '-averageRating'
        } = req.query;

        // 기본 필터 조건
        const filter = {
            isActive: true,
            isVerified: true
        };

        // 도시 필터
        if (city) {
            filter['address.city'] = city;
        }

        // 언어 필터
        if (language) {
            filter.supportedLanguages = language;
        }

        // 국적 필터
        if (nationality) {
            filter.supportedNationalities = { $in: [nationality, 'all'] };
        }

        // 교단 필터
        if (denomination) {
            filter.denomination = denomination;
        }

        // 서비스 필터
        if (hasService) {
            filter['immigrantServices.type'] = hasService;
        }

        // 검색어 필터
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'nameTranslations.english': { $regex: search, $options: 'i' } },
                { 'nameTranslations.korean': { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'address.fullAddress': { $regex: search, $options: 'i' } }
            ];
        }

        let query = Church.find(filter);

        // 지리적 검색
        if (latitude && longitude) {
            query = Church.find({
                ...filter,
                'address.coordinates': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(longitude), parseFloat(latitude)]
                        },
                        $maxDistance: radius
                    }
                }
            });
        }

        // 정렬
        let sortOptions = {};
        switch (sort) {
            case 'name':
                sortOptions = { name: 1 };
                break;
            case '-name':
                sortOptions = { name: -1 };
                break;
            case 'rating':
                sortOptions = { averageRating: 1 };
                break;
            case '-rating':
                sortOptions = { averageRating: -1 };
                break;
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            default:
                sortOptions = { averageRating: -1, reviewCount: -1 };
        }

        query = query.sort(sortOptions);

        // 페이지네이션
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        // 인구 필드 선택
        query = query.populate('registeredBy', 'name email');

        const churches = await query.exec();
        const total = await Church.countDocuments(filter);

        res.json({
            churches,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: {
                city,
                language,
                nationality,
                denomination,
                hasService,
                search
            }
        });

    } catch (error) {
        console.error('교회 목록 조회 오류:', error);
        res.status(500).json({
            error: '교회 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'CHURCH_LIST_ERROR'
        });
    }
});

// 특정 교회 정보 조회
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const church = await Church.findById(req.params.id)
            .populate('registeredBy', 'name email')
            .exec();

        if (!church) {
            return res.status(404).json({
                error: '교회를 찾을 수 없습니다.',
                code: 'CHURCH_NOT_FOUND'
            });
        }

        // 비활성화되거나 미인증된 교회는 관리자만 볼 수 있음
        if ((!church.isActive || !church.isVerified) && 
            (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({
                error: '교회를 찾을 수 없습니다.',
                code: 'CHURCH_NOT_FOUND'
            });
        }

        res.json({ church });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: '유효하지 않은 교회 ID입니다.',
                code: 'INVALID_CHURCH_ID'
            });
        }

        console.error('교회 정보 조회 오류:', error);
        res.status(500).json({
            error: '교회 정보를 가져오는 중 오류가 발생했습니다.',
            code: 'CHURCH_DETAIL_ERROR'
        });
    }
});

// 새 교회 등록
router.post('/', authenticate, [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('교회명은 2-100자 사이여야 합니다.'),
    body('contact.phone').isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력해주세요.'),
    body('contact.email').optional().isEmail().normalizeEmail(),
    body('address.fullAddress').isLength({ min: 5, max: 200 }).withMessage('주소를 정확히 입력해주세요.'),
    body('address.city').isIn([
        'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
        'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
        'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
        'gyeongbuk', 'gyeongnam', 'jeju'
    ]).withMessage('유효한 도시를 선택해주세요.'),
    body('address.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('유효한 위도를 입력해주세요.'),
    body('address.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('유효한 경도를 입력해주세요.'),
    body('supportedLanguages').isArray({ min: 1 }).withMessage('최소 하나의 지원 언어를 선택해주세요.'),
    body('services').isArray({ min: 1 }).withMessage('최소 하나의 예배 시간을 등록해주세요.')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '입력 데이터가 올바르지 않습니다.',
                code: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const churchData = {
            ...req.body,
            registeredBy: req.user._id,
            isVerified: false // 관리자 승인 필요
        };

        const church = new Church(churchData);
        await church.save();

        res.status(201).json({
            message: '교회가 성공적으로 등록되었습니다. 관리자 승인 후 표시됩니다.',
            church: {
                id: church._id,
                name: church.name,
                address: church.address,
                status: 'pending_approval'
            }
        });

    } catch (error) {
        console.error('교회 등록 오류:', error);
        res.status(500).json({
            error: '교회 등록 중 오류가 발생했습니다.',
            code: 'CHURCH_CREATION_ERROR'
        });
    }
});

// 교회 정보 수정
router.put('/:id', authenticate, async (req, res) => {
    try {
        const church = await Church.findById(req.params.id);

        if (!church) {
            return res.status(404).json({
                error: '교회를 찾을 수 없습니다.',
                code: 'CHURCH_NOT_FOUND'
            });
        }

        // 권한 확인 (등록자 또는 관리자만 수정 가능)
        if (church.registeredBy.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                error: '교회 정보를 수정할 권한이 없습니다.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // 수정 시 재검증 필요
        if (req.user.role !== 'admin') {
            req.body.isVerified = false;
        }

        const updatedChurch = await Church.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('registeredBy', 'name email');

        res.json({
            message: '교회 정보가 수정되었습니다.',
            church: updatedChurch
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: '유효하지 않은 교회 ID입니다.',
                code: 'INVALID_CHURCH_ID'
            });
        }

        console.error('교회 정보 수정 오류:', error);
        res.status(500).json({
            error: '교회 정보 수정 중 오류가 발생했습니다.',
            code: 'CHURCH_UPDATE_ERROR'
        });
    }
});

// 교회 삭제 (소프트 삭제)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const church = await Church.findById(req.params.id);

        if (!church) {
            return res.status(404).json({
                error: '교회를 찾을 수 없습니다.',
                code: 'CHURCH_NOT_FOUND'
            });
        }

        // 권한 확인 (등록자 또는 관리자만 삭제 가능)
        if (church.registeredBy.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                error: '교회를 삭제할 권한이 없습니다.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // 소프트 삭제
        church.isActive = false;
        await church.save();

        res.json({
            message: '교회가 삭제되었습니다.',
            code: 'CHURCH_DELETED'
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: '유효하지 않은 교회 ID입니다.',
                code: 'INVALID_CHURCH_ID'
            });
        }

        console.error('교회 삭제 오류:', error);
        res.status(500).json({
            error: '교회 삭제 중 오류가 발생했습니다.',
            code: 'CHURCH_DELETE_ERROR'
        });
    }
});

// 교회 승인 (관리자 전용)
router.patch('/:id/verify', authenticate, authorize('admin'), async (req, res) => {
    try {
        const church = await Church.findByIdAndUpdate(
            req.params.id,
            { isVerified: true },
            { new: true }
        );

        if (!church) {
            return res.status(404).json({
                error: '교회를 찾을 수 없습니다.',
                code: 'CHURCH_NOT_FOUND'
            });
        }

        res.json({
            message: '교회가 승인되었습니다.',
            church
        });

    } catch (error) {
        console.error('교회 승인 오류:', error);
        res.status(500).json({
            error: '교회 승인 중 오류가 발생했습니다.',
            code: 'CHURCH_VERIFICATION_ERROR'
        });
    }
});

// 주변 교회 찾기
router.get('/nearby/:latitude/:longitude', optionalAuth, [
    query('radius').optional().isInt({ min: 1, max: 50000 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
], async (req, res) => {
    try {
        const { latitude, longitude } = req.params;
        const { radius = 10000, limit = 10 } = req.query;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({
                error: '유효하지 않은 좌표입니다.',
                code: 'INVALID_COORDINATES'
            });
        }

        const nearbyChurches = await Church.find({
            isActive: true,
            isVerified: true,
            'address.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: radius
                }
            }
        })
        .limit(limit)
        .select('name address contact supportedLanguages averageRating reviewCount')
        .exec();

        res.json({
            churches: nearbyChurches,
            center: { latitude: lat, longitude: lng },
            radius,
            count: nearbyChurches.length
        });

    } catch (error) {
        console.error('주변 교회 검색 오류:', error);
        res.status(500).json({
            error: '주변 교회 검색 중 오류가 발생했습니다.',
            code: 'NEARBY_SEARCH_ERROR'
        });
    }
});

// 교회 통계 조회 (관리자 전용)
router.get('/admin/statistics', authenticate, authorize('admin'), async (req, res) => {
    try {
        const totalChurches = await Church.countDocuments({ isActive: true });
        const verifiedChurches = await Church.countDocuments({ isActive: true, isVerified: true });
        const pendingChurches = await Church.countDocuments({ isActive: true, isVerified: false });

        const languageStats = await Church.aggregate([
            { $match: { isActive: true, isVerified: true } },
            { $unwind: '$supportedLanguages' },
            { $group: { _id: '$supportedLanguages', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const cityStats = await Church.aggregate([
            { $match: { isActive: true, isVerified: true } },
            { $group: { _id: '$address.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            overview: {
                total: totalChurches,
                verified: verifiedChurches,
                pending: pendingChurches
            },
            languageDistribution: languageStats,
            cityDistribution: cityStats
        });

    } catch (error) {
        console.error('교회 통계 조회 오류:', error);
        res.status(500).json({
            error: '통계 조회 중 오류가 발생했습니다.',
            code: 'STATISTICS_ERROR'
        });
    }
});

module.exports = router; 