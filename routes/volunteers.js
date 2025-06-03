const express = require('express');
const { body, validationResult } = require('express-validator');
const Volunteer = require('../models/Volunteer');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 봉사자 신청
router.post('/apply', authenticate, [
    body('personalInfo.name').trim().isLength({ min: 2 }).withMessage('이름을 정확히 입력해주세요.'),
    body('personalInfo.email').isEmail().normalizeEmail(),
    body('personalInfo.phone').isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력해주세요.'),
    body('personalInfo.age').isInt({ min: 18, max: 80 }).withMessage('나이는 18-80세 사이여야 합니다.'),
    body('personalInfo.gender').isIn(['male', 'female', 'other']).withMessage('성별을 선택해주세요.'),
    body('address.city').isIn([
        'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
        'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
        'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
        'gyeongbuk', 'gyeongnam', 'jeju'
    ]).withMessage('거주 지역을 선택해주세요.'),
    body('languages').isArray({ min: 1 }).withMessage('최소 하나의 언어 능력을 입력해주세요.'),
    body('preferredServices').isArray({ min: 1 }).withMessage('최소 하나의 봉사 분야를 선택해주세요.'),
    body('motivation').isLength({ min: 50, max: 1000 }).withMessage('봉사 동기를 50-1000자로 작성해주세요.')
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

        // 이미 신청한 사용자인지 확인
        const existingApplication = await Volunteer.findOne({
            applicant: req.user._id,
            status: { $in: ['pending', 'under_review', 'interview_scheduled', 'approved'] }
        });

        if (existingApplication) {
            return res.status(400).json({
                error: '이미 봉사자 신청을 하셨습니다.',
                code: 'APPLICATION_EXISTS',
                currentStatus: existingApplication.status
            });
        }

        const volunteerData = {
            ...req.body,
            applicant: req.user._id
        };

        const volunteer = new Volunteer(volunteerData);
        await volunteer.save();

        res.status(201).json({
            message: '봉사자 신청이 완료되었습니다. 검토 후 연락드리겠습니다.',
            application: {
                id: volunteer._id,
                status: volunteer.status,
                submittedAt: volunteer.createdAt
            }
        });

    } catch (error) {
        console.error('봉사자 신청 오류:', error);
        res.status(500).json({
            error: '봉사자 신청 중 오류가 발생했습니다.',
            code: 'APPLICATION_ERROR'
        });
    }
});

// 내 봉사자 신청 현황 조회
router.get('/my-application', authenticate, async (req, res) => {
    try {
        const application = await Volunteer.findOne({
            applicant: req.user._id
        }).sort({ createdAt: -1 });

        if (!application) {
            return res.status(404).json({
                error: '봉사자 신청 내역이 없습니다.',
                code: 'NO_APPLICATION_FOUND'
            });
        }

        res.json({
            application: {
                id: application._id,
                status: application.status,
                submittedAt: application.createdAt,
                reviewProcess: application.reviewProcess,
                approvedInfo: application.approvedInfo,
                volunteerRecord: application.volunteerRecord
            }
        });

    } catch (error) {
        console.error('신청 현황 조회 오류:', error);
        res.status(500).json({
            error: '신청 현황을 가져오는 중 오류가 발생했습니다.',
            code: 'APPLICATION_STATUS_ERROR'
        });
    }
});

// 봉사자 신청 목록 조회 (관리자 전용)
router.get('/applications', authenticate, authorize('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            city,
            service,
            language,
            sort = '-createdAt'
        } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (city) {
            filter['address.city'] = city;
        }

        if (service) {
            filter.preferredServices = service;
        }

        if (language) {
            filter['languages.language'] = language;
        }

        const skip = (page - 1) * limit;
        const applications = await Volunteer.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('applicant', 'name email nationality')
            .exec();

        const total = await Volunteer.countDocuments(filter);

        res.json({
            applications,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            },
            summary: {
                pending: await Volunteer.countDocuments({ status: 'pending' }),
                underReview: await Volunteer.countDocuments({ status: 'under_review' }),
                approved: await Volunteer.countDocuments({ status: 'approved' }),
                rejected: await Volunteer.countDocuments({ status: 'rejected' })
            }
        });

    } catch (error) {
        console.error('신청 목록 조회 오류:', error);
        res.status(500).json({
            error: '신청 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'APPLICATION_LIST_ERROR'
        });
    }
});

// 특정 봉사자 신청 상세 조회 (관리자 전용)
router.get('/applications/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const application = await Volunteer.findById(req.params.id)
            .populate('applicant', 'name email nationality nativeLanguage region')
            .populate('reviewProcess.reviewer', 'name email')
            .populate('approvedInfo.assignedCoordinator', 'name email')
            .exec();

        if (!application) {
            return res.status(404).json({
                error: '신청서를 찾을 수 없습니다.',
                code: 'APPLICATION_NOT_FOUND'
            });
        }

        res.json({ application });

    } catch (error) {
        console.error('신청서 상세 조회 오류:', error);
        res.status(500).json({
            error: '신청서 정보를 가져오는 중 오류가 발생했습니다.',
            code: 'APPLICATION_DETAIL_ERROR'
        });
    }
});

// 봉사자 신청 상태 변경 (관리자 전용)
router.put('/applications/:id/status', authenticate, authorize('admin'), [
    body('status').isIn(['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'on_hold']),
    body('reviewNotes').optional().isLength({ max: 1000 })
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

        const { status, reviewNotes, interviewDate, assignedCoordinator } = req.body;

        const updateData = {
            status,
            'reviewProcess.reviewer': req.user._id,
            'reviewProcess.reviewDate': new Date(),
            'reviewProcess.reviewNotes': reviewNotes
        };

        // 면접 일정이 있는 경우
        if (interviewDate) {
            updateData['reviewProcess.interviewDate'] = new Date(interviewDate);
        }

        // 승인된 경우
        if (status === 'approved') {
            updateData['approvedInfo.approvedDate'] = new Date();
            updateData['approvedInfo.assignedCoordinator'] = assignedCoordinator;
            updateData['isActive'] = true;
        }

        const application = await Volunteer.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('applicant', 'name email');

        if (!application) {
            return res.status(404).json({
                error: '신청서를 찾을 수 없습니다.',
                code: 'APPLICATION_NOT_FOUND'
            });
        }

        res.json({
            message: `신청 상태가 ${status}로 변경되었습니다.`,
            application
        });

    } catch (error) {
        console.error('상태 변경 오류:', error);
        res.status(500).json({
            error: '상태 변경 중 오류가 발생했습니다.',
            code: 'STATUS_UPDATE_ERROR'
        });
    }
});

// 활동 중인 봉사자 목록 (관리자 전용)
router.get('/active', authenticate, authorize('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            city,
            service,
            language,
            sort = '-volunteerRecord.totalHours'
        } = req.query;

        const filter = {
            status: 'approved',
            isActive: true
        };

        if (city) {
            filter['address.city'] = city;
        }

        if (service) {
            filter.preferredServices = service;
        }

        if (language) {
            filter['languages.language'] = language;
        }

        const skip = (page - 1) * limit;
        const volunteers = await Volunteer.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('applicant', 'name email nationality profileImage')
            .select('personalInfo address languages preferredServices volunteerRecord approvedInfo')
            .exec();

        const total = await Volunteer.countDocuments(filter);

        res.json({
            volunteers,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('활동 봉사자 목록 조회 오류:', error);
        res.status(500).json({
            error: '봉사자 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'ACTIVE_VOLUNTEERS_ERROR'
        });
    }
});

// 봉사 시간 기록 (관리자 전용)
router.post('/:id/hours', authenticate, authorize('admin'), [
    body('hours').isFloat({ min: 0.5, max: 24 }).withMessage('봉사 시간은 0.5-24시간 사이여야 합니다.'),
    body('description').optional().isLength({ max: 500 }).withMessage('활동 설명은 500자 이하여야 합니다.')
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

        const volunteer = await Volunteer.findById(req.params.id);

        if (!volunteer || volunteer.status !== 'approved') {
            return res.status(404).json({
                error: '활동 중인 봉사자를 찾을 수 없습니다.',
                code: 'VOLUNTEER_NOT_FOUND'
            });
        }

        const { hours, description } = req.body;
        await volunteer.addVolunteerHours(hours);

        res.json({
            message: `${hours}시간의 봉사활동이 기록되었습니다.`,
            totalHours: volunteer.volunteerRecord.totalHours,
            activitiesCount: volunteer.volunteerRecord.activitiesCount
        });

    } catch (error) {
        console.error('봉사시간 기록 오류:', error);
        res.status(500).json({
            error: '봉사시간 기록 중 오류가 발생했습니다.',
            code: 'HOURS_RECORD_ERROR'
        });
    }
});

// 봉사자 평가 (서비스 이용자용)
router.post('/:id/feedback', authenticate, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('평점은 1-5점 사이여야 합니다.'),
    body('comment').optional().isLength({ max: 500 }).withMessage('후기는 500자 이하여야 합니다.')
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

        const volunteer = await Volunteer.findById(req.params.id);

        if (!volunteer || volunteer.status !== 'approved') {
            return res.status(404).json({
                error: '봉사자를 찾을 수 없습니다.',
                code: 'VOLUNTEER_NOT_FOUND'
            });
        }

        const { rating, comment } = req.body;
        await volunteer.addFeedback(req.user._id, rating, comment);

        res.json({
            message: '평가가 등록되었습니다.',
            averageRating: volunteer.volunteerRecord.rating
        });

    } catch (error) {
        console.error('봉사자 평가 오류:', error);
        res.status(500).json({
            error: '평가 등록 중 오류가 발생했습니다.',
            code: 'FEEDBACK_ERROR'
        });
    }
});

module.exports = router; 