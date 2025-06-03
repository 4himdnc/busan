const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 사용자 프로필 수정
router.put('/profile', authenticate, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('이름은 최소 2자 이상이어야 합니다.'),
    body('phone').optional().isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력해주세요.'),
    body('bio').optional().isLength({ max: 500 }).withMessage('자기소개는 500자 이하여야 합니다.'),
    body('interests').optional().isArray(),
    body('koreanLevel').optional().isIn(['beginner', 'elementary', 'intermediate', 'advanced', 'fluent'])
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

        const allowedUpdates = ['name', 'phone', 'bio', 'interests', 'koreanLevel', 'region', 'emergencyContact'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            message: '프로필이 업데이트되었습니다.',
            user
        });

    } catch (error) {
        console.error('프로필 수정 오류:', error);
        res.status(500).json({
            error: '프로필 수정 중 오류가 발생했습니다.',
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
});

// 사용자 목록 조회 (관리자 전용)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            nationality,
            city,
            role,
            isActive,
            search,
            sort = '-createdAt'
        } = req.query;

        const filter = {};

        if (nationality) {
            filter.nationality = nationality;
        }

        if (city) {
            filter['region.city'] = city;
        }

        if (role) {
            filter.role = role;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const users = await User.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-password -emailVerificationToken -passwordResetToken')
            .exec();

        const total = await User.countDocuments(filter);

        res.json({
            users,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            },
            summary: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ isActive: true }),
                verified: await User.countDocuments({ isEmailVerified: true }),
                volunteers: await User.countDocuments({ role: 'volunteer' })
            }
        });

    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({
            error: '사용자 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'USER_LIST_ERROR'
        });
    }
});

// 특정 사용자 조회 (관리자 전용)
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -emailVerificationToken -passwordResetToken');

        if (!user) {
            return res.status(404).json({
                error: '사용자를 찾을 수 없습니다.',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({ user });

    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({
            error: '사용자 정보를 가져오는 중 오류가 발생했습니다.',
            code: 'USER_DETAIL_ERROR'
        });
    }
});

// 사용자 역할 변경 (관리자 전용)
router.put('/:id/role', authenticate, authorize('admin'), [
    body('role').isIn(['user', 'volunteer', 'admin']).withMessage('유효한 역할을 선택해주세요.')
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

        const { role } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                error: '사용자를 찾을 수 없습니다.',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            message: `사용자 역할이 ${role}로 변경되었습니다.`,
            user
        });

    } catch (error) {
        console.error('역할 변경 오류:', error);
        res.status(500).json({
            error: '역할 변경 중 오류가 발생했습니다.',
            code: 'ROLE_UPDATE_ERROR'
        });
    }
});

// 사용자 계정 활성화/비활성화 (관리자 전용)
router.put('/:id/status', authenticate, authorize('admin'), [
    body('isActive').isBoolean().withMessage('활성화 상태는 true/false여야 합니다.')
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

        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                error: '사용자를 찾을 수 없습니다.',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            message: `사용자 계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
            user
        });

    } catch (error) {
        console.error('계정 상태 변경 오류:', error);
        res.status(500).json({
            error: '계정 상태 변경 중 오류가 발생했습니다.',
            code: 'STATUS_UPDATE_ERROR'
        });
    }
});

// 내 활동 내역 조회
router.get('/my/activity', authenticate, async (req, res) => {
    try {
        const Post = require('../models/Post');
        const Comment = require('../models/Comment');
        const Volunteer = require('../models/Volunteer');

        const [posts, comments, volunteerApp] = await Promise.all([
            Post.find({ author: req.user._id, status: { $ne: 'deleted' } })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('title boardType createdAt viewCount likeCount commentCount'),
            Comment.find({ author: req.user._id, status: 'active' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('post', 'title')
                .select('content createdAt likeCount'),
            Volunteer.findOne({ applicant: req.user._id })
                .select('status volunteerRecord')
        ]);

        res.json({
            summary: {
                postsCount: req.user.postCount,
                volunteerHours: req.user.volunteerHours,
                joinedDate: req.user.joinedDate,
                lastLoginDate: req.user.lastLoginDate
            },
            recentPosts: posts,
            recentComments: comments,
            volunteerStatus: volunteerApp
        });

    } catch (error) {
        console.error('활동 내역 조회 오류:', error);
        res.status(500).json({
            error: '활동 내역을 가져오는 중 오류가 발생했습니다.',
            code: 'ACTIVITY_ERROR'
        });
    }
});

module.exports = router; 