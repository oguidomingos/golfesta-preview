(function () {
	'use strict';

	window.dataLayer = window.dataLayer || [];

	// ---------- Galeria / Lightbox (mesmo comportamento do site original) ----------
	const galleryImages = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
		return 'assets/img/' + n + '-1600.webp';
	});
	let currentImageIndex = 0;
	const lightbox = document.getElementById('lightbox');
	const lightboxImage = document.getElementById('lightbox-image');
	const currentImageSpan = document.getElementById('current-image');
	document.getElementById('total-images').textContent = galleryImages.length;

	function updateLightboxImage() {
		lightboxImage.src = galleryImages[currentImageIndex];
		currentImageSpan.textContent = currentImageIndex + 1;
	}
	function openLightbox(index) {
		currentImageIndex = index;
		updateLightboxImage();
		lightbox.classList.add('active');
		document.body.style.overflow = 'hidden';
	}
	function closeLightbox() {
		lightbox.classList.remove('active');
		document.body.style.overflow = 'auto';
	}
	function nextImage() {
		currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
		updateLightboxImage();
	}
	function previousImage() {
		currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
		updateLightboxImage();
	}

	document.querySelectorAll('.gallery-image[data-index]').forEach(function (img) {
		img.addEventListener('click', function () {
			openLightbox(parseInt(img.dataset.index, 10));
		});
	});
	lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
	lightbox.querySelector('.lightbox-prev').addEventListener('click', previousImage);
	lightbox.querySelector('.lightbox-next').addEventListener('click', nextImage);

	document.addEventListener('keydown', function (e) {
		if (!lightbox.classList.contains('active')) return;
		switch (e.key) {
			case 'Escape': closeLightbox(); break;
			case 'ArrowLeft': previousImage(); break;
			case 'ArrowRight': nextImage(); break;
		}
	});
	lightbox.addEventListener('click', function (e) {
		if (e.target === lightbox) closeLightbox();
	});

	// Gestos de toque (mobile)
	let touchStartX = 0;
	const lightboxContent = lightbox.querySelector('.lightbox-content');
	lightboxContent.addEventListener('touchstart', function (e) {
		touchStartX = e.changedTouches[0].screenX;
	}, { passive: true });
	lightboxContent.addEventListener('touchend', function (e) {
		const diff = touchStartX - e.changedTouches[0].screenX;
		if (Math.abs(diff) > 50) {
			if (diff > 0) nextImage(); else previousImage();
		}
	});

	// ---------- Menu mobile (o botão existia no original mas não abria nada) ----------
	const menuToggle = document.getElementById('menu-toggle');
	const mobileMenu = document.getElementById('mobile-menu');
	menuToggle.addEventListener('click', function () {
		const open = mobileMenu.classList.toggle('hidden') === false;
		menuToggle.setAttribute('aria-expanded', String(open));
	});
	mobileMenu.querySelectorAll('a').forEach(function (a) {
		a.addEventListener('click', function () {
			mobileMenu.classList.add('hidden');
			menuToggle.setAttribute('aria-expanded', 'false');
		});
	});

	// ---------- Tracking de CTAs (eventos no dataLayer para o GTM) ----------
	document.querySelectorAll('[data-cta]').forEach(function (el) {
		el.addEventListener('click', function () {
			const href = el.getAttribute('href') || '';
			window.dataLayer.push({
				event: href.indexOf('tel:') === 0 ? 'phone_click' : (href.charAt(0) === '#' ? 'nav_click' : 'whatsapp_click'),
				cta_id: el.dataset.cta
			});
		});
	});

	// Ano automático no rodapé
	document.getElementById('year').textContent = new Date().getFullYear();

	// ---------- Origem do tráfego (UTM/gclid) guardada na 1ª página vista, para ir junto com o lead ----------
	const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'];
	const attribution = (function () {
		const q = new URLSearchParams(location.search);
		let saved = {};
		try { saved = JSON.parse(sessionStorage.getItem('gf_attr') || '{}'); } catch (e) {}
		if (ATTR_KEYS.some(function (k) { return q.get(k); })) {
			saved = {};
			ATTR_KEYS.forEach(function (k) { if (q.get(k)) saved[k] = q.get(k); });
			try { sessionStorage.setItem('gf_attr', JSON.stringify(saved)); } catch (e) {}
		}
		return saved;
	})();

	// ---------- Formulário → planilha (Apps Script) + WhatsApp (via /wpp-lead/ de conversão) ----------
	const form = document.getElementById('lead-form');
	function sendToSheet(data) {
		const url = form.dataset.sheetUrl;
		if (!url) return;
		const body = new URLSearchParams(data);
		// sendBeacon sobrevive à navegação para o WhatsApp; fetch keepalive é o plano B.
		if (!(navigator.sendBeacon && navigator.sendBeacon(url, body))) {
			fetch(url, { method: 'POST', body: body, mode: 'no-cors', keepalive: true }).catch(function () {});
		}
	}
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		const nome = form.nome.value.trim();
		const telefone = form.telefone.value.trim();
		const error = form.querySelector('.form-error');
		if (!nome || telefone.replace(/\D/g, '').length < 10) {
			error.classList.remove('hidden');
			(nome ? form.telefone : form.nome).focus();
			return;
		}
		error.classList.add('hidden');

		let dataBr = '';
		if (form.data.value) {
			const p = form.data.value.split('-');
			dataBr = p[2] + '/' + p[1] + '/' + p[0];
		}
		const pacote = form.pacote.value;
		const bairro = form.bairro.value.trim();
		const criancas = form.criancas.value;

		sendToSheet(Object.assign({
			nome: nome,
			telefone: telefone,
			data: dataBr,
			idade: form.idade.value,
			pacote: pacote,
			bairro: bairro,
			criancas: criancas,
			pagina: location.href.split('#')[0],
			website: form.website.value
		}, attribution));

		const linhas = [pacote
			? 'Olá! Vim pelo site da Gol Festa e tenho interesse na experiência ' + pacote + '.'
			: 'Olá! Vim pelo site da Gol Festa e gostaria de consultar uma data para o aniversário.',
			'Nome: ' + nome];
		if (dataBr) linhas.push('Data da festa: ' + dataBr);
		if (bairro) linhas.push('Local/Bairro: ' + bairro);
		if (form.idade.value) linhas.push('Idade do aniversariante: ' + form.idade.value);
		if (criancas) linhas.push('Quantidade aproximada de crianças: ' + criancas);

		window.dataLayer.push({ event: 'form_submit', cta_id: 'lead_form', pacote: pacote || 'indefinido' });
		// pequeno respiro para o beacon sair antes da navegação
		setTimeout(function () {
			window.location.href = 'wpp-lead/?text=' + encodeURIComponent(linhas.join('\n'));
		}, 150);
	});

	// ---------- Embed do Instagram (hero): embed.js carregado logo, pois está acima da dobra ----------
	if (window.instgrm) {
		window.instgrm.Embeds.process();
	} else {
		const s = document.createElement('script');
		s.src = 'https://www.instagram.com/embed.js';
		s.async = true;
		document.body.appendChild(s);
	}
})();
