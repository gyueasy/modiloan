# accounts/forms.py
from django import forms
from django.contrib.auth.forms import AuthenticationForm

class CustomLoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(
            attrs={
                'class': 'input-primary',
                'placeholder': '아이디를 입력하세요'
            }
        )
    )
    password = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                'class': 'input-primary',
                'placeholder': '비밀번호를 입력하세요'
            }
        )
    )