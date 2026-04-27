from django.db import models

class Sinav(models.Model):
    ad = models.CharField("Sınav Adı", max_length=200)
    aktif = models.BooleanField("Sınav Aktif mi?", default=True)
    baslangic_tarihi = models.DateTimeField("Başlangıç Zamanı")
    sure = models.IntegerField("Süre (Dakika)", default=40)

    class Meta:
        verbose_name = "Sınav"
        verbose_name_plural = "Sınavlar"

    def __str__(self):
        return self.ad

class Soru(models.Model):
    TIPLER = [
        ('MCQ', 'Çoktan Seçmeli'),
        ('FILL', 'Boşluk Doldurma'),
        ('ESSAY', 'Klasik'),
    ]

    sinav = models.ForeignKey(Sinav, on_delete=models.CASCADE, related_name="sorular")
    soru_tipi = models.CharField("Soru Tipi", max_length=10, choices=TIPLER, default='MCQ')
    metin = models.TextField("Soru Metni")
    puan_degeri = models.IntegerField("Soru Puanı", default=10)
    
    secenek_a = models.CharField("A Şıkkı", max_length=255, blank=True)
    secenek_b = models.CharField("B Şıkkı", max_length=255, blank=True)
    secenek_c = models.CharField("C Şıkkı", max_length=255, blank=True)
    secenek_d = models.CharField("D Şıkkı", max_length=255, blank=True)
    secenek_e = models.CharField("E Şıkkı", max_length=255, blank=True)
    ek_secenekler = models.JSONField("Ek Şıklar", blank=True, default=list, help_text="Varsa F, G, H... şeklinde ek seçenekler girin.")

    dogru_cevap = models.CharField(
        "Doğru Cevap", max_length=255, blank=True,
        help_text="MCQ için şık harfi; boşluk doldurma için doğru metin; klasik için isteğe bağlı."
    )

    class Meta:
        verbose_name = "Soru"
        verbose_name_plural = "Sorular"

    def __str__(self):
        return f"Soru: {self.metin[:50]}..."

    @property
    def secenekler(self):
        items = []
        for label, value in [('A', self.secenek_a), ('B', self.secenek_b), ('C', self.secenek_c), ('D', self.secenek_d), ('E', self.secenek_e)]:
            if value:
                items.append((label, value))
        for index, value in enumerate(self.ek_secenekler or []):
            if value:
                label = chr(ord('F') + index)
                items.append((label, value))
        return items

    @property
    def is_mcq(self):
        return self.soru_tipi == 'MCQ'

    @property
    def is_filled(self):
        return self.soru_tipi == 'FILL'

    @property
    def is_essay(self):
        return self.soru_tipi == 'ESSAY'

    def check_answer(self, cevap):
        if self.soru_tipi == 'MCQ':
            return str(cevap).strip().upper() == str(self.dogru_cevap).strip().upper()
        if self.soru_tipi == 'FILL':
            return str(cevap).strip().lower() == str(self.dogru_cevap).strip().lower()
        return False

class Sonuc(models.Model):
    ogrenci_no = models.CharField("Öğrenci Numarası", max_length=20)
    sinav = models.ForeignKey(Sinav, on_delete=models.CASCADE, related_name="sonuclar")
    puan = models.DecimalField("Puan", max_digits=5, decimal_places=2, default=0)
    cevaplar = models.JSONField("Cevaplar", default=dict, blank=True)
    notlar = models.TextField("Notlar", blank=True)
    tarih = models.DateTimeField("Tarih", auto_now_add=True)

    class Meta:
        verbose_name = "Sonuç"
        verbose_name_plural = "Sonuçlar"
        unique_together = ('ogrenci_no', 'sinav')  # Bir öğrenci bir sınava sadece bir kez katılabilir

    def __str__(self):
        return f"{self.ogrenci_no} - {self.sinav} - {self.puan}"