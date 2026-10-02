from django.contrib import admin
from django.urls import include, path
from accounts import views as account_views
from accounts.firebase_views import firebase_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", account_views.home_view, name="home"),
    path("", include("accounts.urls")),
    path("meetings/", include("meetings.urls")),
    path(
    "firebase-token/",
    firebase_token,
    name="firebase_token"
),
]