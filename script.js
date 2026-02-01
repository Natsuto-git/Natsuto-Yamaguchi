document.addEventListener("DOMContentLoaded", () => {
    // リロード時は必ずページ最上部から
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // ハッシュ(#section)があると読み込み後にそこへ飛ぶので、リロード時は消してトップ固定
    if (window.location.hash) {
        try {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch {}
    }
    // レイアウト確定後にもう一度トップへ（Safari対策）
    const forceTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    forceTop();
    requestAnimationFrame(() => requestAnimationFrame(forceTop));

    // bfcache（戻る/進む復元）でもトップ固定
    window.addEventListener('pageshow', () => {
        forceTop();
        requestAnimationFrame(() => requestAnimationFrame(forceTop));
    });
    
    // --- 1. Loading Animation ---
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        // Trigger initial hero text animations
        setTimeout(() => {
            document.querySelectorAll('.hero .fade-in').forEach(el => {
                el.classList.add('visible');
            });
        }, 500);
    }, 2000);

    // --- 2. Menu Toggle ---
    const menuBtn = document.getElementById('menuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuLinks = document.querySelectorAll('.menu-link');
    const katanaWrapper = document.getElementById('katanaWrapper');
    const katanaSaya = document.querySelector('.katana-saya');

    let isUnsheatheAnimating = false;
    let isDrawn = false;
    const SAYA_UNSHEATHE_TOTAL_MS = 650; // CSSの抜刀アニメ(鞘)と合わせる
    // 納刀と同じ「70%で到達→85%まで停止」の“到達”タイミングでメニューを出す
    const SAYA_PARTIAL_PULL_MS = Math.round(SAYA_UNSHEATHE_TOTAL_MS * 0.70);
    const MENU_OPEN_AFTER_MS = SAYA_PARTIAL_PULL_MS + 20;
    
    // 抜刀中キャンセル（閉じる→必ず納刀）用
    let unsheatheMenuTimer = null;
    let unsheatheFallbackTimer = null;
    let unsheatheEndHandler = null;

    const setMenuOpen = (next) => {
        menuOverlay.classList.toggle('open', next);
        menuBtn.setAttribute('aria-expanded', String(next));
    };
    
    const closeMenuAndResheathe = () => {
        setMenuOpen(false);
        // 抜刀アニメ中に閉じられた場合も“必ず納刀”へ切り替える
        if (isUnsheatheAnimating) {
            cancelUnsheatheAndResheathe();
            return;
        }
        resheathe();
    };
    
    const clearUnsheatheTimersAndHandlers = () => {
        if (unsheatheMenuTimer != null) {
            window.clearTimeout(unsheatheMenuTimer);
            unsheatheMenuTimer = null;
        }
        if (unsheatheFallbackTimer != null) {
            window.clearTimeout(unsheatheFallbackTimer);
            unsheatheFallbackTimer = null;
        }
        if (unsheatheEndHandler && katanaSaya) {
            try { katanaSaya.removeEventListener('animationend', unsheatheEndHandler); } catch {}
            unsheatheEndHandler = null;
        }
    };
    
    const cancelUnsheatheAndResheathe = () => {
        if (!katanaWrapper || !katanaSaya) {
            isUnsheatheAnimating = false;
            isDrawn = false;
            return;
        }
        
        clearUnsheatheTimersAndHandlers();
        isUnsheatheAnimating = false;
        isDrawn = false;
        
        // 抜刀中のクラスを捨てて、納刀アニメへ強制切替
        katanaWrapper.classList.remove('is-unsheathing', 'is-drawn');
        katanaWrapper.classList.add('is-resheathing');
        
        const onEnd = (e) => {
            if (e.target !== katanaSaya) return;
            katanaSaya.removeEventListener('animationend', onEnd);
            katanaWrapper.classList.remove('is-resheathing');
            katanaWrapper.classList.add('is-sheathed');
        };
        katanaSaya.addEventListener('animationend', onEnd);
    };

    const finalizeDrawnAfterUnsheathe = () => {
        isUnsheatheAnimating = false;
        isDrawn = true;
        clearUnsheatheTimersAndHandlers();
        if (katanaWrapper) {
            katanaWrapper.classList.remove('is-unsheathing', 'is-sheathed');
            katanaWrapper.classList.add('is-drawn');
        }
    };

    const unsheatheAndOpenMenu = () => {
        if (!katanaWrapper || !katanaSaya) {
            // 鞘がない場合は通常どおり開く
            setMenuOpen(true);
            return;
        }
        if (isUnsheatheAnimating) return;

        isUnsheatheAnimating = true;
        katanaWrapper.classList.remove('is-resheathing', 'is-sheathed');
        katanaWrapper.classList.add('is-unsheathing');

        // メニューは“抜き始め直後”ではなく、200px抜いて一瞬止まったタイミングで早めに表示
        if (unsheatheMenuTimer != null) window.clearTimeout(unsheatheMenuTimer);
        unsheatheMenuTimer = window.setTimeout(() => {
            if (!isUnsheatheAnimating) return;
            setMenuOpen(true);
        }, MENU_OPEN_AFTER_MS);

        const onEnd = (e) => {
            if (e.target !== katanaSaya) return;
            katanaSaya.removeEventListener('animationend', onEnd);
            unsheatheEndHandler = null;
            finalizeDrawnAfterUnsheathe();
        };

        unsheatheEndHandler = onEnd;
        katanaSaya.addEventListener('animationend', onEnd);

        // 万一 animationend が来ない環境向けの保険
        if (unsheatheFallbackTimer != null) window.clearTimeout(unsheatheFallbackTimer);
        unsheatheFallbackTimer = window.setTimeout(() => {
            if (isUnsheatheAnimating) {
                try { katanaSaya.removeEventListener('animationend', onEnd); } catch {}
                unsheatheEndHandler = null;
                finalizeDrawnAfterUnsheathe();
            }
        }, SAYA_UNSHEATHE_TOTAL_MS + 400);
    };

    const resheathe = () => {
        if (!katanaWrapper || !katanaSaya) {
            isDrawn = false;
            return;
        }
        if (isUnsheatheAnimating) return;

        isDrawn = false;
        katanaWrapper.classList.remove('is-unsheathing', 'is-drawn');
        katanaWrapper.classList.add('is-resheathing');

        const onEnd = (e) => {
            if (e.target !== katanaSaya) return;
            katanaSaya.removeEventListener('animationend', onEnd);
            katanaWrapper.classList.remove('is-resheathing');
            katanaWrapper.classList.add('is-sheathed');
        };
        katanaSaya.addEventListener('animationend', onEnd);
    };

    menuBtn.addEventListener('click', () => {
        const isOpen = menuOverlay.classList.contains('open');
        if (isOpen) {
            closeMenuAndResheathe();
            return;
        }

        // 初回は“抜刀→メニュー表示”
        if (!isDrawn) {
            unsheatheAndOpenMenu();
            return;
        }

        // 既に抜刀済みなら即表示
        setMenuOpen(true);
    });

    // メニュー表示中：背景（オーバーレイ）タップで閉じる + 納刀
    menuOverlay.addEventListener('click', (e) => {
        if (!menuOverlay.classList.contains('open')) return;
        // メニュー本体（リスト）内のクリックは閉じない（リンクは別ハンドラで閉じる）
        if (e.target && e.target.closest && e.target.closest('.menu-list')) return;
        closeMenuAndResheathe();
    });
    
    // Escape でも“閉じる＋納刀”を保証
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!menuOverlay.classList.contains('open')) return;
        closeMenuAndResheathe();
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenuAndResheathe();
        });
    });

    // --- 3. Hero Slider Logic with Touch Support ---
    const slides = document.querySelectorAll('.hero__slide');
    const indicators = document.querySelectorAll('.indicator');
    const heroSlider = document.querySelector('.hero__slider-container');
    let currentSlide = 0;
    const slideInterval = 6000; // モバイル用に少し短く
    let autoSlide;

    const changeSlide = (index) => {
        // Remove active class from current
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        
        // Add active class to new
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    };

    // Auto Slide
    const startAutoSlide = () => {
        autoSlide = setInterval(() => {
            changeSlide(currentSlide + 1);
        }, slideInterval);
    };

    const stopAutoSlide = () => {
        clearInterval(autoSlide);
    };

    startAutoSlide();

    // Manual Indicator Click/Touch
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            stopAutoSlide();
            changeSlide(index);
            startAutoSlide();
        });
    });

    // Touch/Swipe Support for Mobile
    let touchStartX = 0;
    let touchEndX = 0;
    let isScrolling = false;

    heroSlider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        isScrolling = false;
    }, { passive: true });

    heroSlider.addEventListener('touchmove', (e) => {
        // 縦スクロールかどうかを判定
        const touchY = e.changedTouches[0].screenY;
        const diffY = Math.abs(touchY - e.changedTouches[0].screenY);
        if (diffY > 10) {
            isScrolling = true;
        }
    }, { passive: true });

    heroSlider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
        if (isScrolling) return; // 縦スクロール中は無視

        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            stopAutoSlide();
            
            if (diff > 0) {
                // 右から左へスワイプ - 次のスライド
                changeSlide(currentSlide + 1);
            } else {
                // 左から右へスワイプ - 前のスライド
                changeSlide(currentSlide - 1);
            }
            
            // 少し遅らせてから自動再生を再開
            setTimeout(startAutoSlide, 3000);
        }
    };

    // --- 4. 道セクション：もっと見るボタンで展開 ---
    const timelineMore = document.getElementById('timelineMore');
    const timelineExpandBtn = document.getElementById('timelineExpandBtn');
    if (timelineMore && timelineExpandBtn) {
        timelineExpandBtn.addEventListener('click', () => {
            const isOpen = timelineMore.classList.toggle('is-open');
            timelineExpandBtn.setAttribute('aria-expanded', isOpen);
            // 押した後も同じボタンで開閉できるようにする
            timelineExpandBtn.textContent = isOpen ? '閉じる' : 'もっと見る';
        });
    }

    // --- 5. Scroll Animations (一旦すべて停止) ---
    // ページ移動（スクロール）に関係するアニメーションは、要望により一旦すべて無効化。
    // CSS側で `.fade-up/.fade-in` を常時表示にしているため、ここでObserverを回さない。

    // --- 5. Gallery Controls ---
    const galleryTrack = document.querySelector('.gallery__scroll-track');
    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');
    let isGalleryPaused = false;
    let manualX = null; // 手動移動の現在位置（px）。nullなら現在の見た目から取得する

    function getTranslateX(el) {
        const t = getComputedStyle(el).transform;
        if (!t || t === 'none') return 0;

        // matrix(a,b,c,d,tx,ty)
        const m2 = t.match(/^matrix\((.+)\)$/);
        if (m2) {
            const parts = m2[1].split(',').map(s => parseFloat(s.trim()));
            return Number.isFinite(parts[4]) ? parts[4] : 0;
        }

        // matrix3d(..., tx, ty, tz)
        const m3 = t.match(/^matrix3d\((.+)\)$/);
        if (m3) {
            const parts = m3[1].split(',').map(s => parseFloat(s.trim()));
            return Number.isFinite(parts[12]) ? parts[12] : 0;
        }

        return 0;
    }

    function setManualTransform(x) {
        // 自動アニメを止めて、ボタンで確実に移動できるようにする
        galleryTrack.style.animation = 'none';
        galleryTrack.style.animationPlayState = 'paused';
        galleryTrack.style.transform = `translateX(${x}px)`;
        manualX = x;
        isGalleryPaused = true;
    }

    if (galleryTrack && galleryPrev && galleryNext) {
        galleryPrev.addEventListener('click', () => {
            const currentX = manualX ?? getTranslateX(galleryTrack);
            const step = 320;
            const trackWidth = galleryTrack.scrollWidth / 2; // 重複している前提（先頭半分が1周）

            if (!trackWidth) return;

            let newX = currentX + step;
            // 0を超えたら末尾側へ回す
            if (newX > 0) newX -= trackWidth;
            setManualTransform(newX);
        });

        galleryNext.addEventListener('click', () => {
            const currentX = manualX ?? getTranslateX(galleryTrack);
            const step = 320;
            const trackWidth = galleryTrack.scrollWidth / 2; // 重複している前提（先頭半分が1周）

            if (!trackWidth) return;

            let newX = currentX - step;
            // 末尾を超えたら先頭側へ回す
            if (newX <= -trackWidth) newX += trackWidth;
            setManualTransform(newX);
        });

        // Resume animation after manual control
        let resumeTimeout;
        function scheduleResume() {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                if (isGalleryPaused) {
                    // 自動スクロールに戻す
                    galleryTrack.style.animation = '';
                    galleryTrack.style.animationPlayState = 'running';
                    galleryTrack.style.transform = '';
                    isGalleryPaused = false;
                    manualX = null;
                }
            }, 5000);
        }

        galleryPrev.addEventListener('click', scheduleResume);
        galleryNext.addEventListener('click', scheduleResume);

        // Gallery item click for lightbox (optional)
        const galleryItems = document.querySelectorAll('.gallery__item');
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                const caption = item.querySelector('.gallery__caption').textContent;
                // Here you could implement a lightbox modal
                console.log(`Clicked: ${caption}`);
            });
        });
    }


    // --- 6. Parallax Effects / 7. Scroll Interactions (一旦すべて停止) ---
    // タイトルやセクションがスクロールで動く原因なので削除。

    // --- 8. Mouse movement effects (Desktop only) ---
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) {
        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = (e.clientY / window.innerHeight) * 2 - 1;

            // Hero content subtle movement (desktop only)
            const heroContent = document.querySelector('.hero__content');
            if (heroContent && window.innerWidth >= 768) {
                heroContent.style.transform = `translate(${mouseX * 3}px, ${mouseY * 2}px)`;
            }

            // Cards subtle tilt (desktop only)
            if (window.innerWidth >= 768) {
                const cards = document.querySelectorAll('.goal-card, .timeline__item');
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const cardCenterX = rect.left + rect.width / 2;
                    const cardCenterY = rect.top + rect.height / 2;
                    
                    const deltaX = (e.clientX - cardCenterX) / rect.width;
                    const deltaY = (e.clientY - cardCenterY) / rect.height;
                    
                    card.style.setProperty('--mouse-x', deltaX);
                    card.style.setProperty('--mouse-y', deltaY);
                });
            }
        });
    }

    // --- 9. Mobile-specific optimizations ---
    if (isTouchDevice) {
        // モバイルでパフォーマンス向上のため、複雑なアニメーションを簡略化
        document.documentElement.style.setProperty('--ease-ink', 'ease-out');
        
        // スクロール最適化
        document.addEventListener('touchmove', (e) => {
            // パッシブリスニングで最適化
        }, { passive: true });

        // 視覚フィードバックの改善
        const touchElements = document.querySelectorAll('.btn, .menu-link, .indicator, .goal-card, .timeline__item');
        touchElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.98)';
            }, { passive: true });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.style.transform = '';
                }, 150);
            }, { passive: true             });
        });
    }

});