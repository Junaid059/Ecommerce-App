"""Generate seed-products.csv with realistic products + keyword-relevant images.

Image source: loremflickr.com — returns a real photo from Flickr matching the
given comma-separated keywords. The seed at the end keeps the image stable so
re-runs don't shuffle pictures.

Examples:
  https://loremflickr.com/600/600/macbook,laptop/all?lock=12
  https://loremflickr.com/600/600/dell,thinkpad,laptop/all?lock=99
"""
import csv
import random
from pathlib import Path

random.seed(7)

OUT = Path(__file__).resolve().parent.parent / "seed-products.csv"


def img(keywords: list[str], lock: int) -> str:
    kw = ",".join(k.strip().replace(" ", "") for k in keywords if k.strip())
    return f"https://loremflickr.com/600/600/{kw}/all?lock={lock}"


# ---------------------------------------------------------------------------
# CATALOG — every entry has its own image keywords and price band.
# Structure:
#   "Category Name": {
#       "items": [(product_name, [img_keywords], (price_min, price_max), description), ...]
#   }
# We then sometimes append a small adjective ("Pro", "Lite") to multiply rows
# but keep the same keyword list so the image is still relevant.
# ---------------------------------------------------------------------------

CATALOG: dict[str, dict] = {
    # ---------------- LAPTOPS ----------------
    "Laptops": {
        "items": [
            ("Apple MacBook Air 13", ["macbook", "air", "laptop"], (999, 1399), "Apple Silicon M2, 8GB RAM, 256GB SSD, 13.6-inch Liquid Retina display."),
            ("Apple MacBook Pro 14", ["macbook", "pro", "laptop"], (1599, 2999), "M3 Pro chip, 16GB unified memory, mini-LED ProMotion display, all-day battery."),
            ("Apple MacBook Pro 16", ["macbook", "pro", "laptop"], (2499, 3999), "M3 Max, 36GB RAM, 1TB SSD, 16-inch XDR display for pro workflows."),
            ("Dell XPS 13 Plus", ["dell", "xps", "laptop"], (1299, 1899), "Intel Core Ultra 7, 16GB LPDDR5, 13.4-inch OLED touchscreen, machined aluminum."),
            ("Dell XPS 15", ["dell", "xps15", "laptop"], (1799, 2599), "Core i7-13700H, RTX 4060, 15.6-inch 3.5K OLED, premium creator laptop."),
            ("Dell Inspiron 15", ["dell", "inspiron", "laptop"], (599, 899), "Reliable everyday laptop with Core i5, 8GB RAM, 512GB SSD."),
            ("Lenovo ThinkPad X1 Carbon", ["thinkpad", "lenovo", "laptop"], (1499, 2299), "Business ultrabook with carbon-fiber chassis, Core i7, 14-inch 2.8K OLED."),
            ("Lenovo ThinkPad T14", ["thinkpad", "lenovo", "business", "laptop"], (1199, 1799), "Durable enterprise laptop, MIL-STD tested, AMD Ryzen 7 Pro, 16GB RAM."),
            ("Lenovo Legion Pro 5", ["lenovo", "legion", "gaming", "laptop"], (1399, 1999), "Gaming laptop with Ryzen 7, RTX 4070, 16-inch 240Hz QHD display."),
            ("Lenovo Yoga 9i", ["lenovo", "yoga", "laptop"], (1099, 1499), "2-in-1 convertible with rotating soundbar hinge and 14-inch OLED."),
            ("HP Spectre x360 14", ["hp", "spectre", "laptop"], (1299, 1899), "Premium convertible, Intel Core Ultra 7, OLED touchscreen, gem-cut chassis."),
            ("HP Pavilion 15", ["hp", "pavilion", "laptop"], (649, 949), "Everyday laptop, Ryzen 5, 8GB RAM, 256GB SSD, 15.6-inch FHD."),
            ("HP EliteBook 840 G10", ["hp", "elitebook", "laptop"], (1399, 1899), "Business-class laptop with vPro, 14-inch IPS, fingerprint reader."),
            ("HP Omen 16", ["hp", "omen", "gaming", "laptop"], (1499, 2299), "Gaming powerhouse with RTX 4080, 16-inch 240Hz panel, RGB keyboard."),
            ("Asus ZenBook 14 OLED", ["asus", "zenbook", "laptop"], (899, 1299), "Slim ultrabook, Core i7, 14-inch OLED, military-grade durability."),
            ("Asus ROG Zephyrus G14", ["asus", "rog", "gaming", "laptop"], (1599, 2299), "Compact 14-inch gaming laptop, Ryzen 9, RTX 4070, AniMe Matrix lid."),
            ("Acer Swift Go 14", ["acer", "swift", "laptop"], (749, 1099), "Thin-and-light OLED laptop with Intel Core Ultra and AI Engine."),
            ("Acer Predator Helios 16", ["acer", "predator", "gaming", "laptop"], (1499, 2199), "Hardcore gaming rig, Intel Core i9, RTX 4080, mini-LED 250Hz display."),
            ("Microsoft Surface Laptop 5", ["surface", "microsoft", "laptop"], (999, 1599), "Premium 13.5-inch PixelSense touchscreen, Alcantara keyboard, Core i7."),
            ("Microsoft Surface Pro 9", ["surface", "tablet", "laptop"], (1099, 1599), "2-in-1 tablet/laptop with detachable keyboard and Surface Pen support."),
            ("Razer Blade 15", ["razer", "blade", "gaming", "laptop"], (2199, 2999), "Premium gaming laptop, RTX 4070, 240Hz QHD, CNC-aluminum unibody."),
            ("MSI Stealth 14 Studio", ["msi", "gaming", "laptop"], (1799, 2399), "Creator/gaming hybrid, RTX 4060, 14-inch QHD+ 240Hz."),
            ("Framework Laptop 13", ["framework", "laptop", "modular"], (1099, 1599), "Modular, repairable laptop with swappable ports. Built to last."),
            ("LG Gram 17", ["lg", "gram", "laptop"], (1399, 1899), "Lightest 17-inch laptop at under 3 lbs, all-day battery, Core i7."),
        ],
    },

    # ---------------- PHONES ----------------
    "Phones": {
        "items": [
            ("Apple iPhone 15", ["iphone", "apple", "smartphone"], (799, 999), "6.1-inch Super Retina XDR, A16 Bionic, USB-C, Dynamic Island."),
            ("Apple iPhone 15 Pro", ["iphone", "pro", "smartphone"], (999, 1199), "Titanium frame, A17 Pro, ProMotion display, triple-lens 48MP camera."),
            ("Apple iPhone 15 Pro Max", ["iphone", "pro", "smartphone"], (1199, 1599), "6.7-inch Super Retina XDR, 5x telephoto, A17 Pro, all-day battery."),
            ("Apple iPhone 14", ["iphone", "apple", "smartphone"], (699, 899), "A15 Bionic, dual-lens 12MP, Crash Detection and Emergency SOS."),
            ("Samsung Galaxy S24 Ultra", ["samsung", "galaxy", "smartphone"], (1199, 1499), "Snapdragon 8 Gen 3, 200MP camera, built-in S Pen, titanium frame."),
            ("Samsung Galaxy S24+", ["samsung", "galaxy", "smartphone"], (999, 1299), "6.7-inch QHD+ AMOLED, Snapdragon 8 Gen 3, 50MP triple camera."),
            ("Samsung Galaxy A55", ["samsung", "galaxy", "android"], (449, 599), "Mid-range hero, 6.6-inch Super AMOLED, 50MP OIS camera."),
            ("Google Pixel 8 Pro", ["pixel", "google", "smartphone"], (899, 1099), "Tensor G3, 6.7-inch Super Actua display, computational photography."),
            ("Google Pixel 8", ["pixel", "google", "smartphone"], (599, 799), "Best-in-class camera, Tensor G3, 7 years of OS updates."),
            ("Google Pixel 7a", ["pixel", "android", "smartphone"], (399, 549), "Affordable Pixel with 64MP camera and wireless charging."),
            ("OnePlus 12", ["oneplus", "smartphone", "android"], (799, 999), "Snapdragon 8 Gen 3, 100W charging, 6.82-inch LTPO AMOLED."),
            ("OnePlus Nord 4", ["oneplus", "nord", "android"], (399, 549), "Mid-range flagship, metal unibody, 100W SuperVOOC charging."),
            ("Xiaomi 14 Pro", ["xiaomi", "smartphone", "android"], (799, 999), "Leica optics, Snapdragon 8 Gen 3, 6.73-inch LTPO."),
            ("Nothing Phone 2", ["nothing", "phone", "android"], (599, 799), "Iconic Glyph interface, Snapdragon 8+ Gen 1, transparent design."),
            ("Sony Xperia 1 V", ["sony", "xperia", "smartphone"], (1199, 1499), "Pro-grade camera, 6.5-inch 4K OLED, Snapdragon 8 Gen 2."),
            ("Motorola Edge 40", ["motorola", "android", "smartphone"], (449, 649), "Curved 6.55-inch pOLED, 144Hz, MediaTek Dimensity 8020."),
            ("Asus ROG Phone 8", ["asus", "rog", "gaming", "phone"], (1099, 1399), "Gaming phone with shoulder triggers, 165Hz AMOLED, AeroActive cooler."),
        ],
    },

    # ---------------- TABLETS ----------------
    "Tablets": {
        "items": [
            ("Apple iPad Air 11", ["ipad", "tablet", "apple"], (599, 799), "M2 chip, 11-inch Liquid Retina, Apple Pencil Pro support."),
            ("Apple iPad Pro 13", ["ipad", "pro", "tablet"], (1299, 1799), "M4 chip, 13-inch Ultra Retina XDR Tandem OLED, 5G optional."),
            ("Apple iPad 10", ["ipad", "apple", "tablet"], (449, 599), "A14 Bionic, 10.9-inch Liquid Retina, USB-C, vivid colors."),
            ("Samsung Galaxy Tab S9", ["samsung", "tablet", "android"], (799, 999), "11-inch Dynamic AMOLED 2X, S Pen included, IP68 dust/water resistant."),
            ("Samsung Galaxy Tab S9 Ultra", ["samsung", "tablet", "android"], (1199, 1599), "14.6-inch Dynamic AMOLED 2X, Snapdragon 8 Gen 2 for Galaxy."),
            ("Microsoft Surface Pro 9", ["surface", "tablet", "microsoft"], (999, 1499), "13-inch PixelSense, Intel Core i5/i7, detachable keyboard."),
            ("Lenovo Tab P12", ["lenovo", "tablet", "android"], (349, 499), "12.7-inch 3K LCD display, quad JBL speakers, Precision Pen 3."),
            ("Xiaomi Pad 6", ["xiaomi", "tablet", "android"], (399, 549), "Snapdragon 870, 11-inch 144Hz IPS LCD, quad speakers."),
        ],
    },

    # ---------------- HEADPHONES & AUDIO ----------------
    "Audio": {
        "items": [
            ("Apple AirPods Pro 2", ["airpods", "earbuds"], (199, 249), "Active Noise Cancellation, Adaptive Audio, USB-C charging case."),
            ("Apple AirPods 4", ["airpods", "earbuds"], (129, 179), "H2 chip, redesigned fit, optional ANC, Personalized Spatial Audio."),
            ("Apple AirPods Max", ["airpods", "headphones"], (479, 599), "Over-ear, computational audio, premium stainless steel frame."),
            ("Sony WH-1000XM5", ["sony", "headphones"], (329, 449), "Industry-leading noise cancellation, 30-hour battery, lightweight design."),
            ("Sony WF-1000XM5", ["sony", "earbuds"], (249, 329), "Integrated Processor V2, best-in-class ANC, AI noise reduction calls."),
            ("Bose QuietComfort Ultra", ["bose", "headphones"], (379, 449), "Immersive audio, world-class noise cancellation, plush memory foam."),
            ("Bose QuietComfort Earbuds II", ["bose", "earbuds"], (249, 329), "CustomTune sound calibration, best-in-class ANC for earbuds."),
            ("Sennheiser Momentum 4", ["sennheiser", "headphones"], (299, 379), "60-hour battery, Adaptive Noise Cancellation, audiophile sound."),
            ("Beats Studio Pro", ["beats", "headphones"], (299, 379), "Personalized Spatial Audio, USB-C lossless, 40-hour battery."),
            ("JBL Flip 6", ["jbl", "speaker", "bluetooth"], (99, 149), "Portable Bluetooth speaker, IP67 waterproof, 12-hour playtime."),
            ("Bose SoundLink Revolve+ II", ["bose", "speaker"], (299, 379), "360-degree sound, water-resistant, deep bass and clear highs."),
            ("Sonos Era 300", ["sonos", "speaker"], (399, 549), "Spatial audio with Dolby Atmos, WiFi 6, Trueplay tuning."),
            ("Marshall Stanmore III", ["marshall", "speaker"], (349, 449), "Iconic Marshall sound, Bluetooth 5.2, classic brass details."),
            ("Anker Soundcore Liberty 4", ["anker", "earbuds"], (99, 149), "LDAC hi-res audio, ACAA 3.0 driver, heart rate monitoring."),
        ],
    },

    # ---------------- WEARABLES ----------------
    "Wearables": {
        "items": [
            ("Apple Watch Series 9", ["apple", "watch", "smartwatch"], (399, 499), "S9 SiP, Double Tap gesture, always-on Retina display."),
            ("Apple Watch Ultra 2", ["apple", "watch", "smartwatch"], (799, 899), "Rugged titanium case, dual-frequency GPS, action button."),
            ("Apple Watch SE", ["apple", "watch", "smartwatch"], (249, 329), "Essential Apple Watch experience at a great value."),
            ("Samsung Galaxy Watch 6", ["samsung", "watch", "smartwatch"], (299, 399), "Sapphire crystal, BioActive sensor, sleep coaching."),
            ("Garmin Fenix 7", ["garmin", "watch", "fitness"], (699, 999), "Premium multisport GPS watch, solar charging, MIP display."),
            ("Garmin Forerunner 265", ["garmin", "watch", "fitness"], (449, 549), "AMOLED running watch with training-readiness insights."),
            ("Fitbit Charge 6", ["fitbit", "tracker", "fitness"], (159, 199), "Heart rate, ECG, EDA, Google Maps and YouTube Music."),
            ("Whoop 4.0", ["whoop", "tracker", "fitness"], (239, 299), "Recovery-focused band, continuous biometric monitoring."),
            ("Oura Ring Gen 3", ["oura", "ring", "fitness"], (299, 499), "Sleep, readiness and activity tracking in a slim titanium ring."),
        ],
    },

    # ---------------- CAMERAS ----------------
    "Cameras": {
        "items": [
            ("Sony Alpha A7 IV", ["sony", "camera", "mirrorless"], (2499, 2999), "33MP full-frame mirrorless, 4K 60p, hybrid autofocus."),
            ("Sony ZV-1 II", ["sony", "camera", "vlog"], (899, 1099), "Vlog camera with wide 18-50mm lens and forward-facing mic."),
            ("Canon EOS R6 Mark II", ["canon", "camera", "mirrorless"], (2499, 2899), "24MP full-frame, 40fps burst, 6K oversampled 4K."),
            ("Canon EOS R50", ["canon", "camera", "mirrorless"], (679, 899), "Compact APS-C mirrorless for content creators."),
            ("Nikon Z f", ["nikon", "camera", "mirrorless"], (1999, 2399), "Retro-styled full-frame mirrorless with classic dials."),
            ("Nikon Z8", ["nikon", "camera", "mirrorless"], (3999, 4499), "45MP stacked sensor, 8K 60p RAW, blackout-free shooting."),
            ("Fujifilm X-T5", ["fujifilm", "camera", "mirrorless"], (1699, 2099), "40MP X-Trans, classic dials, 6.2K video, in-body stabilization."),
            ("Fujifilm X100V", ["fujifilm", "camera"], (1399, 1899), "Beloved compact with fixed 23mm f/2 lens and hybrid viewfinder."),
            ("GoPro Hero 12 Black", ["gopro", "camera", "action"], (399, 499), "5.3K 60p, HyperSmooth 6.0, 10-bit color, waterproof to 33ft."),
            ("DJI Osmo Action 4", ["dji", "action", "camera"], (299, 399), "1/1.3-inch sensor, magnetic quick-release, 4K 120p."),
            ("DJI Mini 4 Pro", ["dji", "drone"], (759, 1099), "Sub-249g drone with omnidirectional obstacle sensing and 4K HDR."),
            ("DJI Air 3", ["dji", "drone"], (1099, 1549), "Dual-camera drone, 46-min flight, O4 transmission."),
            ("Insta360 X4", ["insta360", "camera", "action"], (499, 599), "8K 360-degree camera with invisible selfie-stick effect."),
        ],
    },

    # ---------------- GAMING ----------------
    "Gaming": {
        "items": [
            ("Sony PlayStation 5 Slim", ["playstation", "ps5", "console"], (449, 499), "Slimmer redesign, detachable disc drive, 1TB SSD."),
            ("Sony PS5 Pro", ["playstation", "ps5", "console"], (699, 799), "Enhanced GPU and AI-driven upscaling for 4K 60fps gaming."),
            ("Microsoft Xbox Series X", ["xbox", "console", "gaming"], (449, 499), "12 TFLOPS, true 4K gaming, Quick Resume."),
            ("Microsoft Xbox Series S", ["xbox", "console", "gaming"], (299, 349), "All-digital next-gen console, 1440p performance."),
            ("Nintendo Switch OLED", ["nintendo", "switch", "console"], (329, 379), "7-inch vibrant OLED screen, enhanced audio, 64GB storage."),
            ("Steam Deck OLED", ["steamdeck", "console", "gaming"], (549, 749), "Handheld PC gaming, HDR OLED display, longer battery."),
            ("Asus ROG Ally", ["asus", "rog", "handheld", "gaming"], (599, 799), "Windows handheld with Ryzen Z1 Extreme and 120Hz display."),
            ("Meta Quest 3", ["meta", "quest", "vr"], (499, 649), "Mixed reality headset with full-color passthrough."),
            ("PlayStation VR2", ["psvr", "vr"], (549, 599), "4K HDR OLED, eye tracking, PlayStation 5 only."),
            ("Razer DeathAdder V3 Pro", ["razer", "mouse", "gaming"], (149, 169), "Ultralight 64g esports mouse, 30k DPI Focus Pro sensor."),
            ("Logitech G Pro X Superlight 2", ["logitech", "mouse", "gaming"], (159, 179), "Tournament-grade wireless mouse, HERO 2 sensor."),
            ("Razer Huntsman V3 Pro", ["razer", "keyboard", "gaming"], (199, 249), "Analog optical switches with rapid trigger."),
            ("Keychron Q1 Pro", ["keychron", "keyboard"], (199, 229), "Wireless QMK/VIA mechanical keyboard, hot-swap, aluminum."),
            ("Elgato Stream Deck MK.2", ["elgato", "streamdeck"], (149, 179), "15 customizable LCD keys for streamers and creators."),
        ],
    },

    # ---------------- COMPUTING ACCESSORIES ----------------
    "Accessories": {
        "items": [
            ("Apple Magic Mouse", ["apple", "mouse"], (79, 99), "Multi-touch surface, rechargeable, USB-C."),
            ("Apple Magic Keyboard", ["apple", "keyboard"], (99, 129), "Scissor-mechanism keys, full-size, rechargeable."),
            ("Logitech MX Master 3S", ["logitech", "mouse"], (99, 119), "Ergonomic, 8K DPI, MagSpeed scroll wheel."),
            ("Logitech MX Keys S", ["logitech", "keyboard"], (109, 129), "Backlit keys, Smart Actions automation, multi-device."),
            ("Anker 737 Power Bank", ["anker", "powerbank"], (129, 169), "24,000mAh, 140W USB-C PD, smart display."),
            ("Anker 737 GaNPrime Charger", ["anker", "charger"], (109, 139), "120W 3-port USB-C wall charger."),
            ("UGREEN 9-in-1 USB-C Hub", ["usb", "hub", "adapter"], (49, 79), "HDMI 4K, Ethernet, SD/microSD, 3x USB 3.0."),
            ("CalDigit TS4 Thunderbolt 4 Dock", ["thunderbolt", "dock", "usb"], (379, 449), "18-port Thunderbolt 4 dock for pro workflows."),
            ("Samsung T7 Shield 2TB SSD", ["samsung", "ssd", "drive"], (179, 229), "Rugged USB 3.2 Gen 2 portable SSD, IP65, 1,050 MB/s."),
            ("SanDisk Extreme Pro 1TB", ["sandisk", "ssd", "drive"], (129, 179), "Pro-grade portable SSD, 2,000 MB/s read."),
            ("WD My Passport 4TB", ["western digital", "harddrive"], (109, 139), "Reliable portable USB-C HDD, password protection."),
            ("Elgato Wave 3 USB Mic", ["elgato", "microphone"], (149, 179), "Premium broadcast mic with Clipguard and Wave Link."),
            ("Blue Yeti X", ["blue", "yeti", "microphone"], (169, 199), "Pro-level USB mic with 4-capsule array, LED meter."),
            ("Logitech Brio 4K Webcam", ["logitech", "webcam"], (159, 199), "4K Ultra HD webcam with HDR and 5x zoom."),
            ("Razer Kiyo Pro Ultra", ["razer", "webcam"], (249, 299), "Largest 4K Sony sensor for webcam, ultra-wide aperture."),
        ],
    },

    # ---------------- SMART HOME ----------------
    "Smart Home": {
        "items": [
            ("Amazon Echo Dot 5", ["echo", "alexa", "smarthome"], (49, 69), "Improved sound, temperature sensor, eero mesh extender."),
            ("Amazon Echo Show 10", ["echo", "alexa", "smarthome"], (199, 249), "10.1-inch HD screen that follows you with motion."),
            ("Google Nest Hub 2nd Gen", ["googlenest", "smarthome"], (89, 109), "Sleep sensing, ambient EQ, hands-free Google Assistant."),
            ("Google Nest Mini", ["googlenest", "smarthome"], (39, 59), "Compact smart speaker with 360-degree sound."),
            ("Philips Hue Starter Kit", ["philips", "hue", "smartlight"], (179, 229), "Three smart bulbs and a Hue Bridge for full home control."),
            ("Philips Hue Light Strip Plus", ["philips", "hue", "smartlight"], (89, 129), "80-inch dimmable color light strip, extensible."),
            ("Nanoleaf Shapes Hexagons", ["nanoleaf", "led", "smartlight"], (199, 279), "Modular touch-reactive light panels, 16M colors."),
            ("Ring Video Doorbell Pro 2", ["ring", "doorbell", "smarthome"], (229, 279), "Head-to-toe HD+ video, 3D motion detection."),
            ("Arlo Pro 5S 2K", ["arlo", "camera", "smarthome"], (229, 299), "Wireless 2K security camera, color night vision."),
            ("Eufy SoloCam S340", ["eufy", "camera", "smarthome"], (199, 249), "Solar-powered 360-degree security cam, dual-lens 3K."),
            ("Ecobee Smart Thermostat Premium", ["ecobee", "thermostat", "smarthome"], (229, 279), "Smart thermostat with built-in air quality monitor."),
            ("Google Nest Thermostat", ["googlenest", "thermostat", "smarthome"], (129, 169), "Energy-saving smart thermostat with Soli sensor."),
        ],
    },

    # ---------------- CLOTHING - SHIRTS ----------------
    "Shirts": {
        "items": [
            ("Classic Oxford Button-Down Shirt", ["oxford", "shirt", "menswear"], (49, 89), "Pure cotton oxford weave, button-down collar, structured fit."),
            ("White Crewneck T-Shirt", ["whitetshirt", "tshirt", "clothing"], (15, 35), "Heavyweight 240gsm cotton, classic relaxed fit, pre-shrunk."),
            ("Striped Long-Sleeve Henley", ["henley", "shirt", "menswear"], (45, 79), "Soft slub cotton, three-button placket, casual layering staple."),
            ("Premium Polo Shirt", ["polo", "shirt", "menswear"], (45, 89), "Pique knit cotton, mother-of-pearl buttons, slim fit."),
            ("Flannel Plaid Shirt", ["flannel", "shirt", "menswear"], (55, 99), "Brushed flannel, classic plaid, button-front, two chest pockets."),
            ("Linen Beach Shirt", ["linen", "shirt", "menswear"], (59, 109), "100% European linen, breathable, perfect for warm weather."),
            ("Performance Workout Tee", ["athletic", "tshirt", "sportswear"], (29, 49), "Moisture-wicking, four-way stretch, anti-odor finish."),
            ("Vintage Graphic T-Shirt", ["graphictshirt", "tshirt"], (29, 45), "Soft-hand vintage print, ringspun cotton, retro fit."),
            ("Pocket T-Shirt 3-Pack", ["tshirt", "clothing"], (39, 59), "Three essential tees with chest pockets in core colors."),
            ("Slim Fit Dress Shirt", ["dressshirt", "menswear"], (59, 119), "Wrinkle-resistant, French placket, slim European cut."),
            ("Hawaiian Camp Shirt", ["hawaiian", "shirt", "menswear"], (49, 79), "Open camp collar, tropical print, lightweight rayon."),
            ("Chambray Workshirt", ["chambray", "shirt", "menswear"], (55, 89), "Heritage-inspired workshirt with two flap pockets."),
        ],
    },

    # ---------------- CLOTHING - PANTS ----------------
    "Pants": {
        "items": [
            ("Slim Fit Stretch Jeans", ["jeans", "denim", "menswear"], (59, 99), "10oz stretch denim, slim through thigh, tapered leg."),
            ("Selvedge Raw Denim Jeans", ["denim", "jeans"], (149, 229), "14oz Japanese selvedge denim, button-fly, indigo dye."),
            ("Classic Khaki Chinos", ["chinos", "pants", "menswear"], (49, 89), "Soft brushed twill, straight-leg fit, classic 5-pocket styling."),
            ("Tapered Joggers", ["joggers", "pants", "athletic"], (39, 69), "French terry cotton, elastic waist, ribbed cuffs."),
            ("Cargo Pants", ["cargopants", "pants"], (59, 99), "Ripstop cotton, six utility pockets, relaxed fit."),
            ("Wool Dress Trousers", ["trousers", "dresspants", "menswear"], (129, 199), "Italian wool, flat-front, half-canvas construction."),
            ("Tech Performance Pants", ["tech", "pants", "athletic"], (79, 119), "4-way stretch, water-repellent, hidden zip pocket."),
            ("Linen Drawstring Pants", ["linen", "pants"], (59, 89), "Lightweight linen, drawstring waist, relaxed straight leg."),
            ("Black Skinny Jeans", ["skinny", "jeans", "denim"], (59, 99), "Power-stretch black denim, mid-rise, slim through leg."),
            ("Carpenter Work Pants", ["workpants", "pants"], (69, 99), "Heavy canvas, hammer loop, double knee, made for hard wear."),
            ("Pleated Wide-Leg Trouser", ["trousers", "pants"], (79, 129), "Vintage-inspired pleats, wide leg, flowy drape."),
            ("Track Pants", ["trackpants", "pants", "athletic"], (49, 79), "Tricot track pants with side stripes and zip ankles."),
        ],
    },

    # ---------------- OUTERWEAR ----------------
    "Outerwear": {
        "items": [
            ("Quilted Puffer Jacket", ["puffer", "jacket", "winter"], (149, 249), "650-fill power down, water-resistant shell, packable."),
            ("Wool Topcoat", ["topcoat", "coat", "menswear"], (249, 449), "Wool-cashmere blend, knee-length, single-breasted notch lapel."),
            ("Leather Biker Jacket", ["leatherjacket", "jacket"], (299, 599), "Full-grain lambskin, asymmetric zipper, quilted lining."),
            ("Denim Trucker Jacket", ["denimjacket", "denim"], (89, 149), "Classic trucker silhouette, two chest pockets, button-front."),
            ("Hooded Rain Shell", ["rainjacket", "jacket"], (99, 159), "Waterproof breathable shell, taped seams, packable hood."),
            ("Fleece Half-Zip Pullover", ["fleece", "pullover", "outerwear"], (59, 89), "Brushed sherpa fleece, kangaroo pocket, cozy stand collar."),
            ("Field Jacket", ["fieldjacket", "jacket"], (149, 249), "Waxed cotton field coat with four utility pockets."),
            ("Down Parka", ["parka", "winter", "jacket"], (299, 499), "Heavy-duty parka with faux-fur hood, tested to -20F."),
            ("Bomber Jacket", ["bomber", "jacket"], (109, 179), "MA-1 style satin bomber, ribbed cuffs and hem, water-repellent."),
        ],
    },

    # ---------------- FOOTWEAR ----------------
    "Footwear": {
        "items": [
            ("Nike Air Force 1 '07", ["nike", "airforce", "sneakers"], (99, 119), "Iconic basketball sneaker reborn as everyday classic."),
            ("Nike Air Max 90", ["nike", "airmax", "sneakers"], (119, 149), "Visible air heel cushioning, iconic 90s silhouette."),
            ("Nike Dunk Low", ["nike", "dunk", "sneakers"], (109, 129), "Heritage hoops style with low-cut padded collar."),
            ("Adidas Stan Smith", ["adidas", "stansmith", "sneakers"], (89, 109), "Classic tennis sneaker, perforated 3-stripe, white leather."),
            ("Adidas Samba OG", ["adidas", "samba", "sneakers"], (99, 129), "Heritage indoor soccer shoe, gum sole, T-toe overlay."),
            ("Adidas Ultraboost 24", ["adidas", "ultraboost", "running"], (179, 219), "Boost midsole, Primeknit upper, premium daily trainer."),
            ("New Balance 990v6", ["newbalance", "990", "sneakers"], (199, 239), "Made in USA classic, ENCAP midsole, premium pigskin suede."),
            ("New Balance 530", ["newbalance", "530", "sneakers"], (99, 129), "Retro 2000s runner returning with vintage colorways."),
            ("Converse Chuck Taylor 70", ["converse", "chuck", "sneakers"], (75, 99), "Premium canvas, vintage rubber, OG silhouette."),
            ("Vans Old Skool", ["vans", "oldskool", "sneakers"], (65, 89), "Iconic side-stripe canvas/suede skate shoe."),
            ("Asics Gel-Kayano 30", ["asics", "running", "sneakers"], (149, 189), "Premium stability runner with FF Blast Plus cushioning."),
            ("Hoka Clifton 9", ["hoka", "running", "sneakers"], (139, 169), "Plush max-cushion daily trainer, light at 8.7oz."),
            ("Brooks Ghost 16", ["brooks", "running", "sneakers"], (139, 159), "Neutral cushion runner, DNA Loft v3, smooth heel-to-toe."),
            ("Allbirds Wool Runner", ["allbirds", "wool", "sneakers"], (99, 129), "Merino wool upper, sustainably made, machine washable."),
            ("Salomon XT-6", ["salomon", "trailrunning", "sneakers"], (199, 239), "Trail-running heritage shoe with Quicklace and Contagrip."),
            ("Dr Martens 1460 Boots", ["docmartens", "boots"], (179, 219), "Iconic 8-eye lace-up leather boot with air-cushion sole."),
            ("Timberland 6\" Premium Boots", ["timberland", "boots"], (199, 249), "Waterproof nubuck, padded collar, signature wheat color."),
            ("Red Wing Iron Ranger", ["redwing", "boots"], (349, 429), "Six-inch cap-toe boot built on a Goodyear-welted sole."),
            ("Birkenstock Arizona Sandals", ["birkenstock", "sandals"], (109, 139), "Two-strap cork footbed sandal, adjustable buckles."),
            ("Crocs Classic Clog", ["crocs", "clog"], (49, 69), "Lightweight Croslite clog, ventilation ports, pivoting strap."),
            ("Oxford Wingtip Dress Shoe", ["oxford", "dressshoes"], (179, 269), "Brogued cap-toe Oxford in burnished calfskin."),
        ],
    },

    # ---------------- ACCESSORIES (fashion) ----------------
    "Fashion Accessories": {
        "items": [
            ("Leather Bifold Wallet", ["wallet", "leather"], (49, 89), "Full-grain leather, six card slots, slim profile."),
            ("Canvas Backpack", ["backpack", "bag"], (69, 119), "Heavy-duty canvas, padded laptop sleeve, 22L capacity."),
            ("Leather Briefcase", ["briefcase", "bag"], (199, 349), "Full-grain leather briefcase with padded 15-inch laptop slot."),
            ("Aviator Sunglasses", ["aviator", "sunglasses"], (69, 159), "Metal frame, polarized lenses, UV400 protection."),
            ("Wayfarer Sunglasses", ["wayfarer", "sunglasses"], (79, 169), "Acetate frame, classic wayfarer silhouette, polarized."),
            ("Wool Beanie", ["beanie", "hat"], (29, 49), "Soft merino wool, ribbed knit, fold-over cuff."),
            ("Baseball Cap", ["baseballcap", "hat"], (25, 39), "Six-panel cotton twill, adjustable strap, embroidered logo."),
            ("Cashmere Scarf", ["scarf", "cashmere"], (79, 149), "100% cashmere, soft and lightweight, classic fringe."),
            ("Leather Belt", ["leatherbelt", "belt"], (49, 89), "Full-grain bridle leather, brass buckle, made to last."),
            ("Crossbody Bag", ["crossbody", "bag"], (69, 119), "Compact crossbody with adjustable strap and zip closure."),
        ],
    },

    # ---------------- HOME & KITCHEN ----------------
    "Home & Kitchen": {
        "items": [
            ("Vitamix 5200 Blender", ["vitamix", "blender", "kitchen"], (449, 549), "Professional-grade blender, 64oz container, 7-year warranty."),
            ("Ninja Foodi Air Fryer", ["ninja", "airfryer", "kitchen"], (129, 179), "8-quart dual-zone air fryer with smart cook system."),
            ("Instant Pot Duo 7-in-1", ["instantpot", "kitchen"], (89, 129), "6-quart multi-cooker, pressure cook, slow cook, rice, yogurt."),
            ("Breville Barista Express", ["breville", "espresso", "kitchen"], (699, 799), "Espresso machine with integrated conical burr grinder."),
            ("Nespresso Vertuo Plus", ["nespresso", "coffee", "kitchen"], (179, 249), "Single-touch brewer, five cup sizes, Centrifusion tech."),
            ("Chemex 6-Cup Pour Over", ["chemex", "coffee"], (49, 79), "Iconic borosilicate carafe for pour-over coffee."),
            ("Le Creuset Dutch Oven 5.5qt", ["lecreuset", "dutchoven", "kitchen"], (369, 479), "Enameled cast iron, even heat retention, lifetime warranty."),
            ("Lodge Cast Iron Skillet 12\"", ["castiron", "skillet", "kitchen"], (29, 59), "Pre-seasoned, made in USA, virtually indestructible."),
            ("All-Clad D3 10-Piece Set", ["allclad", "cookware", "kitchen"], (799, 1199), "Tri-ply stainless steel cookware, made in USA."),
            ("KitchenAid Stand Mixer", ["kitchenaid", "mixer", "kitchen"], (379, 549), "5-quart tilt-head stand mixer with 10 speeds."),
            ("OXO Good Grips Knife Set", ["knifeset", "kitchen"], (79, 129), "8-piece knife block set with German stainless blades."),
            ("Yeti Rambler 30oz Tumbler", ["yeti", "tumbler", "drinkware"], (39, 49), "Double-wall vacuum insulation, MagSlider lid."),
            ("Stanley Quencher 40oz", ["stanley", "tumbler", "drinkware"], (39, 49), "Insulated tumbler with handle and reusable straw."),
            ("Hydro Flask 32oz", ["hydroflask", "waterbottle"], (44, 54), "Vacuum-insulated stainless steel, TempShield."),
            ("Brooklinen Luxe Sheet Set", ["bedsheets", "bedding"], (149, 199), "480-thread-count long-staple cotton sateen."),
            ("Casper Original Pillow", ["pillow", "bedding"], (65, 89), "Two-layer pillow-in-pillow for balanced support."),
            ("Dyson V15 Detect", ["dyson", "vacuum"], (749, 849), "Laser-illuminated cordless vacuum, particle sensor."),
            ("iRobot Roomba j7+", ["roomba", "vacuum"], (599, 799), "Self-emptying robot vacuum, obstacle recognition."),
            ("Philips Sonicare Toothbrush", ["sonicare", "toothbrush"], (149, 219), "Premium sonic toothbrush, pressure sensor, multiple modes."),
        ],
    },

    # ---------------- SPORTS & FITNESS ----------------
    "Sports": {
        "items": [
            ("Lululemon Reversible Yoga Mat", ["yogamat", "yoga"], (78, 98), "5mm reversible mat with antimicrobial top layer."),
            ("Manduka PRO Yoga Mat", ["manduka", "yogamat", "yoga"], (118, 138), "6mm dense cushion, lifetime guarantee."),
            ("Bowflex SelectTech 552 Dumbbells", ["dumbbells", "fitness"], (449, 549), "Pair of adjustable dumbbells, 5-52.5 lbs each."),
            ("Rogue Kettlebell 35lb", ["kettlebell", "fitness"], (89, 119), "Cast iron kettlebell with smooth handle, color-coded."),
            ("Concept2 RowErg", ["rowing", "rower", "fitness"], (949, 1099), "Gold-standard indoor rower, PM5 monitor."),
            ("Peloton Bike+", ["peloton", "bike", "fitness"], (2495, 2895), "Rotating HD touchscreen, auto-resistance, Apple GymKit."),
            ("Schwinn IC4 Indoor Cycle", ["schwinn", "bike", "fitness"], (799, 999), "Magnetic resistance indoor bike with dual-sided pedals."),
            ("TRX Suspension Trainer", ["trx", "fitness"], (149, 199), "Full-body bodyweight trainer with door anchor."),
            ("Wilson Pro Staff Tennis Racket", ["tennisracket", "tennis"], (199, 269), "Player's racquet, 97 sq in head, classic feel."),
            ("Spalding TF-1000 Basketball", ["basketball", "sports"], (49, 79), "Indoor composite leather basketball, NFHS approved."),
            ("Nike Strike Soccer Ball", ["soccer", "sports"], (29, 49), "Aerowsculpt grooves for true flight, machine-stitched."),
            ("Hydration Backpack 2L", ["hydrationpack", "hiking"], (69, 99), "Lightweight pack with 2L bladder, trail-ready."),
            ("Patagonia Black Hole Duffel 55L", ["patagonia", "duffel", "outdoor"], (149, 189), "Weather-resistant recycled fabric duffel, multiple carry options."),
            ("Osprey Atmos AG 65 Backpack", ["osprey", "backpack", "hiking"], (299, 349), "Anti-Gravity suspension backpacking pack, 65L."),
            ("MSR Hubba Hubba NX 2-Person Tent", ["tent", "camping"], (449, 549), "Three-season backpacking tent, 3.4 lb minimum weight."),
            ("Coleman Sundome 4-Person Tent", ["tent", "camping"], (99, 149), "Easy-setup family camping tent with weatherproof flooring."),
            ("Yeti Tundra 45 Cooler", ["yeti", "cooler", "outdoor"], (325, 399), "Rotomolded ice chest, bear-resistant, lifetime construction."),
            ("Theragun Pro 5th Gen", ["theragun", "massage", "fitness"], (599, 699), "Pro-grade percussive therapy device with QX150 motor."),
            ("Hyperice Hypervolt 2", ["hypervolt", "massage", "fitness"], (249, 299), "Bluetooth-enabled percussion massager, 5 speeds."),
        ],
    },

    # ---------------- BEAUTY & PERSONAL CARE ----------------
    "Beauty": {
        "items": [
            ("CeraVe Hydrating Cleanser", ["cerave", "skincare"], (12, 22), "Gentle non-foaming cleanser with hyaluronic acid and ceramides."),
            ("La Roche-Posay Anthelios SPF60", ["sunscreen", "skincare"], (28, 39), "Daily face sunscreen, Cell-Ox Shield UV protection."),
            ("The Ordinary Niacinamide 10%", ["serum", "skincare"], (8, 15), "Reduces appearance of blemishes and congestion."),
            ("Drunk Elephant C-Firma Day Serum", ["serum", "skincare"], (78, 89), "Vitamin C complex serum with ferulic acid."),
            ("Estee Lauder Advanced Night Repair", ["estelauder", "skincare"], (78, 119), "Synchronized Multi-Recovery Complex serum."),
            ("Olaplex No.3 Hair Perfector", ["olaplex", "haircare"], (28, 39), "Hair repair treatment for damaged and broken bonds."),
            ("Moroccanoil Treatment", ["moroccanoil", "haircare"], (44, 64), "Argan oil-infused hair treatment, smoothes and shines."),
            ("Dyson Supersonic Hair Dryer", ["dyson", "hairdryer"], (399, 449), "Intelligent heat control, faster drying, three attachments."),
            ("Dyson Airwrap Multi-Styler", ["dyson", "hairstyler"], (599, 699), "Curl, wave, smooth and dry without extreme heat."),
            ("Philips Norelco 9000 Shaver", ["shaver", "grooming"], (229, 299), "V-Track Pro blades, contour-detect heads, wet/dry."),
            ("Braun Series 9 Pro Shaver", ["braun", "shaver", "grooming"], (299, 379), "ProLift trimmer, 5 synchronized shaving elements."),
            ("Manscaped Lawn Mower 4.0", ["manscaped", "grooming"], (79, 99), "SkinSafe trimmer head, LED spotlight, waterproof."),
            ("Tom Ford Tobacco Vanille EDP 50ml", ["tomford", "perfume"], (199, 299), "Iconic men's fragrance with tobacco and vanilla notes."),
            ("Le Labo Santal 33 50ml", ["lelabo", "perfume"], (199, 269), "Cult unisex sandalwood fragrance, hand-blended."),
            ("Jo Malone English Pear 100ml", ["jomalone", "perfume"], (149, 189), "Crisp pear and freesia eau de cologne."),
        ],
    },

    # ---------------- BOOKS ----------------
    "Books": {
        "items": [
            ("Atomic Habits by James Clear", ["book", "selfhelp"], (15, 27), "An easy and proven way to build good habits and break bad ones."),
            ("The Psychology of Money", ["book", "finance"], (12, 22), "Timeless lessons on wealth, greed, and happiness."),
            ("Sapiens by Yuval Noah Harari", ["book", "history"], (16, 28), "A brief history of humankind, from the Stone Age to AI."),
            ("Thinking, Fast and Slow", ["book", "psychology"], (17, 29), "Daniel Kahneman's tour of the mind's two systems."),
            ("Designing Data-Intensive Apps", ["book", "programming"], (39, 59), "Martin Kleppmann's seminal work on modern data systems."),
            ("The Pragmatic Programmer", ["book", "programming"], (29, 49), "Your journey to mastery, 20th anniversary edition."),
            ("Clean Code by Robert Martin", ["book", "programming"], (29, 45), "A handbook of agile software craftsmanship."),
            ("Deep Work by Cal Newport", ["book", "selfhelp"], (14, 25), "Rules for focused success in a distracted world."),
            ("Educated by Tara Westover", ["book", "memoir"], (14, 25), "A memoir about family, transformation, and the power of education."),
            ("Project Hail Mary by Andy Weir", ["book", "fiction"], (15, 27), "Lone astronaut must save humanity in this gripping sci-fi adventure."),
            ("Tomorrow and Tomorrow and Tomorrow", ["book", "fiction"], (17, 28), "A novel about friendship, art, and video games."),
            ("Lessons in Chemistry", ["book", "fiction"], (15, 26), "A bestselling debut novel about a 1960s chemist turned TV cook."),
            ("The Body Keeps the Score", ["book", "psychology"], (14, 24), "Brain, mind, and body in the healing of trauma."),
            ("Why We Sleep by Matthew Walker", ["book", "health"], (15, 25), "Unlocking the power of sleep and dreams."),
            ("The 7 Habits of Highly Effective People", ["book", "selfhelp"], (12, 24), "Powerful lessons in personal change."),
        ],
    },

    # ---------------- TOYS & GAMES ----------------
    "Toys": {
        "items": [
            ("LEGO Star Wars Millennium Falcon", ["lego", "starwars", "toy"], (159, 199), "Iconic spaceship build, 1,353 pieces, age 9+."),
            ("LEGO Technic Bugatti Chiron", ["lego", "technic", "toy"], (349, 399), "Premium 3,599-piece supercar build with working gearbox."),
            ("LEGO Creator Botanical Collection", ["lego", "flowers", "toy"], (49, 89), "Build a buildable bouquet for the home."),
            ("Catan Board Game", ["boardgame", "catan"], (45, 65), "Award-winning strategy game for 3-4 players."),
            ("Ticket to Ride Board Game", ["boardgame"], (45, 65), "Cross-country train adventure for 2-5 players."),
            ("Codenames Card Game", ["boardgame", "cards"], (15, 25), "Award-winning party game of clue-giving deduction."),
            ("Magna-Tiles 100-Piece Set", ["magnetiles", "toy"], (119, 159), "Magnetic building tiles for STEM creative play."),
            ("Hot Wheels Track Builder", ["hotwheels", "toy"], (29, 59), "Modular track set with stunt ramps and loops."),
            ("Nerf Elite 2.0 Commander RD-6", ["nerf", "toy"], (19, 35), "Six-dart rotating drum blaster with tactical rail."),
            ("Barbie Dreamhouse", ["barbie", "dollhouse", "toy"], (199, 259), "Three-story Dreamhouse with elevator and pool."),
            ("Play-Doh Modeling Compound 24-Pack", ["playdoh", "toy"], (15, 25), "Two-dozen 3-oz cans of classic Play-Doh."),
            ("Crayola Inspiration Art Case", ["crayola", "art", "toy"], (24, 39), "140-piece all-in-one art studio for kids."),
            ("Funko Pop Marvel Spider-Man", ["funko", "pop", "marvel"], (12, 18), "Bobblehead vinyl figure, 3.75 inches tall."),
            ("Squishmallow 12-inch Plush", ["squishmallow", "plush"], (19, 29), "Soft and squishy plush toy, collectible."),
        ],
    },
}


def main():
    rows = []
    lock = 1
    for category, cfg in CATALOG.items():
        for entry in cfg["items"]:
            name, keywords, (lo, hi), desc = entry
            price = random.randint(lo, hi)
            stock = random.choices(
                [0, random.randint(1, 5), random.randint(6, 50), random.randint(50, 200)],
                weights=[3, 12, 55, 30],
            )[0]
            featured = random.random() < 0.10
            rows.append({
                "name": name,
                "description": desc,
                "price": price,
                "stock": stock,
                "category": category,
                "image_url": img(keywords, lock),
                "is_featured": "true" if featured else "false",
            })
            lock += 1

            # Add 1-2 variants ("Pro", "Refurbished", "Bundle") for some, sharing keywords
            variant_options = [
                ("(Refurbished)", lambda p: int(p * 0.78), lambda d: d + " Certified refurbished — same warranty, lower price."),
                ("Bundle", lambda p: int(p * 1.15), lambda d: d + " Comes with extra accessories and extended care."),
            ]
            for variant_name, price_fn, desc_fn in random.sample(variant_options, k=random.randint(0, 2)):
                v_name = f"{name} {variant_name}"
                v_price = max(1, price_fn(price))
                v_stock = random.randint(2, 60)
                rows.append({
                    "name": v_name,
                    "description": desc_fn(desc),
                    "price": v_price,
                    "stock": v_stock,
                    "category": category,
                    "image_url": img(keywords, lock),
                    "is_featured": "false",
                })
                lock += 1

    random.shuffle(rows)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["name", "description", "price", "stock", "category", "image_url", "is_featured"])
        w.writeheader()
        w.writerows(rows)

    by_cat = {}
    for r in rows:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
    print(f"Wrote {len(rows)} rows to {OUT}")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {c:25s} {n:3d}")


if __name__ == "__main__":
    main()
