document.addEventListener('DOMContentLoaded', () => {
    // HTML Elementleri
    const cameraStream = document.getElementById('camera-stream');
    const captureBtn = document.getElementById('capture-btn');
    const photoCanvas = document.getElementById('photo-canvas');
    const photoPreview = document.getElementById('photo-preview');
    const publishBtn = document.getElementById('publish-btn');
    const locationDataEl = document.getElementById('location-data');
    const feedList = document.getElementById('feed-list');
    const placeholder = document.querySelector('.feed-item-placeholder');

    // Modal Elementleri
    const modal = document.getElementById('confirmation-modal');
    const modalBody = document.getElementById('modal-body');
    const confirmPublishBtn = document.getElementById('confirm-publish-btn');
    const cancelPublishBtn = document.getElementById('cancel-publish-btn');
    
    // Form Elemanları
    const animalTypeEl = document.getElementById('animal-type');
    const noticeTypeEl = document.getElementById('notice-type');
    const descriptionEl = document.getElementById('description');

    let capturedImageData = null;
    let userLocation = null;
    let map = null;
    let marker = null;

    // 1. HARİTA VE KONUM İŞLEMLERİ
    function initializeMap(coords) {
        // Haritayı sadece bir kez başlat
        if (!map) {
            map = L.map('map').setView([coords.latitude, coords.longitude], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
        // Marker'ı güncelle veya oluştur
        if (marker) {
            marker.setLatLng([coords.latitude, coords.longitude]);
        } else {
            marker = L.marker([coords.latitude, coords.longitude]).addTo(map);
        }
        map.setView([coords.latitude, coords.longitude]);
        marker.bindPopup("<b>Son Görülen Konum</b>").openPopup();
    }

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                locationDataEl.textContent = `Enlem: ${userLocation.latitude.toFixed(4)}, Boylam: ${userLocation.longitude.toFixed(4)}`;
                initializeMap(userLocation);
            }, () => {
                locationDataEl.textContent = 'Konum erişimine izin verilmedi.';
                alert('Lütfen konum erişimine izin verin.');
            });
        } else {
            locationDataEl.textContent = 'Tarayıcınız konum servisini desteklemiyor.';
        }
    }

    // 2. KAMERA İŞLEMLERİ
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraStream.srcObject = stream;
            captureBtn.textContent = "Fotoğraf Çek";
            captureBtn.disabled = false;
        } catch (err) {
            console.error("Kamera hatası:", err);
            alert("Kamera başlatılamadı. Lütfen kamera izni verdiğinizden emin olun.");
            captureBtn.textContent = "Kamera Başlatılamadı";
            captureBtn.disabled = true;
        }
    }

    captureBtn.addEventListener('click', () => {
        if (cameraStream.srcObject) { // Eğer kamera akışı varsa fotoğraf çek
            const context = photoCanvas.getContext('2d');
            photoCanvas.width = cameraStream.videoWidth;
            photoCanvas.height = cameraStream.videoHeight;
            context.drawImage(cameraStream, 0, 0, photoCanvas.width, photoCanvas.height);
            
            capturedImageData = photoCanvas.toDataURL('image/jpeg');
            photoPreview.src = capturedImageData;

            // Görünürlüğü ayarla
            cameraStream.style.display = 'none';
            photoPreview.style.display = 'block';
            captureBtn.textContent = "Yeniden Çek";
            publishBtn.disabled = false; // Fotoğraf çekilince yayınla butonu aktif olsun
        } else { // Fotoğraf çekildiyse, tekrar kamerayı aç
            cameraStream.style.display = 'block';
            photoPreview.style.display = 'none';
            photoPreview.src = '';
            capturedImageData = null;
            publishBtn.disabled = true;
            captureBtn.textContent = "Fotoğraf Çek";
        }
    });

    // 3. BİLDİRİ YAYINLAMA İŞLEMLERİ
    let formData = {};

    publishBtn.addEventListener('click', () => {
        if (!capturedImageData || !userLocation) {
            alert("Lütfen önce fotoğraf çekin ve konumun belirlendiğinden emin olun.");
            return;
        }

        // Form verilerini topla
        formData = {
            photo: capturedImageData,
            location: userLocation,
            animal: animalTypeEl.value,
            type: noticeTypeEl.value,
            description: descriptionEl.value.trim(),
            time: new Date()
        };

        // Modal içeriğini doldur
        modalBody.innerHTML = `
            <img src="${formData.photo}" alt="Onay Fotoğrafı">
            <p><strong>Durum:</strong> ${formData.type} (${formData.animal})</p>
            <p><strong>Konum:</strong> ${formData.location.latitude.toFixed(4)}, ${formData.location.longitude.toFixed(4)}</p>
            <p><strong>Açıklama:</strong> ${formData.description || 'Yok'}</p>
        `;

        // Modalı göster
        modal.style.display = 'flex';
    });

    cancelPublishBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    confirmPublishBtn.addEventListener('click', () => {
        // Placeholder'ı kaldır
        if (placeholder) {
            placeholder.remove();
        }

        // Yeni bildiri kartı oluştur
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        
        const timeString = formData.time.toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        feedItem.innerHTML = `
            <img src="${formData.photo}" alt="${formData.animal} ${formData.type}">
            <h4>${formData.type} - ${formData.animal}</h4>
            <p><strong>Görülme Zamanı:</strong> ${timeString}</p>
            <p><strong>Konum:</strong> ${formData.location.latitude.toFixed(4)}, ${formData.location.longitude.toFixed(4)}</p>
            <p>${formData.description || ''}</p>
        `;

        // Listeye en başa ekle
        feedList.prepend(feedItem);

        // Formu ve durumu sıfırla
        resetForm();
        modal.style.display = 'none';
    });

    function resetForm() {
        descriptionEl.value = '';
        cameraStream.style.display = 'block';
        photoPreview.style.display = 'none';
        photoPreview.src = '';
        capturedImageData = null;
        publishBtn.disabled = true;
        captureBtn.textContent = "Fotoğraf Çek";
    }

    // Uygulamayı Başlat
    getLocation();
    startCamera();
});