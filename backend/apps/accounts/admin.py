from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "phone", "personal_data_consent_at"]
    search_fields = ["user__username", "phone"]
    readonly_fields = ["personal_data_consent_at"]
