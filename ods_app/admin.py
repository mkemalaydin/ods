from django.contrib import admin, messages
from django.shortcuts import redirect, render
from django.urls import path
from django.http import HttpResponseRedirect
from .models import Sinav, Soru, Sonuc
import openpyxl
from django import forms

# Soruları sınav sayfasının içinde "satır içi" düzenlemek için
class SoruInline(admin.StackedInline):
    model = Soru
    extra = 1  # Yeni sınav açınca otomatik 1 boş soru gelsin
    fieldsets = (
        (None, {'fields': ('soru_tipi', 'metin', 'puan_degeri')}),
        ('Şıklar ve Cevap Anahtarı', {
            'fields': (
                ('secenek_a', 'secenek_b'),
                ('secenek_c', 'secenek_d'),
                ('secenek_e', 'ek_secenekler'),
                'dogru_cevap',
            )
        }),
    )

class ExcelImportForm(forms.Form):
    excel_file = forms.FileField(label="Excel Dosyası Seçin")

@admin.register(Sinav)
class SinavAdmin(admin.ModelAdmin):
    list_display = ('ad', 'baslangic_tarihi', 'sure', 'aktif')
    list_editable = ('aktif',)  # Panelden aç-kapa yapabilmek için
    list_filter = ('aktif', 'baslangic_tarihi')
    search_fields = ('ad',)
    inlines = [SoruInline]
    actions = ['import_excel']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-excel/', self.admin_site.admin_view(self.import_excel_view), name='import_excel'),
        ]
        return custom_urls + urls

    def import_excel_view(self, request):
        if request.method == 'POST':
            form = ExcelImportForm(request.POST, request.FILES)
            if form.is_valid():
                excel_file = request.FILES['excel_file']
                wb = openpyxl.load_workbook(excel_file)
                sheet = wb.active
                sinav_id = request.GET.get('sinav_id')
                sinav = Sinav.objects.get(id=sinav_id)
                for row in sheet.iter_rows(min_row=2, values_only=True):  # İlk satır başlık
                    if row[0]:  # Soru metni varsa
                        ekstra_secenekler = [value for value in (row[9:] or []) if value]
                        Soru.objects.create(
                            sinav=sinav,
                            soru_tipi=str(row[1]).strip().upper() if row[1] else 'MCQ',
                            metin=row[0],
                            secenek_a=row[2] or '',
                            secenek_b=row[3] or '',
                            secenek_c=row[4] or '',
                            secenek_d=row[5] or '',
                            secenek_e=row[6] or '',
                            ek_secenekler=ekstra_secenekler,
                            dogru_cevap=row[7] or '',
                            puan_degeri=int(row[8]) if row[8] else 10
                        )
                messages.success(request, "Sorular başarıyla yüklendi.")
                return HttpResponseRedirect(f'/admin/ods_app/sinav/{sinav_id}/change/')
        else:
            form = ExcelImportForm()
        return render(request, 'admin/import_excel.html', {'form': form, 'sinav_id': request.GET.get('sinav_id')})

    def import_excel(self, request, queryset):
        if queryset.count() == 1:
            sinav = queryset.first()
            return redirect(f'/admin/ods_app/sinav/import-excel/?sinav_id={sinav.id}')
        else:
            messages.error(request, "Lütfen sadece bir sınav seçin.")
    import_excel.short_description = "Seçili sınava Excel'den soru yükle"

@admin.register(Sonuc)
class SonucAdmin(admin.ModelAdmin):
    list_display = ('ogrenci_no', 'sinav', 'puan', 'tarih')
    readonly_fields = ('tarih',)  # Değiştirilemesin
    list_filter = ('sinav', 'tarih')
    search_fields = ('ogrenci_no',)