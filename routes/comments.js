const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { authenticate, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// 특정 게시글의 댓글 목록 조회
router.get('/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // 게시글 존재 확인
        const post = await Post.findById(postId);
        if (!post || post.status !== 'active') {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        const skip = (page - 1) * limit;
        
        // 최상위 댓글만 조회 (대댓글은 populate로 가져옴)
        const comments = await Comment.find({
            post: postId,
            parentComment: null,
            status: 'active'
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name nationality profileImage')
        .populate({
            path: 'replies',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name nationality profileImage'
            },
            options: { sort: { createdAt: 1 } }
        })
        .exec();

        const total = await Comment.countDocuments({
            post: postId,
            parentComment: null,
            status: 'active'
        });

        res.json({
            comments,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('댓글 목록 조회 오류:', error);
        res.status(500).json({
            error: '댓글 목록을 가져오는 중 오류가 발생했습니다.',
            code: 'COMMENT_LIST_ERROR'
        });
    }
});

// 댓글 작성
router.post('/', authenticate, [
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('댓글 내용은 1-1000자 사이여야 합니다.'),
    body('post').isMongoId().withMessage('유효한 게시글 ID가 필요합니다.'),
    body('parentComment').optional().isMongoId().withMessage('유효한 부모 댓글 ID가 필요합니다.')
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

        const { content, post: postId, parentComment, language, isAnonymous } = req.body;

        // 게시글 존재 확인
        const post = await Post.findById(postId);
        if (!post || post.status !== 'active') {
            return res.status(404).json({
                error: '게시글을 찾을 수 없습니다.',
                code: 'POST_NOT_FOUND'
            });
        }

        let depth = 0;
        
        // 대댓글인 경우 부모 댓글 확인
        if (parentComment) {
            const parent = await Comment.findById(parentComment);
            if (!parent || parent.status !== 'active') {
                return res.status(404).json({
                    error: '부모 댓글을 찾을 수 없습니다.',
                    code: 'PARENT_COMMENT_NOT_FOUND'
                });
            }
            
            depth = parent.depth + 1;
            
            // 최대 깊이 제한
            if (depth > 3) {
                return res.status(400).json({
                    error: '댓글 깊이가 너무 깊습니다.',
                    code: 'MAX_DEPTH_EXCEEDED'
                });
            }
        }

        const commentData = {
            content,
            author: req.user._id,
            post: postId,
            parentComment: parentComment || null,
            depth,
            language: language || 'korean',
            isAnonymous: isAnonymous || false
        };

        const comment = new Comment(commentData);
        await comment.save();

        await comment.populate('author', 'name nationality profileImage');

        res.status(201).json({
            message: '댓글이 작성되었습니다.',
            comment
        });

    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({
            error: '댓글 작성 중 오류가 발생했습니다.',
            code: 'COMMENT_CREATION_ERROR'
        });
    }
});

// 댓글 수정
router.put('/:id', authenticate, checkOwnership(Comment), [
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('댓글 내용은 1-1000자 사이여야 합니다.')
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

        const { content } = req.body;

        const updatedComment = await Comment.findByIdAndUpdate(
            req.params.id,
            {
                content,
                isEdited: true,
                lastEditedAt: new Date(),
                $push: {
                    editHistory: {
                        editedAt: new Date(),
                        reason: req.body.editReason || '내용 수정'
                    }
                }
            },
            { new: true, runValidators: true }
        ).populate('author', 'name nationality profileImage');

        res.json({
            message: '댓글이 수정되었습니다.',
            comment: updatedComment
        });

    } catch (error) {
        console.error('댓글 수정 오류:', error);
        res.status(500).json({
            error: '댓글 수정 중 오류가 발생했습니다.',
            code: 'COMMENT_UPDATE_ERROR'
        });
    }
});

// 댓글 삭제
router.delete('/:id', authenticate, checkOwnership(Comment), async (req, res) => {
    try {
        await Comment.findByIdAndUpdate(req.params.id, {
            status: 'deleted'
        });

        res.json({
            message: '댓글이 삭제되었습니다.',
            code: 'COMMENT_DELETED'
        });

    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({
            error: '댓글 삭제 중 오류가 발생했습니다.',
            code: 'COMMENT_DELETE_ERROR'
        });
    }
});

// 댓글 좋아요/취소
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment || comment.status !== 'active') {
            return res.status(404).json({
                error: '댓글을 찾을 수 없습니다.',
                code: 'COMMENT_NOT_FOUND'
            });
        }

        await comment.toggleLike(req.user._id);

        const isLiked = comment.likes.some(like => 
            like.user.toString() === req.user._id.toString()
        );

        res.json({
            message: isLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
            isLiked,
            likeCount: comment.likeCount
        });

    } catch (error) {
        console.error('댓글 좋아요 처리 오류:', error);
        res.status(500).json({
            error: '좋아요 처리 중 오류가 발생했습니다.',
            code: 'COMMENT_LIKE_ERROR'
        });
    }
});

// 댓글 신고
router.post('/:id/report', authenticate, [
    body('reason').isIn(['spam', 'abuse', 'inappropriate', 'harassment', 'other']).withMessage('유효한 신고 사유를 선택해주세요.'),
    body('description').optional().isLength({ max: 500 }).withMessage('신고 내용은 500자 이하여야 합니다.')
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

        const comment = await Comment.findById(req.params.id);

        if (!comment || comment.status !== 'active') {
            return res.status(404).json({
                error: '댓글을 찾을 수 없습니다.',
                code: 'COMMENT_NOT_FOUND'
            });
        }

        // 자신의 댓글은 신고할 수 없음
        if (comment.author.toString() === req.user._id.toString()) {
            return res.status(400).json({
                error: '자신의 댓글은 신고할 수 없습니다.',
                code: 'CANNOT_REPORT_OWN_COMMENT'
            });
        }

        const { reason, description } = req.body;
        await comment.addReport(req.user._id, reason, description);

        res.json({
            message: '댓글이 신고되었습니다.',
            code: 'COMMENT_REPORTED'
        });

    } catch (error) {
        console.error('댓글 신고 오류:', error);
        res.status(500).json({
            error: '댓글 신고 중 오류가 발생했습니다.',
            code: 'COMMENT_REPORT_ERROR'
        });
    }
});

module.exports = router; 