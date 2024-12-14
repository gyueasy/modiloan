# core/views/comment_views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from ..services.loan_case_service import LoanCaseService
from accounts.permissions import CanManageCase
from core.models import CaseComment
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([CanManageCase])
def comment_view(request, case_id):
    try:
        loan_case = LoanCaseService.get_case_with_related(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            comments = loan_case.comments.all().order_by('created_at')
            return Response({
                'comments': [comment.to_dict() for comment in comments]
            })

        content = request.data.get('content')
        if not content:
            return Response({'error': '댓글 내용을 입력해주세요.'},
                            status=status.HTTP_400_BAD_REQUEST)

        comment = LoanCaseService.add_comment(case_id, content, request.user)
        return Response({
            'message': '댓글이 등록되었습니다.',
            'comment': comment.to_dict()
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error in comment_view: {str(e)}", exc_info=True)
        return Response({'error': '서버 오류가 발생했습니다.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def comment_detail_view(request, case_id, comment_id):
    try:
        comment = CaseComment.objects.get(id=comment_id, loan_case_id=case_id)
        
        # 작성자 또는 관리자 권한 확인
        if comment.writer != request.user and not request.user.is_staff:
            return Response(
                {'error': '댓글을 삭제할 권한이 없습니다.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        comment.delete()
        return Response({'message': '댓글이 삭제되었습니다.'})
    except CaseComment.DoesNotExist:
        return Response(
            {'error': '댓글을 찾을 수 없습니다.'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in comment_detail_view: {str(e)}", exc_info=True)
        return Response({'error': '서버 오류가 발생했습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([CanManageCase])
def mark_comments_as_read(request, case_id):
    try:
        loan_case = LoanCaseService.get_case_with_related(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        count = LoanCaseService.mark_comments_as_read(case_id, request.user)
        return Response({'message': f'{count}개의 댓글을 읽음 처리했습니다.'})
    except ObjectDoesNotExist:
        return Response({'error': '해당 대출 건을 찾을 수 없습니다.'},
                        status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(
            f"Error in mark_comments_as_read: {str(e)}", exc_info=True)
        return Response({'error': '서버 오류가 발생했습니다.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
