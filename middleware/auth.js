const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT 토큰 검증 미들웨어
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: '액세스 토큰이 없습니다.',
                code: 'NO_TOKEN'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                error: '유효하지 않은 토큰입니다.',
                code: 'INVALID_TOKEN'
            });
        }
        
        if (!user.isActive) {
            return res.status(401).json({
                error: '비활성화된 계정입니다.',
                code: 'INACTIVE_ACCOUNT'
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: '토큰이 만료되었습니다.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({
            error: '토큰 인증에 실패했습니다.',
            code: 'AUTH_FAILED'
        });
    }
};

// 선택적 인증 미들웨어 (토큰이 있으면 인증, 없어도 통과)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // 선택적 인증이므로 에러가 있어도 통과
        next();
    }
};

// 권한 확인 미들웨어
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: '인증이 필요합니다.',
                code: 'AUTH_REQUIRED'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: '접근 권한이 없습니다.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        
        next();
    };
};

// 이메일 인증 확인 미들웨어
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: '인증이 필요합니다.',
            code: 'AUTH_REQUIRED'
        });
    }
    
    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            error: '이메일 인증이 필요합니다.',
            code: 'EMAIL_VERIFICATION_REQUIRED'
        });
    }
    
    next();
};

// 자신의 리소스인지 확인하는 미들웨어
const checkOwnership = (Model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const resource = await Model.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    error: '리소스를 찾을 수 없습니다.',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }
            
            // 관리자는 모든 리소스에 접근 가능
            if (req.user.role === 'admin') {
                req.resource = resource;
                return next();
            }
            
            // 작성자 또는 신청자 확인
            const ownerId = resource.author || resource.applicant || resource.user;
            
            if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    error: '이 리소스에 대한 권한이 없습니다.',
                    code: 'ACCESS_DENIED'
                });
            }
            
            req.resource = resource;
            next();
        } catch (error) {
            return res.status(500).json({
                error: '권한 확인 중 오류가 발생했습니다.',
                code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

// JWT 토큰 생성 헬퍼
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// 토큰에서 사용자 ID 추출
const extractUserIdFromToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        return null;
    }
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    requireEmailVerification,
    checkOwnership,
    generateToken,
    extractUserIdFromToken
}; 