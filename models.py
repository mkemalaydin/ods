from django.db import models

# 1. Öğrenci Bilgileri
class Ogrenci(models.Model):
    ad = models.CharField(max_length=100)
    soyad = models.CharField(max_length=100)
    ogrenci_no = models.CharField(max_length=20, unique=True)
    sinif = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.ad} {self.soyad}"

# 2. Sınav veya Ölçek Tanımı
class Sinav(models.Model):
    ad = models.CharField(max_length=200) 
    tarih = models.DateField()

    def __str__(self):
        return self.ad

# 3. Sonuçlar (Veri Analizi İçin Ana Tablo)
class Sonuc(models.Model):
    ogrenci = models.ForeignKey(Ogrenci, on_delete=models.CASCADE)
    sinav_adi = models.ForeignKey(Sinav, on_delete=models.CASCADE)
    puan = models.DecimalField(max_digits=5, decimal_places=2)
    notlar = models.TextField(blank=True) 

    def __str__(self):
        return f"{self.ogrenci} - {self.sinav_adi}: {self.puan}"
