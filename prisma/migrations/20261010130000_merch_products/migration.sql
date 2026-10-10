-- Merch prices live in the database and are edited by administrators. Checkout prices every order
-- from this table on the server; the browser never sends a price.
CREATE TYPE "MerchProductKind" AS ENUM ('CATALOGUE', 'CUSTOM_GARMENT', 'EVENT_SOUVENIR');

CREATE TABLE "MerchProduct" (
    "id" TEXT NOT NULL,
    "kind" "MerchProductKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "imagePosition" TEXT,
    "pricePence" INTEGER,
    "supplierCostPence" INTEGER,
    "lcaGrams" INTEGER,
    "laborHours" DOUBLE PRECISION,
    "licenseeId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MerchProduct_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MerchProduct_price_positive" CHECK ("pricePence" IS NULL OR "pricePence" > 0)
);

CREATE INDEX "MerchProduct_kind_active_sortOrder_idx" ON "MerchProduct"("kind", "active", "sortOrder");

-- The catalogue and garment prices that were previously written in code. A null price means
-- the item is sold by enquiry only.
INSERT INTO "MerchProduct" ("id", "kind", "title", "description", "category", "imageUrl", "imagePosition", "pricePence", "supplierCostPence", "lcaGrams", "laborHours", "licenseeId", "active", "sortOrder") VALUES
('item_nfty_cap', 'CATALOGUE', 'NFTYLOGS Vagaries of GHG Emissions Embroidered Cap', 'Black structured cotton cap with high-density embroidered multi-color NFTYLOGS Vagaries of GHG Emissions accountability badge.', 'Official Headwear', '/images/merch/804c16c8-6d00-4596-b456-dfe607b635b7.jpeg', 'center 0%', 3500, NULL, NULL, NULL, 'lic_ghg_official', true, 0),
('item_nfty_volcano_hoodie', 'CATALOGUE', 'NFTYLOGS "Vibing The Vagaries" Heavyweight Hoodie', 'Heavyweight black pullover hoodie with embroidered "Re-awakened Volcanoes, Melting Glaciers" chest artwork and dual GHG logo drops.', 'Graphic Art Hoodies', '/images/merch/a014f871-4e03-4f3d-a056-47f3f3dbe729.jpeg', 'center 20%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 10),
('item_nfty_tech_fleece', 'CATALOGUE', 'NFTYLOGS Tech Fleece Full-Zip Performance Hoodie', 'Charcoal tech fleece full-zip hoodie with zippered sleeve utility pocket, tailored seamlines, and embroidered GHG accountability badges.', 'Performance Apparel', '/images/merch/09acb896-19df-488f-9a9b-ac1241c6dc97.jpeg', 'center 25%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 20),
('item_nfty_arsenal_hoodie', 'CATALOGUE', 'NFTYLOGS Arsenal FC Milestone Match Commemorative Hoodie', 'Commemorative dark fleece hoodie celebrating the 2025 West Ham derby milestone with embroidered match narrative and official GHG badge.', 'Special Edition Sports', '/images/merch/fa1c261d-9fd9-4cb7-a5c3-a4425c641db7.jpeg', 'center 25%', NULL, NULL, NULL, NULL, 'lic_arsenal_fc', true, 30),
('item_nfty_puffer_jacket', 'CATALOGUE', 'NFTYLOGS Heavyweight Insulated Puffer Jacket', 'High-loft quilted puffer jacket with full-length storm zip, insulated hood, and embroidered NFTYLOGS Greenhouse Gas accountability mark.', 'Premium Winterwear', '/images/merch/5df490db-a560-4754-924d-9a27581f0c23.jpeg', 'center 20%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 40),
('item_nfty_softshell_vest', 'CATALOGUE', 'NFTYLOGS Provenance Embroidered Softshell Vest', 'Sleeveless softshell vest embroidered with the NFTYLOGS provenance mark.', 'Official Outerwear', '/images/merch/ca6c871a-d643-4695-a605-9a357fb26ae3.jpeg', 'center 25%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 50),
('item_nfty_softshell_vest_back', 'CATALOGUE', 'NFTYLOGS Disaster Relief Charity Edition Softshell Vest', 'Embroidered with the worldwide extreme weather survivor succour donation mandate and "While..." prompt statement.', 'Official Outerwear', '/images/merch/3bf3f794-fcb4-412a-a556-b3289bbebd39.jpeg', 'center 25%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 60),
('item_nfty_joggers', 'CATALOGUE', 'NFTYLOGS Premium Embroidered Fleece Joggers', 'Organic heavyweight French terry fleece sweatpants with embroidered NFTYLOGS Vagaries of Greenhouse Gases [GHGs] thigh badge.', 'Loungewear & Bottoms', '/images/merch/66e17346-415e-4f20-9c86-3aa5c4587af6.jpeg', 'center 15%', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 70),
('item_nfty_puffer_sleeve', 'CATALOGUE', 'NFTYLOGS Arm-Badge Puffer Jacket (Sleeve Detail Edition)', 'Close-up sleeve edition showcasing the intricate multi-thread embroidery of the official NFTYLOGS Vagaries of Greenhouse Gases mark.', 'Premium Winterwear', '/images/merch/82ccfad7-9e7b-4882-990d-f9805bc52a22.jpeg', 'center center', NULL, NULL, NULL, NULL, 'lic_ghg_official', true, 80),
('T_SHIRT', 'CUSTOM_GARMENT', 'Organic Cotton T-Shirt', '100% GOTS certified organic combed cotton', NULL, NULL, NULL, 2588, 2200, 290, 0.8, 'lic_ghg_official', true, 100),
('PUFF_JACKET', 'CUSTOM_GARMENT', 'Recycled Down Puffer Jacket', 'Post-consumer recycled ripstop with 700 fill down', NULL, NULL, NULL, 7647, 6500, 780, 3.0, 'lic_ghg_official', true, 110),
('HOODIE', 'CUSTOM_GARMENT', 'Heavyweight Commemorative Hoodie', '450gsm cross-grain French terry fleece', NULL, NULL, NULL, 4941, 4200, 520, 2.0, 'lic_ghg_official', true, 120),
('BACKPACK', 'CUSTOM_GARMENT', 'Industrial Canvas Backpack', 'Water-resistant 16oz recycled canvas with laptop divider', NULL, NULL, NULL, 4471, 3800, 680, 2.2, 'lic_ghg_official', true, 130),
('SCHOOL_BAG', 'CUSTOM_GARMENT', 'Student & Youth School Bag', 'Reinforced dual-compartment ergonomic backpack', NULL, NULL, NULL, 3294, 2800, 540, 1.8, 'lic_ghg_official', true, 140),
('SOCKS', 'CUSTOM_GARMENT', 'Performance Technical Socks', 'Merino blend anti-blister archival sports socks', NULL, NULL, NULL, 1412, 1200, 120, 0.5, 'lic_ghg_official', true, 150),
('HEAVYWEIGHT_HOODIE', 'CUSTOM_GARMENT', 'Archival Matchday Hoodie', '450gsm cross-grain French terry fleece', NULL, NULL, NULL, 4941, 4200, 520, 2.0, 'lic_ghg_official', true, 160),
('INSULATED_PUFFER_JACKET', 'CUSTOM_GARMENT', 'Extreme Climate Puffer Jacket', 'Post-consumer recycled ripstop with 700 fill down', NULL, NULL, NULL, 7647, 6500, 780, 3.0, 'lic_ghg_official', true, 170),
('STRUCTURED_CAP', 'CUSTOM_GARMENT', 'Structured Cotton Cap', 'Six-panel twill cap with brass buckle', NULL, NULL, NULL, 2118, 1800, 210, 1.5, 'lic_ghg_official', true, 180),
('VINTAGE_TEE', 'CUSTOM_GARMENT', 'Organic Cotton T-Shirt', '100% GOTS certified organic combed cotton', NULL, NULL, NULL, 2588, 2200, 290, 0.8, 'lic_ghg_official', false, 190),
('SOFTSHELL_VEST', 'CUSTOM_GARMENT', 'Thermal Softshell Vest', 'Windproof technical utility vest', NULL, NULL, NULL, 4118, 3500, 410, 1.5, 'lic_ghg_official', false, 200),
('TECH_FLEECE_JACKET', 'CUSTOM_GARMENT', 'Technical Fleece Jacket', 'Thermal bonded zip jacket', NULL, NULL, NULL, 5647, 4800, 620, 2.5, 'lic_ghg_official', false, 210),
('FLEECE_JOGGERS', 'CUSTOM_GARMENT', 'Heavyweight Fleece Joggers', 'Relaxed fit heavyweight fleece trousers', NULL, NULL, NULL, 4235, 3600, 440, 1.5, 'lic_ghg_official', false, 220),
('EVENT_LOGO_DROP', 'EVENT_SOUVENIR', 'Event souvenir logo drop', 'One printed NFTYLOGS logo drop for an event order, priced per unit.', NULL, NULL, NULL, 500, NULL, NULL, NULL, 'lic_ghg_official', true, 0);
