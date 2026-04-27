from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from .models import Sinav, Soru, Sonuc
from django.http import HttpResponse

def ogrenci_giris(request):
    if request.method == 'POST':
        ogrenci_no = request.POST.get('ogrenci_no').strip()
        if ogrenci_no:
            request.session['ogrenci_no'] = ogrenci_no
            return redirect('sinav_listesi')
        else:
            messages.error(request, 'Öğrenci numarası giriniz.')
    return render(request, 'ogrenci_giris.html')

def sinav_listesi(request):
    ogrenci_no = request.session.get('ogrenci_no')
    if not ogrenci_no:
        return redirect('ogrenci_giris')
    aktif_sinavlar = Sinav.objects.filter(aktif=True, baslangic_tarihi__lte=timezone.now())
    katildigi_sinavlar = Sonuc.objects.filter(ogrenci_no=ogrenci_no).values_list('sinav_id', flat=True)
    return render(request, 'sinav_listesi.html', {
        'ogrenci_no': ogrenci_no,
        'sinavlar': aktif_sinavlar.exclude(id__in=katildigi_sinavlar)
    })

def sinav_katil(request, sinav_id):
    ogrenci_no = request.session.get('ogrenci_no')
    if not ogrenci_no:
        return redirect('ogrenci_giris')
    sinav = get_object_or_404(Sinav, id=sinav_id, aktif=True)
    
    if timezone.now() > sinav.baslangic_tarihi + timezone.timedelta(minutes=sinav.sure):
        messages.error(request, 'Sınav süresi dolmuş.')
        return redirect('sinav_listesi')
    
    sorular = sinav.sorular.all()
    if request.method == 'POST':
        puan = 0
        cevaplar = {}
        for soru in sorular:
            field_name = f'soru_{soru.id}'
            cevap = request.POST.get(field_name, '').strip()
            cevaplar[field_name] = cevap
            if soru.is_mcq or soru.is_filled:
                if soru.check_answer(cevap):
                    puan += soru.puan_degeri
        notlar = ''
        if any(soru.is_essay for soru in sorular):
            notlar = 'Klasik sorular içeriyor; öğretmen değerlendirecek.'
        Sonuc.objects.create(ogrenci_no=ogrenci_no, sinav=sinav, puan=puan, cevaplar=cevaplar, notlar=notlar)
        messages.success(request, f'Sınav tamamlandı. Puanınız: {puan}')
        return redirect('sinav_listesi')
    
    return render(request, 'sinav_katil.html', {
        'sinav': sinav,
        'sorular': sorular,
        'ogrenci_no': ogrenci_no
    })

def cikis(request):
    request.session.flush()
    return redirect('ogrenci_giris')