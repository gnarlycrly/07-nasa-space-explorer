// NASA API key (easy to replace if needed)
const NASA_API_KEY = 'tCAsONLPCsEb4Aj9ZBPvNzdWlIdfAHklqtI6hZiD';

// API endpoint for Astronomy Picture of the Day (APOD)
const APOD_URL = 'https://api.nasa.gov/planetary/apod';

// A few short space facts to show on page load
const SPACE_FACTS = [
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin at over 600 times per second.',
	'Light from the Sun takes about 8 minutes to reach Earth.',
	'There are more stars in the universe than grains of sand on Earth.',
	'Jupiter has the shortest day of any planet in our solar system.'
];

// Existing page elements
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const fetchButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// Data store for finding an item when a card is clicked
let currentItems = [];

// Elements created in JavaScript (only where needed)
const modal = createModal();

// Keep the existing date setup from dateRange.js
setupDateInputs(startInput, endInput);

// Start the app behavior
initializeApp();

function initializeApp() {
	injectInteractiveStyles();
	renderDidYouKnowFact();
	fetchButton.addEventListener('click', handleFetchClick);
	gallery.addEventListener('click', handleGalleryClick);
	setupModalCloseEvents();
}

async function handleFetchClick() {
	const { startDate, endDate } = getSelectedDates();

	if (!startDate || !endDate) {
		showMessage('Please select both a start date and an end date.');
		return;
	}

	if (startDate > endDate) {
		showMessage('Start date must be earlier than or equal to end date.');
		return;
	}

	showMessage('Loading space images...');

	try {
		const apodData = await fetchApodRange(startDate, endDate);
		const sortedData = sortNewestFirst(apodData);
		renderGallery(sortedData);
	} catch (error) {
		showMessage('Sorry, we could not load NASA images right now. Please try again.');
		console.error('APOD fetch failed:', error);
	}
}

function getSelectedDates() {
	return {
		startDate: startInput.value,
		endDate: endInput.value,
	};
}

async function fetchApodRange(startDate, endDate) {
	const url = `${APOD_URL}?api_key=${NASA_API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	const data = await response.json();

	// APOD date range usually returns an array, but normalize just in case.
	return Array.isArray(data) ? data : [data];
}

function sortNewestFirst(items) {
	return [...items].sort((a, b) => {
		return new Date(b.date) - new Date(a.date);
	});
}

function renderGallery(items) {
	if (!items.length) {
		currentItems = [];
		showMessage('No space images were found for that date range. Try different dates.');
		return;
	}

	currentItems = items;
	const cardsHtml = items.map((item, index) => createCardHtml(item, index)).join('');
	gallery.innerHTML = cardsHtml;
}

function createCardHtml(item, index) {
	const safeTitle = escapeHtml(item.title || 'Untitled');
	const safeDate = escapeHtml(item.date || 'Unknown date');
	const isImage = item.media_type === 'image';
	const thumbnail = isImage ? item.url : item.thumbnail_url;
	const mediaLabel = isImage ? 'Image' : 'Video';
	const hasThumbnail = Boolean(thumbnail);

	const mediaHtml = hasThumbnail
		? `<img src="${thumbnail}" alt="${safeTitle}" loading="lazy" />`
		: `<div class="placeholder"><p>Video available (no thumbnail provided)</p></div>`;

	return `
		<article
			class="gallery-item"
			data-index="${index}"
		>
			${mediaHtml}
			<p><strong>${safeTitle}</strong></p>
			<p>${safeDate}</p>
			<p>${mediaLabel}</p>
		</article>
	`;
}

function handleGalleryClick(event) {
	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	const itemIndex = Number(card.dataset.index);
	const selectedItem = currentItems[itemIndex];

	if (!selectedItem) {
		return;
	}

	openModal(selectedItem);
}

function createModal() {
	const modalElement = document.createElement('div');
	modalElement.className = 'apod-modal hidden';
	modalElement.innerHTML = `
		<div class="apod-modal-overlay" data-close-modal="true"></div>
		<div class="apod-modal-content" role="dialog" aria-modal="true" aria-label="Space image details">
			<button class="apod-modal-close" type="button" aria-label="Close">&times;</button>
			<div class="apod-modal-media"></div>
			<h2 class="apod-modal-title"></h2>
			<p class="apod-modal-date"></p>
			<p class="apod-modal-explanation"></p>
			<p class="apod-modal-video-link"></p>
		</div>
	`;

	document.body.appendChild(modalElement);
	return modalElement;
}

function openModal(item) {
	const mediaContainer = modal.querySelector('.apod-modal-media');
	const titleElement = modal.querySelector('.apod-modal-title');
	const dateElement = modal.querySelector('.apod-modal-date');
	const explanationElement = modal.querySelector('.apod-modal-explanation');
	const videoLinkElement = modal.querySelector('.apod-modal-video-link');
	const isImage = item.media_type === 'image';

	titleElement.textContent = item.title || 'Untitled';
	dateElement.textContent = item.date || 'Unknown date';
	explanationElement.textContent = item.explanation || 'No explanation available.';

	if (isImage) {
		const largeImageUrl = item.hdurl || item.url || '';
		mediaContainer.innerHTML = `<img src="${largeImageUrl}" alt="${escapeHtml(item.title || 'Space image')}" />`;
		videoLinkElement.innerHTML = '';
	} else {
		const safeVideoUrl = escapeHtml(item.url || '#');
		mediaContainer.innerHTML = '<p>Video entry</p>';
		videoLinkElement.innerHTML = `<a href="${safeVideoUrl}" target="_blank" rel="noopener noreferrer">Watch this NASA video</a>`;
	}

	modal.classList.remove('hidden');
	document.body.style.overflow = 'hidden';
}

function closeModal() {
	modal.classList.add('hidden');
	document.body.style.overflow = '';
}

function setupModalCloseEvents() {
	modal.addEventListener('click', (event) => {
		const clickedCloseButton = event.target.classList.contains('apod-modal-close');
		const clickedOverlay = event.target.dataset.closeModal === 'true';

		if (clickedCloseButton || clickedOverlay) {
			closeModal();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
			closeModal();
		}
	});
}

function renderDidYouKnowFact() {
	const factSection = document.createElement('section');
	factSection.className = 'did-you-know';

	const randomFact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];

	factSection.innerHTML = `
		<h2>Did You Know?</h2>
		<p>${randomFact}</p>
	`;

	gallery.parentElement.insertBefore(factSection, gallery);
}

function injectInteractiveStyles() {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.did-you-know {
			background: #ffffff;
			border-left: 6px solid #2f6df6;
			border-radius: 8px;
			padding: 14px 16px;
			margin: 0 20px 20px;
			box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		}

		.did-you-know h2 {
			font-size: 18px;
			margin-bottom: 6px;
		}

		.gallery-item {
			cursor: pointer;
		}

		.gallery-item img {
			transition: transform 0.25s ease;
		}

		.gallery-item:hover img {
			transform: scale(1.06);
		}

		.apod-modal.hidden {
			display: none;
		}

		.apod-modal {
			position: fixed;
			inset: 0;
			z-index: 1000;
		}

		.apod-modal-overlay {
			position: absolute;
			inset: 0;
			background: rgba(0, 0, 0, 0.65);
		}

		.apod-modal-content {
			position: relative;
			max-width: 850px;
			max-height: 90vh;
			overflow-y: auto;
			margin: 5vh auto;
			background: white;
			padding: 20px;
			border-radius: 10px;
			z-index: 2;
		}

		.apod-modal-close {
			position: absolute;
			top: 10px;
			right: 10px;
			width: 38px;
			height: 38px;
			font-size: 24px;
			line-height: 1;
			border: none;
			border-radius: 50%;
			background: #efefef;
			cursor: pointer;
		}

		.apod-modal-media img {
			width: 100%;
			height: auto;
			max-height: 60vh;
			object-fit: contain;
			border-radius: 6px;
			margin-bottom: 14px;
		}

		.apod-modal-title {
			margin-bottom: 6px;
		}

		.apod-modal-date {
			color: #555;
			margin-bottom: 10px;
		}

		.apod-modal-explanation {
			line-height: 1.5;
		}

		.apod-modal-video-link {
			margin-top: 12px;
		}

		.apod-modal-video-link a {
			color: #1a4fd3;
			font-weight: bold;
		}

		@media (max-width: 700px) {
			.apod-modal-content {
				margin: 2vh 12px;
				max-height: 96vh;
			}

			.did-you-know {
				margin: 0 20px 20px;
			}
		}
	`;

	document.head.appendChild(styleElement);
}

function escapeHtml(text) {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function showMessage(messageText) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">🔭</div>
			<p>${messageText}</p>
		</div>
	`;
}
