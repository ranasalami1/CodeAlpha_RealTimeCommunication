from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from firebase_admin import auth as firebase_auth

import realtime.firebase_admin


@login_required
@require_GET
def firebase_token(request):
    token = firebase_auth.create_custom_token(
        str(request.user.id),
        {
            "username": request.user.username
        }
    )

    return JsonResponse({
        "token": token.decode("utf-8")
    })