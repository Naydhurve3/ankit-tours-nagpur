# Ankit Tours & Travels - Kondhali Nagpur (Glass Edition)

Public: `index.html` | Private Owner: `admin.html` (PIN 7276)

## Run
Just open `index.html` in browser. No build. All data from `assets/data/site-data.json` + localStorage.

## Private/Public split
- Owner uses `admin.html` to Add / Hide (👁️) / Delete fleet, packages, gallery, testimonials.
- Public `index.html` renders only `visible:true`.
- Save = localStorage, Export JSON = download to replace seed for permanent deploy.
- Images: URL or file upload (base64). Prefer URLs for >10 images.

## Stack
Vanilla HTML/CSS/JS, Glassmorphism (backdrop-filter), Inter+Poppins, i18n EN/HI/MR, IntersectionObserver animations, responsive.

## Deploy
Copy folder to host / Netlify / GitHub Pages. For cloud sync, replace DataService in js/data.js with Firebase.
