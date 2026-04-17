from django.contrib import admin
from .models import Ogrenci, Sinav, Sonuc

# Admin panelinde nelerin görüneceğini özelleştirelim
@admin.register(Ogrenci)
class OgrenciAdmin(admin.ModelAdmin):
    list_display = ('ad', 'soyad', 'ogrenci_no', 'sinif')
    search_fields = ('ad', 'soyad', 'ogrenci_no')

@admin.register(Sinav)
class SinavAdmin(admin.ModelAdmin):
    list_display = ('ad', 'tarih')

@admin.register(Sonuc)
class SonucAdmin(admin.ModelAdmin):
    list_display = ('ogrenci', 'sinif_adi', 'puan')
    list_filter = ('sinif_adi',)
