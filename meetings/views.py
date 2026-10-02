from django.shortcuts import render

# Create your views here.
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import RoomForm
from .models import Room


@login_required
def create_room(request):
    if request.method == "POST":
        form = RoomForm(request.POST)

        if form.is_valid():
            room = form.save(commit=False)
            room.created_by = request.user
            room.save()

            return redirect(
                "room",
                code=room.code,
            )
    else:
        form = RoomForm()

    return render(
        request,
        "meetings/create_room.html",
        {"form": form},
    )


@login_required
def join_room(request):
    if request.method == "POST":
        code = request.POST.get("code", "").strip().upper()

        room = get_object_or_404(
            Room,
            code=code,
        )

        return redirect(
            "room",
            code=room.code,
        )

    return render(
        request,
        "meetings/join_room.html",
    )


@login_required
def room_view(request, code):
    room = get_object_or_404(
        Room,
        code=code,
    )

    return render(
        request,
        "meetings/room.html",
        {"room": room},
    )