from django.db import models

# Create your models here.
from django.contrib.auth.models import User
from django.db import models
import uuid


class Room(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=12, unique=True, editable=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_rooms",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = uuid.uuid4().hex[:8].upper()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"