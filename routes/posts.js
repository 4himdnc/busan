const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { authenticate, optionalAuth, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// 게시글 목록 조회
router.get('/', optionalAuth, [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('boardType').optional().isIn([
        'free_board', 'info_sharing', 'qna', 'job_seeking', 'housing',
        'marketplace', 'language_exchange', 'cultural_exchange', 
        'emergency_help', 'notice', 'event'
    ]),
    query('language').optional().isIn([
        'korean', 'english', 'tagalog', 'vietnamese', 'thai',
        'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
        'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
        'mongolian', 'chinese', 'japanese', 'mixed'
    ]),
    query('city').optional().isIn([
        'seoul', 'busan', 'daegu', 'incheon', 'gwangju',
        'daejeon', 'ulsan', 'sejong', 'gyeonggi', 'gangwon',
        'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
        'gyeongbuk', 'gyeongnam', 'jeju', 'all'
    ])
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
            boardType,
            language,
            city,
            nationality,
            search,
            sort = '-createdAt',
            isUrgent,
            isResolved
        } = req.query;

        // 기본 필터 조건
        const filter = {
            status: 'active'
        };

        // 게시판 타입 필터
        if (boardType) {
            filter.boardType = boardType;
        }

        // 언어 필터
        if (language) {
            filter.language = language;
        }

        // 지역 필터
        if (city) {
            filter['region.city'] = city;
        }

        // 국적 필터
        if (nationality) {
            filter.targetNationalities = { $in: [nationality, 'all'] };
        }

        // 긴급 글 필터
        if (isUrgent === 'true') {
            filter.isUrgent = true;
        }

        // 해결 상태 필터 (Q&A, 긴급도움 등에 사용)
        if (isResolved !== undefined) {
            filter.isResolved = isResolved === 'true';
        }

        // 검색어 필터
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // 정렬 설정
        let sortOptions = {};
        switch (sort) {
            case 'title':
                sortOptions = { title: 1 };
                break;
            case '-title':
                sortOptions = { title: -1 };
                break;
            case 'views':
                sortOptions = { viewCount: 1 };
                break;
            case '-views':
                sortOptions = { viewCount: -1 };
                break;
            case 'likes':
                sortOptions = { likeCount: 1 };
                break;
            case '-likes':
                sortOptions = { likeCount: -1 };
                break;
            case 'comments':
                sortOptions = { commentCount: 1 };
                break;
            case '-comments':
                sortOptions = { commentCount: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            default:
                sortOptions = { isPinned: -1, isUrgent: -1, createdAt: -1 };
        }

        // 쿼리 실행
        const skip = (page - 1) * limit;
        const posts = await Post.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('author', 'name nationality profileImage')
            .select('-content') // 목록에서는 내용 제외
            .exec();

        const total = await Post.countDocuments(filter);

        res.json({
            posts,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: {
                boardType,
                language,
                city,
                nationality,
                search,
                sort
            }
        });

    } catch (error) {
        console.error('게시글 목록 조회 오류:', error);
        res.status(500).json({
            error: '게시글 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'POST_LIST_ERROR'
        });
    }
});

// 특정 게시글 조회
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name nationality profileImage bio')
            .exec();

        if (!post) {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        if (post.status !== 'active') {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        // 조회수 증가 (익명 사용자도 포함)
        await post.incrementViewCount();

        res.json({ post });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: '유효하지 않은 게시글 ID입니다.',
                code: 'INVALID_POST_ID'
            });
        }

        console.error('게시글 조회 오류:', error);
        res.status(500).json({
            error: '게시글을 가져오는 중 오류가 발생했습니다.',
            code: 'POST_DETAIL_ERROR'
        });
    }
});

// 새 게시글 작성
router.post('/', authenticate, [
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('제목은 2-200자 사이여야 합니다.'),
    body('content').trim().isLength({ min: 10, max: 10000 }).withMessage('내용은 10-10000자 사이여야 합니다.'),
    body('boardType').isIn([
        'free_board', 'info_sharing', 'qna', 'job_seeking', 'housing',
        'marketplace', 'language_exchange', 'cultural_exchange', 
        'emergency_help', 'notice', 'event'
    ]).withMessage('유효한 게시판을 선택해주세요.'),
    body('language').isIn([
        'korean', 'english', 'tagalog', 'vietnamese', 'thai',
        'indonesian', 'burmese', 'khmer', 'lao', 'bengali',
        'urdu', 'nepali', 'sinhala', 'uzbek', 'kazakh',
        'mongolian', 'chinese', 'japanese', 'mixed'
    ]).withMessage('언어를 선택해주세요.')
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

        const postData = {
            ...req.body,
            author: req.user._id
        };

        // 공지사항은 관리자만 작성 가능
        if (postData.boardType === 'notice' && req.user.role !== 'admin') {
            return res.status(403).json({
                error: '공지사항은 관리자만 작성할 수 있습니다.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        const post = new Post(postData);
        await post.save();

        // 사용자 게시글 수 증가
        await req.user.updateOne({ $inc: { postCount: 1 } });

        await post.populate('author', 'name nationality profileImage');

        res.status(201).json({
            message: '게시글이 성공적으로 작성되었습니다.',
            post
        });

    } catch (error) {
        console.error('게시글 작성 오류:', error);
        res.status(500).json({
            error: '게시글 작성 중 오류가 발생했습니다.',
            code: 'POST_CREATION_ERROR'
        });
    }
});

// 게시글 수정
router.put('/:id', authenticate, checkOwnership(Post), async (req, res) => {
    try {
        const { title, content, tags, isUrgent } = req.body;
        
        const updateData = {
            title,
            content,
            tags,
            isUrgent,
            lastEditedAt: new Date()
        };

        // 수정 이력 추가
        if (req.resource.editHistory) {
            req.resource.editHistory.push({
                editedAt: new Date(),
                reason: req.body.editReason || '내용 수정'
            });
        }

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'name nationality profileImage');

        res.json({
            message: '게시글이 수정되었습니다.',
            post: updatedPost
        });

    } catch (error) {
        console.error('게시글 수정 오류:', error);
        res.status(500).json({
            error: '게시글 수정 중 오류가 발생했습니다.',
            code: 'POST_UPDATE_ERROR'
        });
    }
});

// 게시글 삭제 (소프트 삭제)
router.delete('/:id', authenticate, checkOwnership(Post), async (req, res) => {
    try {
        await Post.findByIdAndUpdate(req.params.id, { 
            status: 'deleted' 
        });

        // 사용자 게시글 수 감소
        await req.user.updateOne({ $inc: { postCount: -1 } });

        res.json({
            message: '게시글이 삭제되었습니다.',
            code: 'POST_DELETED'
        });

    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        res.status(500).json({
            error: '게시글 삭제 중 오류가 발생했습니다.',
            code: 'POST_DELETE_ERROR'
        });
    }
});

// 게시글 좋아요/취소
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        if (post.status !== 'active') {
            return res.status(400).json({
                error: '이 게시글에는 좋아요를 할 수 없습니다.',
                code: 'POST_NOT_ACTIVE'
            });
        }

        await post.toggleLike(req.user._id);

        const isLiked = post.likes.some(like => 
            like.user.toString() === req.user._id.toString()
        );

        res.json({
            message: isLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
            isLiked,
            likeCount: post.likeCount
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: '유효하지 않은 게시글 ID입니다.',
                code: 'INVALID_POST_ID'
            });
        }

        console.error('좋아요 처리 오류:', error);
        res.status(500).json({
            error: '좋아요 처리 중 오류가 발생했습니다.',
            code: 'LIKE_ERROR'
        });
    }
});

// 게시글 북마크/취소
router.post('/:id/bookmark', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        if (post.status !== 'active') {
            return res.status(400).json({
                error: '이 게시글을 북마크할 수 없습니다.',
                code: 'POST_NOT_ACTIVE'
            });
        }

        await post.toggleBookmark(req.user._id);

        const isBookmarked = post.bookmarks.some(bookmark => 
            bookmark.user.toString() === req.user._id.toString()
        );

        res.json({
            message: isBookmarked ? '북마크에 추가했습니다.' : '북마크에서 제거했습니다.',
            isBookmarked
        });

    } catch (error) {
        console.error('북마크 처리 오류:', error);
        res.status(500).json({
            error: '북마크 처리 중 오류가 발생했습니다.',
            code: 'BOOKMARK_ERROR'
        });
    }
});

// 내가 작성한 게시글 목록
router.get('/my/posts', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const posts = await Post.find({ 
            author: req.user._id,
            status: { $ne: 'deleted' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content')
        .exec();

        const total = await Post.countDocuments({ 
            author: req.user._id,
            status: { $ne: 'deleted' }
        });

        res.json({
            posts,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('내 게시글 조회 오류:', error);
        res.status(500).json({
            error: '게시글 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'MY_POSTS_ERROR'
        });
    }
});

module.exports = router; 