const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 로그인 시도 제한
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 5번 시도 제한
    message: {
        error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
        code: 'TOO_MANY_LOGIN_ATTEMPTS'
    },
    skipSuccessfulRequests: true
});

// 회원가입 제한
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1시간
    max: 3, // 3번 가입 시도 제한
    message: {
        error: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.',
        code: 'TOO_MANY_REGISTER_ATTEMPTS'
    }
});

// 회원가입
router.post('/register', registerLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력해주세요.'),
    body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다.'),
    body('name').trim().isLength({ min: 2 }).withMessage('이름은 최소 2자 이상이어야 합니다.'),
    body('nationality').isIn([
        'philippines', 'vietnam', 'thailand', 'indonesia', 'myanmar',
        'cambodia', 'laos', 'bangladesh', 'pakistan', 'nepal',
        'sri_lanka', 'uzbekistan', 'kazakhstan', 'mongolia',
        'china', 'japan', 'usa', 'canada', 'australia', 'others'
    ]).withMessage('유효한 국적을 선택해주세요.'),
    body('nativeLanguage').isIn([
        'korean', 'english', 'tagalog', 'vietnamese', 'thai',
        'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
        'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
        'mongolian', 'chinese', 'japanese', 'others'
    ]).withMessage('유효한 언어를 선택해주세요.'),
    body('phone').isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력해주세요.'),
    body('region.city').isIn([
        'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
        'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
        'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
        'gyeongbuk', 'gyeongnam', 'jeju'
    ]).withMessage('유효한 거주 지역을 선택해주세요.')
], async (req, res) => {
    try {
        // 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '입력 데이터가 올바르지 않습니다.',
                code: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const {
            email,
            password,
            name,
            nationality,
            nativeLanguage,
            koreanLevel,
            phone,
            region,
            emergencyContact,
            interests
        } = req.body;

        // 중복 이메일 확인
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: '이미 등록된 이메일입니다.',
                code: 'EMAIL_ALREADY_EXISTS'
            });
        }

        // 새 사용자 생성
        const user = new User({
            email,
            password,
            name,
            nationality,
            nativeLanguage,
            koreanLevel: koreanLevel || 'beginner',
            phone,
            region,
            emergencyContact,
            interests: interests || []
        });

        await user.save();

        // JWT 토큰 생성
        const token = generateToken(user._id);

        res.status(201).json({
            message: '회원가입이 완료되었습니다.',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                nationality: user.nationality,
                nativeLanguage: user.nativeLanguage,
                region: user.region,
                isEmailVerified: user.isEmailVerified
            },
            token
        });

    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({
            error: '회원가입 중 오류가 발생했습니다.',
            code: 'REGISTRATION_ERROR'
        });
    }
});

// 로그인
router.post('/login', loginLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력해주세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해주세요.')
], async (req, res) => {
    try {
        // 유효성 검사
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '입력 데이터가 올바르지 않습니다.',
                code: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // 사용자 찾기
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                error: '이메일 또는 비밀번호가 올바르지 않습니다.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // 계정 활성화 확인
        if (!user.isActive) {
            return res.status(401).json({
                error: '비활성화된 계정입니다. 관리자에게 문의하세요.',
                code: 'ACCOUNT_DISABLED'
            });
        }

        // 비밀번호 확인
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: '이메일 또는 비밀번호가 올바르지 않습니다.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // 로그인 시간 업데이트
        user.lastLoginDate = new Date();
        await user.save();

        // JWT 토큰 생성
        const token = generateToken(user._id);

        res.json({
            message: '로그인 성공',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                nationality: user.nationality,
                nativeLanguage: user.nativeLanguage,
                region: user.region,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                profileImage: user.profileImage
            },
            token
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({
            error: '로그인 중 오류가 발생했습니다.',
            code: 'LOGIN_ERROR'
        });
    }
});

// 현재 사용자 정보 조회
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                nationality: req.user.nationality,
                nativeLanguage: req.user.nativeLanguage,
                koreanLevel: req.user.koreanLevel,
                region: req.user.region,
                role: req.user.role,
                isEmailVerified: req.user.isEmailVerified,
                profileImage: req.user.profileImage,
                bio: req.user.bio,
                interests: req.user.interests,
                joinedDate: req.user.joinedDate,
                postCount: req.user.postCount,
                volunteerHours: req.user.volunteerHours
            }
        });
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({
            error: '사용자 정보를 가져오는 중 오류가 발생했습니다.',
            code: 'USER_INFO_ERROR'
        });
    }
});

// 비밀번호 재설정 요청
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력해주세요.')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '유효한 이메일을 입력해주세요.',
                code: 'INVALID_EMAIL'
            });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });

        // 보안상 사용자 존재 여부와 관계없이 성공 메시지 반환
        if (user) {
            const resetToken = user.createPasswordResetToken();
            await user.save();

            // 실제로는 이메일 발송 로직이 들어가야 함
            console.log(`비밀번호 재설정 토큰: ${resetToken}`);
        }

        res.json({
            message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
            code: 'PASSWORD_RESET_SENT'
        });

    } catch (error) {
        console.error('비밀번호 재설정 요청 오류:', error);
        res.status(500).json({
            error: '비밀번호 재설정 요청 중 오류가 발생했습니다.',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
});

// 비밀번호 재설정
router.post('/reset-password', [
    body('token').notEmpty().withMessage('재설정 토큰이 필요합니다.'),
    body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다.')
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

        const { token, password } = req.body;

        // 토큰 해시화
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // 토큰과 만료시간 확인
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                error: '유효하지 않거나 만료된 토큰입니다.',
                code: 'INVALID_TOKEN'
            });
        }

        // 비밀번호 업데이트
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({
            message: '비밀번호가 성공적으로 재설정되었습니다.',
            code: 'PASSWORD_RESET_SUCCESS'
        });

    } catch (error) {
        console.error('비밀번호 재설정 오류:', error);
        res.status(500).json({
            error: '비밀번호 재설정 중 오류가 발생했습니다.',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
});

// 비밀번호 변경
router.put('/change-password', authenticate, [
    body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력해주세요.'),
    body('newPassword').isLength({ min: 6 }).withMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
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

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        // 현재 비밀번호 확인
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                error: '현재 비밀번호가 올바르지 않습니다.',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // 새 비밀번호로 업데이트
        user.password = newPassword;
        await user.save();

        res.json({
            message: '비밀번호가 성공적으로 변경되었습니다.',
            code: 'PASSWORD_CHANGED'
        });

    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).json({
            error: '비밀번호 변경 중 오류가 발생했습니다.',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
});

// 토큰 유효성 검사
router.post('/verify-token', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                valid: false,
                error: '토큰이 없습니다.',
                code: 'NO_TOKEN'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                valid: false,
                error: '유효하지 않은 토큰입니다.',
                code: 'INVALID_TOKEN'
            });
        }

        res.json({
            valid: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        res.status(401).json({
            valid: false,
            error: '토큰 검증에 실패했습니다.',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
});

module.exports = router; 