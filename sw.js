const CACHE_NAME = 'dr-wafez-delivery-v1';

// الملفات الأساسية التي سيتم كاشها فوراً
const BASIC_ASSETS = [
    './',
    'index.html' // 💡 تنبيه: إذا قمت بتغيير اسم ملف الـ HTML الأساسي لاحقاً، اكتب اسمه الجديد هنا
];

// 1. مرحلة التثبيت: كاش السيرفر للملفات الأساسية
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('جاري حفظ ملفات النظام الأساسية في الذاكرة المؤقتة...');
            return cache.addAll(BASIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. مرحلة التنشيط: تنظيف الكاش القديم عند تحديث النظام
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('جاري حذف الذاكرة المؤقتة القديمة:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. مرحلة اعتراض الطلبات (Fetch): هنا تحدث المعجزة عند انقطاع الإنترنت
self.addEventListener('fetch', event => {
    const requestUrl = event.request.url;

    // ⚠️ استثناء حرج جداً: طلبات الفايربيز وبيانات الأوردرات المباشرة (.json) لا تُكاش هنا نهائياً
    // لكي لا تظهر للمستخدم بيانات قديمة وثابتة، وسنعالجها لاحقاً بذاكرة IndexedDB للبيانات
    if (requestUrl.includes('.json') || requestUrl.includes('firebaseio.com')) {
        return; 
    }

    // استراتيجية (Cache First) للمكتبات الخارجية والأيقونات والصفحة
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // إذا كان الملف (مثل خط القاهرة أو أيقونة) محفوظاً، افتحه فوراً بدون إنترنت
            }

            // إذا كان الملف غير محفوظ (مثل أول مرة تفتح فيها الصفحة)، جلب من الإنترنت وكاشه للمرات القادمة
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache); // تخزين ذكي للمكتبات مثل Chart.js و Tailwind و FontAwesome
                });

                return networkResponse;
            }).catch(() => {
                // إذا فشل الإنترنت تماماً والملف غير موجود بالكاش، أعد توجيهه للصفحة الرئيسية المستقرة
                if (event.request.mode === 'navigate') {
                    return caches.match('./');
                }
            });
        })
    );
});
