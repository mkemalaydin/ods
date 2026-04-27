from django.contrib import admin
from django.urls import path
from ods_app import views # views dosyamızı ekledik

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.ogrenci_giris, name='ogrenci_giris'),
    path('sinavlar/', views.sinav_listesi, name='sinav_listesi'),
    path('sinav/<int:sinav_id>/', views.sinav_katil, name='sinav_katil'),
    path('cikis/', views.cikis, name='cikis'),
]